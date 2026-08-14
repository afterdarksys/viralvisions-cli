# Command Map

Use `vv` as the binary name.

## Auth and context

```text
vv auth status
vv auth login
vv auth logout
vv auth whoami
vv context list
vv context use <name>
vv context show
vv context set <name> --base-url <url>
```

Base implementation can support token injection through env first:

```text
VIRALVISIONS_TOKEN=...
VIRALVISIONS_BASE_URL=...
```

## Accounts

```text
vv accounts list
vv accounts show <id>
vv accounts readiness
vv accounts reconnect <id>
```

Use `GET /api/accounts/readiness`.
Prefer `/v1/accounts`, `/v1/accounts/:id`, `/v1/accounts/:id/capabilities`, and `/v1/accounts/:id/test` for new CLI commands.

## Trends

```text
vv trends list
vv trends opportunities
vv trends intelligence
vv trends use <trend-id>
vv trends save <trend-id>
vv trends dismiss <trend-id>
```

Use:

```text
GET  /api/viral-trends/opportunities
GET  /api/viral-trends/intelligence
POST /api/viral-trends/:trendId/use
```

## Creator DNA

```text
vv creator-dna show
vv creator-dna refresh
vv creator-dna export
vv creator-dna set --tone <tone> --brand-term <term> --banned-phrase <phrase>
vv creator-dna reset --yes
vv creator-dna delete --yes
```

Use `/api/creator-dna`.

Reset should call:

```json
PATCH /api/creator-dna
{ "resetLearnedData": true }
```

Delete should call:

```text
DELETE /api/creator-dna
```

## Media and video coach

```text
vv media upload <path>
vv media upload <path> --qc
vv media qc <content-id>
vv media inspect <path>
vv analyze video --content-id <id>
vv analyze video --media-asset-id <id>
vv analyze video --scheduled-post-id <id>
vv analyze video <path>
```

Initial implementation can support server-side IDs first. Local path analysis can come after upload plumbing.
QC is server-side by design. Do not vendor the proprietary inspection engine into the public CLI package.

Use:

```text
POST /api/video-coach/analyze
```

## Content and posts

```text
vv content list
vv content create
vv content show <id>
vv content validate <id>
vv posts list
vv posts create
vv posts show <id>
```

Use `/v1/posts` and `/v1/posts/:id` for list/create/show/update.

## Publishing/distribution

```text
vv publish <post-id> --account <id> --yes
vv schedule <post-id> --account <id> --at <RFC3339> --yes
vv distribution retry <distribution-id> --yes
vv distribution cancel <distribution-id> --yes
```

Use:

```text
POST /v1/posts/:id/release
```

Do not publish without confirmation.

## Experiments

```text
vv experiments list
vv experiments create
vv experiments winner <experiment-id>
```

Use `/api/experiments`.

## Metrics

```text
vv metrics product
vv predictions calibration
```

Use:

```text
GET /api/metrics/product
GET /api/learning/predictions
```

## Doctor

```text
vv doctor
```

Initial checks:

- base URL reachable
- token present
- auth status
- OpenAPI reachable
- account readiness reachable
- clock skew warning if server date can be read
- redaction test for diagnostics
