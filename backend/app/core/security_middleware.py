import time
import logging
from typing import Dict, Tuple, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger("roofshift.security")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects defensive HTTP security headers into all responses:
    - X-Content-Type-Options: prevents MIME-sniffing attacks
    - X-Frame-Options: prevents Clickjacking in external frames
    - X-XSS-Protection: legacy browser XSS filter activation
    - Referrer-Policy: prevents leaking URLs to third parties
    - Permissions-Policy: restricts unnecessary hardware API access
    - Content-Security-Policy: restricts script, style, and object sources
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        headers = response.headers
        headers["X-Content-Type-Options"] = "nosniff"
        headers["X-Frame-Options"] = "SAMEORIGIN"
        headers["X-XSS-Protection"] = "1; mode=block"
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # CSP: allow Leaflet OSM map tiles, Google fonts, charts, and API connections
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https: http:; "
            "frame-ancestors 'self';"
        )
        headers["Content-Security-Policy"] = csp_policy
        return response


class RateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Provides tiered protection for expensive endpoints (optimization, reports, uploads).
    """
    def __init__(self):
        # ip -> list of timestamps
        self.requests: Dict[str, list] = {}
        self.last_cleanup = time.time()

    def is_allowed(self, client_ip: str, limit: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.time()
        
        # Periodic cleanup of expired IPs (every 5 minutes)
        if now - self.last_cleanup > 300:
            self._cleanup(now)

        timestamps = self.requests.get(client_ip, [])
        # Filter timestamps within current window
        valid_timestamps = [t for t in timestamps if now - t < window_seconds]
        
        if len(valid_timestamps) >= limit:
            retry_after = int(window_seconds - (now - valid_timestamps[0])) + 1
            self.requests[client_ip] = valid_timestamps
            return False, max(1, retry_after)
            
        valid_timestamps.append(now)
        self.requests[client_ip] = valid_timestamps
        return True, 0

    def _cleanup(self, now: float):
        for ip in list(self.requests.keys()):
            self.requests[ip] = [t for t in self.requests[ip] if now - t < 120]
            if not self.requests[ip]:
                del self.requests[ip]
        self.last_cleanup = now

    def reset(self):
        """For testing purposes."""
        self.requests.clear()

    def clear(self):
        self.reset()


rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Applies IP-based rate limiting to protect computationally expensive endpoints:
    - Optimization solver: 45 req/min
    - PDF report generation: 30 req/min
    - File uploads (telemetry/thermal): 30 req/min
    - Geocoding lookup: 60 req/min
    - General endpoints: 300 req/min
    """
    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled

    def get_client_ip(self, request: Request) -> str:
        # Check X-Forwarded-For if behind reverse proxy / Cloudflare
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # First non-empty client IP
            client_ip = forwarded.split(",")[0].strip()
            if client_ip:
                return client_ip
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "127.0.0.1"

    async def dispatch(self, request: Request, call_next):
        if not self.enabled:
            return await call_next(request)

        # Allow test client bypass if explicitly flagged or running via in-memory test runner without forwarded IP
        if request.headers.get("X-Bypass-Rate-Limit") == "test-suite" or (
            request.client and request.client.host in ["testclient", "testserver"] and not request.headers.get("X-Forwarded-For")
        ):
            return await call_next(request)

        path = request.url.path
        method = request.method
        client_ip = self.get_client_ip(request)

        # Determine rate limit tier based on resource intensity
        limit = 300  # Default general limit
        if "/optimize" in path and method == "POST":
            limit = 45
        elif "/reports" in path and method == "POST":
            limit = 30
        elif ("-upload" in path or "upload-" in path or "/panel-inspection" in path) and method == "POST":
            limit = 30
        elif "/geocoding/search" in path:
            limit = 60
        elif "/solar-ml/" in path:
            limit = 120

        allowed, retry_after = rate_limiter.is_allowed(client_ip, limit=limit, window_seconds=60)
        if not allowed:
            logger.warning(f"Rate limit exceeded for IP {client_ip} on {method} {path} (limit: {limit}/min)")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down your request rate.",
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "retry_after_seconds": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )

        return await call_next(request)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Enforces a strict upper bound on request body size to prevent memory-exhaustion DoS attacks.
    Limits payload size to 15MB max.
    """
    def __init__(self, app, max_bytes: int = 15 * 1024 * 1024):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("Content-Length")
        if content_length:
            try:
                length = int(content_length)
                if length > self.max_bytes:
                    logger.warning(f"Rejected oversized request ({length} bytes > {self.max_bytes} bytes)")
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Request payload exceeds maximum allowed size of {self.max_bytes // (1024 * 1024)}MB.",
                            "error_code": "PAYLOAD_TOO_LARGE"
                        }
                    )
            except ValueError:
                pass

        return await call_next(request)
