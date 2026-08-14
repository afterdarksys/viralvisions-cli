# ViralVisions CLI

`vv` is the command-line workflow client for ViralVisions.

This first version is intentionally dependency-light and API-driven. It uses the ViralVisions server API for business logic rather than duplicating platform behavior locally.

## Requirements

- Node.js 20+
- A ViralVisions session token

Set auth and API target through environment variables:

```bash
export VIRALVISIONS_BASE_URL="https://viralvisions.io"
export VIRALVISIONS_TOKEN="<session-token>"
```

Local development:

```bash
export VIRALVISIONS_BASE_URL="http://localhost:3000"
export VIRALVISIONS_TOKEN="<session-token>"
```

## Usage

Run directly:

```bash
node bin/vv.js help
```

Or link locally:

```bash
npm link
vv help
```

## Implemented commands

Read-only and workflow-safe commands:

```bash
vv auth status
vv auth whoami
vv context list
vv context show
vv context set local --base-url http://localhost:3000
vv context use local
vv accounts readiness
vv accounts list
vv accounts show <id>
vv accounts capabilities <id>
vv accounts test <id>
vv capabilities
vv doctor
vv trends opportunities
vv trends intelligence
vv creator-dna show
vv creator-dna export
vv metrics product
vv predictions calibration
vv jobs show <id>
vv wait <job-or-distribution-id>
```

Safe mutation/workflow commands:

```bash
vv creator-dna refresh
vv creator-dna set --tone "practical and direct"
vv creator-dna reset --yes
vv creator-dna delete --yes
vv trends use <trend-id>
vv analyze video --content-id <id>
vv analyze video --media-asset-id <id>
vv analyze video --scheduled-post-id <id>
vv content validate --content-id <id>
vv distribution dry-run --scheduled-post-id <id> --account <account-id> --platform youtube
vv experiments list
vv experiments create --json '{"hypothesis":"Hook A wins","variants":[{"key":"a","hook":"Stop scrolling"},{"key":"b","hook":"Try this"}]}'
vv experiments winner <experiment-id> --json '{"results":{"a":{"reach":1000},"b":{"reach":800}}}'
vv media inspect ./video.mp4
vv media upload ./video.mp4
vv media upload ./video.mp4 --qc --expected-aspect 9:16
vv media qc <content-id>
vv media qc <content-id> --deep --expected-aspect 9:16
vv content list
vv content create --caption "Launch hook" --platforms youtube,tiktok --hashtags launch,ai --content-id <content-id>
vv content show <post-id>
vv content update <post-id> --json '{"caption":"Updated caption"}'
vv publish <post-id> --account <account-id> --platform youtube --dry-run
vv publish <post-id> --account <account-id> --platform youtube --yes
vv schedule <post-id> --account <account-id> --platform youtube --at 2026-08-15T12:00:00.000Z --dry-run
```

## Output

Default output is human-readable. Machine-readable output:

```bash
vv doctor --output json
vv trends opportunities --output jsonl
vv accounts readiness --output yaml
```

JSON output is always written to stdout without progress text.

## Safety rules

- Tokens and signed URLs are redacted from output.
- Destructive commands require `--yes`.
- Mutation requests include an `Idempotency-Key`.
- New account/media/post/release/job workflows use the versioned `/v1` API contract.
- QC commands call ViralVisions server-side QC endpoints; the proprietary inspection engine does not ship inside the CLI package.
- Business logic stays on the ViralVisions API.

## Validation

```bash
npm test
npm run check
```
