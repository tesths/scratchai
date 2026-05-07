# Scratch AI Coach

`Scratch AI Coach` is now an open source Scratch teaching workspace. It still ships the local `Scratch Desktop` companion app, and it now also carries a classroom server track built with `FastAPI + Vue`.

## Why This Project Exists

Scratch helped many people fall in love with computers for the first time. Since Scratch itself is open source, this project is being organized as a long-term open source repository too, so teachers, learners, and contributors can use it, review it, and evolve it in public.

## Current Scope

- The maintained product line now includes both the **local desktop edition** and the **server teaching edition**
- Supported platforms: **Windows** and **macOS**
- The current workflow is “launch Scratch Desktop from the companion app, then attach a read-only bridge”
- The server track is implemented with `Python FastAPI + Vue`
- Chinese is the primary product language today, while the core open source docs are bilingual

## What It Does Today

- Detects common Scratch installation paths, with manual fallback selection
- Launches `Scratch Desktop` in a controlled session and connects to it
- Reads the current target, project data, and script structure
- Renders the current scripts and recommended blocks with real `scratch-blocks`
- Generates AI next-step hints with an opcode allowlist for block safety
- Falls back to local hints when no online API key is configured
- Adds a server-side teaching workflow for teacher auth, student accounts, sb3 releases, progress reporting, and live classroom dashboards

## Downloads and Release Flow

This repository does not publish GitHub Releases automatically yet. For now, official binaries are distributed through **GitHub Actions artifacts**:

- Windows artifact: `scratch-desktop-companion-windows`
  - includes a `portable .exe`
  - includes an `installer .exe`
- macOS artifact: `scratch-desktop-companion-macos`
  - includes a `.zip`
  - includes a `.dmg`

See [`docs/releasing.en.md`](docs/releasing.en.md) for workflow names, artifact naming, and packaging details.

## Local Development

```bash
git clone git@github.com:tesths/scratchai.git
cd scratchai
npm ci
npm run test
```

Common commands:

```bash
npm run build
npm run test
npm run server:web:test
npm run server:api:test
npm run package:win:bundle
npm run package:mac:zip
npm run package:mac:dmg
```

Run the desktop app locally:

```bash
cd apps/desktop-companion
npm run dev
```

## Documentation

- Project structure: [`docs/project-structure.en.md`](docs/project-structure.en.md)
- Releasing: [`docs/releasing.en.md`](docs/releasing.en.md)
- Roadmap: [`docs/roadmap.en.md`](docs/roadmap.en.md)
- Engineering docs index: [`docs/README.zh-CN.md`](docs/README.zh-CN.md)
- Server API: `apps/server-api`
- Teacher dashboard: `apps/server-web`
- Desktop app docs: [`apps/desktop-companion/README.md`](apps/desktop-companion/README.md)
- Verification tooling docs: [`tools/verification/README.zh-CN.md`](tools/verification/README.zh-CN.md)

## Contributing

Contributions are welcome through issues, pull requests, docs improvements, and classroom feedback.

- Read [`CONTRIBUTING.en.md`](CONTRIBUTING.en.md) before submitting code
- Follow [`CODE_OF_CONDUCT.en.md`](CODE_OF_CONDUCT.en.md) in community spaces
- Do not report security issues publicly; see [`SECURITY.en.md`](SECURITY.en.md)
- Support and discussion guidance lives in [`SUPPORT.en.md`](SUPPORT.en.md)

## Future Direction

The direction from here includes:

- a stronger desktop release and community workflow
- a fuller server-side classroom workflow
- tighter links between the app, verification tooling, and example teaching projects

See [`docs/roadmap.en.md`](docs/roadmap.en.md) for the current direction.

## License

This project is licensed under [`AGPL-3.0`](LICENSE).
