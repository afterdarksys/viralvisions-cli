# ViralVisions CLI Agent Instructions

This repository contains the standalone command-line client for ViralVisions.

## Primary rule

Do not reimplement ViralVisions business logic in this repo.

The CLI is a thin workflow client. It should:

- parse user intent from terminal commands
- manage local CLI configuration and contexts
- call the ViralVisions site API
- render safe human-readable and machine-readable output
- protect tokens, cookies, signed URLs, and user data

The ViralVisions web/API application remains the source of truth for:

- creator DNA calculations
- trend intelligence
- distribution rules
- experiments and winner selection
- account readiness logic
- product metrics
- video coaching
- ecommerce/reseller commission logic
- billing and entitlement rules

If a needed behavior is missing from the API, add or document the API requirement in the site repo first instead of duplicating the behavior here.

## Current architecture

- Runtime: Node.js ESM.
- Entrypoint: `bin/vv.js`.
- CLI router: `src/cli.js`.
- API client: `src/api.js`.
- Context/config management: `src/config.js`.
- Output rendering: `src/output.js`.
- Redaction helpers: `src/redact.js`.
- Tests: `test/*.test.js` using Node's built-in test runner.

The package is intentionally dependency-light. Do not add dependencies unless they materially reduce risk or maintenance cost.

## Validation

Use the modern local Node/npm if available:

```bash
/Users/ryan/.nvm/versions/node/v22.22.0/bin/npm test
/Users/ryan/.nvm/versions/node/v22.22.0/bin/npm run check
```

Fallback:

```bash
npm test
npm run check
```

Before committing, run at least the relevant test subset. For command parser/API client changes, run the full test suite.

## Git workflow

- Preserve user changes and unrelated untracked files.
- Do not stage `.omc/`, local env files, generated coverage, or `node_modules`.
- Prefer explicit `git add` paths over `git add .`.
- Use small commits with concrete messages.

## API integration conventions

Prefer endpoints under `/api/cli/*` when the command needs CLI-specific orchestration, stable machine contracts, or safety wrappers.

Use existing product endpoints directly when they already expose the correct API contract.

All mutation requests should include:

- bearer auth
- `X-ViralVisions-Client`
- `X-ViralVisions-Request-Source: cli`
- `X-Request-Id`
- `Idempotency-Key`

Destructive commands must require `--yes`. If later interactive confirmation is added, non-interactive mode must still require `--yes`.

## Output rules

Keep stdout machine-safe:

- JSON output must contain only JSON.
- JSONL output must contain one JSON object per line.
- Warnings/errors for non-JSON mode can go to stderr.

Redact secrets in all user-facing errors and output.

Never print:

- bearer tokens
- cookies
- signed URL signatures
- API keys
- OAuth codes
- session secrets

## First-version scope

The current first version intentionally supports API-backed workflow commands and local media inspection.

Deferred work:

- browser OAuth login
- secure OS keychain storage
- media upload streaming/resume
- publish/schedule execution commands
- packaged binaries
- shell completions
- generated OpenAPI client

When adding those, keep the CLI as a client and push orchestration/business decisions back into the ViralVisions API.
