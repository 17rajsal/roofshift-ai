# RoofShift AI — Local Installation & Setup Guide

This guide provides tested, step-by-step instructions for running RoofShift AI locally on Windows, macOS, or Linux.

---

## 1. Prerequisites

Ensure you have the following installed on your workstation:
- **Python:** Version 3.11, 3.12, 3.13, or 3.14 (`python --version`)
- **Node.js:** Version 18.x, 20.x, or 22.x with npm (`node --version`)
- **Git:** Version 2.30+ (`git --version`)
- **Docker & Docker Compose:** *(Optional, for containerized execution)*

---

## 2. Clone & Repository Setup

```bash
# Clone the repository
git clone https://github.com/<your-org>/roofshift-ai.git
cd roofshift-ai
```

---

## 3. Backend Setup (FastAPI & Python)

### Step 3.1: Create & Activate Virtual Environment

**On Windows (PowerShell):**
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

**On Linux / macOS (Bash/Zsh):**
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate
```

### Step 3.2: Install Backend Dependencies

```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step 3.3: Configure Environment Variables

```bash
# Copy the example environment configuration
cp .env.example .env
```

*(By default, `.env` is configured to use SQLite at `./roofshift.db` and local file storage for reports. No external API keys or cloud credentials are required to run locally.)*

### Step 3.4: Start the FastAPI Backend Server

```bash
# Run with uvicorn (auto-reloads on code changes)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Root:** `http://localhost:8000/`
- **Interactive Swagger Documentation:** `http://localhost:8000/docs`
- **Alternative ReDoc Documentation:** `http://localhost:8000/redoc`
- **Health Check:** `http://localhost:8000/api/v1/health`

On startup, the backend automatically seeds the demonstration campus (*Delhi Technological University Demo Campus*) with 5 candidate facilities.

---

## 4. Frontend Setup (React 19 + TypeScript + Vite)

Open a second terminal window in the project root:

```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

- **Web Application URL:** `http://localhost:5173`
- The Vite development server proxies API requests to `http://localhost:8000/api/v1` automatically.

---

## 5. Running Automated Verification Tests

### 5.1 Backend Pytest Suite (25 Tests)

```bash
# From the project root with the Python environment active:
python -m pytest -o pythonpath=backend backend/tests -v
```

Expected output:
```
backend/tests/test_api_endpoints.py ...                [12%]
backend/tests/test_application_integration.py .....    [32%]
backend/tests/test_optimizer.py ..                     [40%]
backend/tests/test_solar_engine.py ...                 [52%]
backend/tests/test_v2_acceptance.py ............       [100%]
======================= 25 passed in ~6.5s =======================
```

### 5.2 Frontend TypeScript & Production Build

```bash
cd frontend
npm run build
```

Expected output:
```
vite v8.3.4 building client environment for production...
✓ 2548 modules transformed.
✓ built in ~1.2s
```

---

## 6. Docker & Containerized Execution

To spin up both frontend and backend in isolated production containers:

```bash
# Build and run using Docker Compose
docker-compose up --build
```

- **Frontend Application (Nginx):** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`

To stop the containers:
```bash
docker-compose down
```

---

## 7. Troubleshooting

| Issue | Resolution |
|---|---|
| `Scripts execution disabled` in PowerShell | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| Port 8000 already in use | Run `Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process` on Windows, or `lsof -ti:8000 | xargs kill -9` on Linux/macOS |
| Satellite irradiance timeout | NASA POWER API calls fallback gracefully to built-in IMD/NISE Indian regional irradiance defaults |
| CORS errors in browser console | Ensure `VITE_API_BASE_URL` is unset or points to `http://localhost:8000/api/v1` in `frontend/.env` |
