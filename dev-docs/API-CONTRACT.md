# CLI API Contract

## Preferred base

Use versioned API endpoints where available:

```text
<baseUrl>/api/...
```

If a dedicated `/v1/cli/...` facade is added later, switch the API client behind the same command interface. Do not change CLI command names just because endpoint paths change.

## Initial endpoint map

Accounts:

```text
GET /api/accounts/readiness
```

Creator DNA:

```text
GET    /api/creator-dna
GET    /api/creator-dna?export=true
POST   /api/creator-dna
PATCH  /api/creator-dna
DELETE /api/creator-dna
```

Trends:

```text
GET  /api/viral-trends/detect
GET  /api/viral-trends/opportunities
GET  /api/viral-trends/intelligence
POST /api/viral-trends/:trendId/use
POST /api/viral-trends/suggestions
```

Video Coach:

```text
POST /api/video-coach/analyze
```

Experiments:

```text
GET  /api/experiments
POST /api/experiments
POST /api/experiments/:experimentId/winner
```

Learning/winners:

```text
GET  /api/learning/predictions
POST /api/learning/predictions
POST /api/jobs/learning-checkpoints
POST /api/learning/winners/:checkpointId/repurpose
GET  /api/learning/winners/:checkpointId/actions
```

Media:

```text
POST /api/media/upload
POST /api/media/:contentId/confirm
GET  /api/media/file/:key
PUT  /api/media/file/:key
```

Posts/distribution:

```text
GET  /api/posts
POST /api/posts
GET  /api/posts/:id
PATCH /api/posts/:id
POST /api/distribution/orchestrate
```

Product metrics:

```text
GET /api/metrics/product
```

OpenAPI:

```text
GET /api/openapi.json
```

## CLI request conventions

All commands should support:

```text
--base-url <url>
--context <name>
--output table|json|jsonl|yaml
--quiet
--no-color
--request-id <id>
--timeout <duration>
```

Mutation commands should support:

```text
--dry-run
--yes
--idempotency-key <key>
```

Expensive AI commands should support:

```text
--max-credits <n>
```

## Endpoint gaps to cover with a CLI facade later

These are better as `/v1/cli/...` workflow endpoints because they compose several server calls:

```text
POST /v1/cli/content/validate
POST /v1/cli/distribution/dry-run
POST /v1/cli/doctor
GET  /v1/cli/capabilities
GET  /v1/cli/jobs/:id
```

Until those exist, build the CLI around the available endpoints and keep the API client isolated so paths can be swapped.
