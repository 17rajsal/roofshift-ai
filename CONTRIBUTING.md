# Contributing to RoofShift AI

Thank you for your interest in contributing to **RoofShift AI**! This project was created by **TEAM DRX** for **Environmental Hacks 2026 — WeMakeDevs × AWS** (Waste & Energy track).

---

## 1. Development Principles

1. **Deterministic Calculations:** Primary solar calculations, knapsack budget allocation, and equipment scheduling must remain deterministic and mathematical. Do not introduce probabilistic or paid generative AI dependencies into the core decision loop.
2. **Strict Test Coverage:** All new endpoints and services must be accompanied by unit or integration tests in `backend/tests/`.
3. **Typing & Linting:** Maintain strict TypeScript types in `frontend/src/` with zero build errors (`tsc -b`). Backend schemas must use Pydantic v2.

---

## 2. Setting Up Development Environment

Follow the detailed instructions in [`docs/SETUP.md`](docs/SETUP.md):

```bash
# Backend Setup
python -m venv venv
source venv/bin/activate # or .\venv\Scripts\Activate.ps1 on Windows
pip install -r backend/requirements.txt
python -m pytest -o pythonpath=backend backend/tests

# Frontend Setup
cd frontend
npm install
npm run build
npm run dev
```

---

## 3. Branching & PR Guidelines

- Use descriptive feature branches: `feat/<feature-name>` or `fix/<defect-name>`.
- Do not commit `.env`, SQLite databases (`*.db`), or generated PDF reports.
- Ensure all automated tests pass before opening a Pull Request.
