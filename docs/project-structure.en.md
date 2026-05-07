# Project Structure

This repository is now a mixed-language monorepo. The JavaScript side still uses npm workspaces, while the teaching server API is maintained as a parallel Python app.

## Top-Level Directories

- `apps/desktop-companion`
  - the Electron desktop app
  - handles Scratch launching, bridging, AI calls, and the main UI
- `apps/server-api`
  - the Python FastAPI backend
  - handles teacher/student auth, releases, progress reporting, AI hints, and dashboard APIs
- `apps/server-web`
  - the Vue teacher dashboard
  - handles teacher login, student management, release management, and the live classroom view
- `packages/shared`
  - shared schemas, project snapshots, and Scratch parsing logic
- `tools/verification`
  - verification scripts, workflow fixtures, regression tests, and teaching helpers
- `docs`
  - open source entry docs and engineering notes
- `installers`
  - local and CI output collection directory, not committed to git

## Product Boundary

- the maintained product now includes the local desktop edition and the server teaching edition of `Scratch AI Coach`
- the server track currently uses `Python FastAPI + Vue`
- the desktop app still works independently, while the server track serves classroom workflows

## Where to Read Next

- first visit: [`../README.en.md`](../README.en.md)
- contribution workflow: [`../CONTRIBUTING.en.md`](../CONTRIBUTING.en.md)
- module responsibilities: [`./architecture.zh-CN.md`](./architecture.zh-CN.md)
- maintenance rules: [`./maintenance.zh-CN.md`](./maintenance.zh-CN.md)
