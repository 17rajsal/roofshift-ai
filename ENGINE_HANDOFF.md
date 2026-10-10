# RoofShift AI engine handoff

Effective 10 October 2026. This replaces the earlier QA-only Codex assignment.

Application branch: `antigravity/core-app`. Codex delivers reviewed work from isolated `codex/advanced-engines` and `codex/solar-feature-expansion` checkouts. Baseline shared commit at this handoff: `1e82279`.

## Ownership

Codex owns all algorithms in `backend/app/services/optimization/`, `energy/`, `scheduling/`, `solar/`, and `intelligence/`, along with future financial scenario and optional panel image/monitoring engines. `aws/lambda/solar_processor.py` is also an engine boundary. Application development owns the frontend, maps, routing, persistence integration, report presentation, API transport, and infrastructure.

The subsequent team update assigns nine additional features to `codex/solar-feature-expansion`: Solar Location Finder, Solar Prediction, Panel Fault Detection, Performance Monitoring, Electricity Demand Analysis, Cost & Savings Calculator, Environmental Impact Calculator, Maintenance Recommendations, and expanded PDF reports. Existing location/geospatial, demand-analysis, prediction, financial/environmental, monitoring/maintenance, and report feature modules must not be independently rewritten while that branch is active. Shared API/schema changes require review. Core UI, routing, project context, and AWS configuration remain the application integration responsibility.

PDF ownership has therefore moved to the feature-expansion branch. The application continuation's completed report notes, unique filenames, and rendering of scheduling-engine outputs are checkpointed and must be preserved or deliberately reconciled during integration. No further PDF-feature implementation is undertaken in the application checkout after this update.

No algorithm edits were made as part of this application continuation. External working-tree edits appeared in engine modules and shared building, optimization, and project schemas during the session and were left intact. They are not an application delivery or a reviewed branch integration. Never stage or overwrite someone else's engine work when preparing an application commit.

## Existing service contracts

Use section 4 of [API_CONTRACTS.md](API_CONTRACTS.md) and the actual Pydantic schemas as the integration source of truth. Preserve current REST paths, response field names, nullable payback values, units, and stored optimization history. The app renders engine results; it does not recompute savings, surplus, scheduling, or scenario economics in the browser.

Financial scenarios and optional panel intelligence do not yet have approved HTTP schemas. Deliver proposed input/output contracts with their modules, including units, data provenance, unsupported-input behavior, and error handling. They must be optional and must not block the existing map-to-report flow.

## Delivery and review

1. Deliver each Codex branch with a commit SHA, changed-file list, function/API signatures, dependency changes, and test results. Identify any changes in numerical behavior or database persistence.
2. Review the diff against the shared baseline and confirm it does not replace working frontend, map, database, report, or infrastructure files. Resolve shared schema changes deliberately.
3. Test integration in a separate checkout, merging reviewed commits while retaining both branches' work. Avoid copying an engine checkout over the current project or resetting the application branch.
4. Run backend engine tests and API acceptance tests against an isolated database. Verify the frontend production build and the user journey: project, rooftop CRUD and saved outline, optimization, energy insights, scheduling, recommendations, PDF generation/download, and project switching.
5. Check budget compliance, energy conservation, non-duplicated surplus, scheduling feasibility, scenario provenance, deterministic repeatability, and backward compatibility of stored results. Codex supplies numerical tests; the app developer verifies transport and UI integration.
6. If a shared schema or data migration is needed, document a reversible migration and test existing project data before release.
7. For the feature-expansion delivery, verify all nine features through the existing navigation and active-project context. Confirm the Budget Optimizer, Solar Surplus, and Energy Scheduling APIs, numerical tests, stored history, and report scheduling results remain compatible. Optional prediction, monitoring, and fault-detection failures must not prevent the existing planning journey.

## Application checkpoint

This continuation adds persisted project selection, mobile navigation, per-project page state, lazy routes, saved rooftop drawing, inline report errors/history, API-origin configuration, and deployment storage isolation. Existing engine modules remain the current runtime implementation until a reviewed engine delivery arrives.

Neither named Codex delivery branch was available in this checkout at the checkpoint. Integration remains pending tested branch commits and their handoffs; uncommitted external edits have not been treated as delivered modules. See [APPLICATION_CHECKPOINT.md](APPLICATION_CHECKPOINT.md) for the verified application work.

The Compose database volume keeps its existing name and database filename but mounts at `/data` instead of `/app`. This retains existing data without covering the new application code. Reports keep the existing `reports_data` volume at `/app/generated_reports`. Do not remove these volumes during an update.
