# Application checkpoint — 10 October 2026

The existing `antigravity/core-app` project is preserved. Application changes are left reviewable in the working tree. Codex owns the advanced engines and the nine-feature expansion described in [ENGINE_HANDOFF.md](ENGINE_HANDOFF.md); neither delivery branch is present locally yet.

## Completed application work

- Active project selection survives reloads. Functional state updates preserve the user's selected project when inventory totals refresh. Per-project route remounting prevents previous project reports and analysis from carrying into another project.
- Mobile navigation, loading/error states, and empty-workspace entry are supported. Pages load lazily; the production main JavaScript bundle decreased from approximately 959 KB to 301 KB before compression.
- Rooftop outlines can be drawn, checked for crossed/repeated corners, measured, saved with fractional square-meter area, and restored after reload. Existing point-only buildings remain compatible. Map controls are contained beneath navigation and forms.
- Building inventory totals refresh after edits, duplication, and removal. Project copies retain roof outlines, obstruction notes, and eligible capacity limits.
- Report history shows loading/errors and remains scoped to the active project. Optional API-host configuration also applies to report downloads.
- Completed PDF fixes, now frozen for feature-expansion handoff: literal multiline notes, distinct filenames to preserve earlier reports, and rendering of actual scheduling-engine windows and absorbed solar. Report rendering does not invent a schedule.
- Docker retains the existing database/report volume names while mounting database storage away from application code. Container contexts exclude runtime data. Nginx allows CSV uploads and longer engine requests. EC2 bootstrap clones a reviewed source ref, starts the application, and checks its proxy health.

## Verification

- All 22 backend tests passed on an isolated SQLite database, including the two new application persistence/report integration tests.
- All three rooftop geometry checks passed.
- Frontend TypeScript checks and production build passed.
- Browser journey passed: project creation, active-project persistence, drawn rooftop save/reload, optimizer output, energy insights, shiftable-load registration/scheduling, recommendations, report generation, and PDF download via the API.
- The generated two-page test PDF was rendered and visually reviewed. Extracted text matched the engine's recommended operating window and actual absorbed solar, and retained angle brackets, ampersands, and multiline notes as text.
- Report and navigation layout checked at 390 CSS pixels with no document horizontal overflow.
- Compose configuration, deployment shell syntax, and local CloudFormation YAML/bootstrap checks passed. Actual container startup was not tested because the Docker engine was unavailable. AWS deployment/account-level validation was not performed.

Temporary verification data and renders belong under `tmp/` and are not application source. External uncommitted edits to engine modules or shared schemas are not part of this application's delivery and must remain untouched.

## Next integration step

Review each delivered Codex commit and handoff in a separate checkout, resolve shared API/schema/report changes explicitly, retain the newer UI/project-context/infrastructure changes, and rerun the existing optimizer, surplus, scheduling, and application acceptance checks. Do not replace the current checkout with the contents of either delivery branch.
