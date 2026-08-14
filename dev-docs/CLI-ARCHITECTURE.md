# CLI Architecture

## Design principle

The CLI is a workflow client. It should not duplicate ViralVisions business logic.

Prefer:

```text
CLI command -> typed API client -> ViralVisions API -> existing server service modules
```

Avoid:

```text
CLI command -> local business logic that diverges from the web app
```

## Runtime requirements

- Cross-platform: macOS, Linux, Windows.
- Deterministic output for automation.
- Human-friendly default output.
- Machine-readable output via `--output json|jsonl|yaml`.
- No secrets in logs, errors, support bundles, or debug output.
- Non-interactive mode must never prompt.

## Core packages

Pick boring, stable dependencies.

Recommended if TypeScript/Node:

- `commander` or `clipanion` for command routing
- `zod` for config/API validation
- `undici` or native `fetch`
- `keytar` only if cross-platform keychain support is worth the packaging cost
- `yaml` for manifest support later

If Go or Rust is chosen instead, keep the same command contract and output schemas.

## Config model

Support named contexts:

```json
{
  "currentContext": "production",
  "contexts": {
    "production": {
      "baseUrl": "https://viralvisions.io",
      "accountLabel": "ryan"
    },
    "local": {
      "baseUrl": "http://localhost:3000",
      "accountLabel": "local-dev"
    }
  }
}
```

Store non-secret config in an OS-appropriate config directory.

Store tokens in the OS keychain if available. If keychain support is not implemented in v1, store only development tokens and clearly mark plaintext token storage as unsafe.

## Request headers

Every mutation should include:

```text
Authorization: Bearer <token>
Idempotency-Key: <stable key for safe retry>
X-ViralVisions-Client: viralvisions-cli/<version>
X-ViralVisions-Request-Source: cli
```

Every response should expose/request-handle:

```text
requestId
status
warnings[]
confirmationRequired
```

## Confirmation model

Commands that create external visibility, spend money, delete data, disconnect accounts, or reset Creator DNA require explicit confirmation.

Rules:

- Interactive terminal: show exact targets and ask for confirmation.
- Non-interactive: require `--yes`.
- Dry run: never mutate; return the server plan.

## Output rules

Human output:

- concise tables
- warnings before success text
- IDs are copyable

JSON output:

- valid JSON only on stdout
- progress/warnings go to stderr unless included in the JSON envelope

Envelope:

```json
{
  "ok": true,
  "requestId": "...",
  "data": {},
  "warnings": [],
  "next": []
}
```

Error envelope:

```json
{
  "ok": false,
  "requestId": "...",
  "error": {
    "code": "not_authenticated",
    "message": "Run vv auth login.",
    "details": {}
  }
}
```
