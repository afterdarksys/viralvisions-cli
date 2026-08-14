# Claude Instructions for ViralVisions CLI

You are working in the ViralVisions CLI repository.

The important constraint: this CLI should integrate with the ViralVisions site API. It should not become a second implementation of the product.

## What this repo is

This repo provides the `vv` command-line tool for creators, businesses, operators, and automation agents.

The CLI should make ViralVisions workflows scriptable:

- inspect auth/context state
- check account readiness
- fetch trend intelligence
- work with creator DNA
- trigger video analysis
- validate content
- run distribution dry-runs
- inspect experiments
- check metrics and jobs

## What this repo is not

Do not build a separate backend here.

Do not duplicate:

- recommendation algorithms
- trend scoring
- commission calculations
- reseller/affiliate business logic
- distribution eligibility logic
- billing rules
- platform policy logic

Those belong in the ViralVisions web/API application.

If the CLI needs a capability that does not exist yet, document the required API endpoint and expected request/response shape. Prefer `/api/cli/<feature>` for CLI-specific workflows.

## Implementation standards

- Keep the CLI dependency-light.
- Use Node ESM.
- Prefer simple, testable modules over framework-heavy abstractions.
- Keep terminal output predictable.
- Keep JSON output valid and free of progress text.
- Redact secrets before displaying errors.
- Require `--yes` for destructive operations.
- Add tests for new parser behavior, API routing, redaction, config, and safety gates.

## Key files

- `bin/vv.js` - executable entrypoint
- `src/cli.js` - command parsing and routing
- `src/api.js` - HTTP API client
- `src/config.js` - local context/config loading and saving
- `src/output.js` - output rendering
- `src/redact.js` - secret redaction
- `test/` - Node test runner tests
- `dev-docs/` - planning and handoff documents

## Validation commands

Prefer the project owner's modern Node/npm path:

```bash
/Users/ryan/.nvm/versions/node/v22.22.0/bin/npm test
/Users/ryan/.nvm/versions/node/v22.22.0/bin/npm run check
```

If unavailable, use:

```bash
npm test
npm run check
```

## Product direction

ViralVisions is moving toward “one platform, multiple products.”

The CLI should eventually support different users buying into different products for different reasons:

- creators improving and distributing content
- businesses operating UGC campaigns
- operators monitoring readiness and jobs
- reseller/affiliate workflows for products from supported commerce platforms
- automation agents running safe repeatable workflows

Build commands around stable API contracts that can support those product lines without hardcoding temporary assumptions into the CLI.
