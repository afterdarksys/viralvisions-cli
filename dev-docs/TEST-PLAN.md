# Test Plan

## Unit tests

Cover:

- command parsing
- config/context selection
- output format rendering
- JSON envelope stability
- redaction of tokens/cookies/signed URLs
- confirmation behavior
- dry-run behavior
- idempotency-key generation
- retry decision logic
- error mapping

## Golden tests

Golden-test:

```text
vv --help
vv accounts list --output json
vv trends opportunities --output json
vv creator-dna show --output json
vv analyze video --content-id sample --output json
vv experiments list --output json
```

Golden files should assert stdout only. Progress/warnings should be stderr.

## Contract tests

Mock the ViralVisions API and verify:

- request method/path/body
- auth header
- idempotency key on mutations
- request source header
- timeout handling
- retry handling for safe operations
- no retry for validation/permission/quota/moderation failures

## Safety tests

Required:

- publish fails in non-interactive mode without `--yes`
- delete/reset/disconnect fail in non-interactive mode without `--yes`
- output JSON remains valid even when warnings are present
- secrets are redacted from verbose output
- invalid local paths are rejected before upload
- `--dry-run` does not mutate

## End-to-end smoke tests

Once the server has a test environment:

1. auth status
2. accounts readiness
3. trends opportunities
4. trend use package
5. media upload reserve
6. video coach analyze
7. post create draft
8. distribution dry-run
9. experiment create
10. metrics product
