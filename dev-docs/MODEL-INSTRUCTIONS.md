# Model Instructions for Building the CLI

You are implementing `viralvisions-cli`.

Do not redesign the ViralVisions product. Build a reliable command-line client over the documented API surfaces.

## Hard requirements

- Use `vv` as the binary.
- Keep command output stable.
- JSON output must be valid JSON and contain no progress text.
- Never print tokens, cookies, authorization headers, signed URLs, or secrets.
- Do not publish, schedule, delete, disconnect, reset, or spend without explicit confirmation.
- In non-interactive mode, require `--yes` for destructive or externally visible actions.
- Implement `--dry-run` wherever a command can mutate.
- Include idempotency keys on mutation requests.
- Fail closed if auth, permissions, readiness, or API capability is uncertain.

## Initial implementation phases

### Phase 1: skeleton

- project setup
- command framework
- config/context loader
- API client
- output renderers
- error envelope
- tests for parsing/output/redaction

### Phase 2: read-only commands

- `vv auth status`
- `vv context list/use/show/set`
- `vv accounts readiness`
- `vv trends opportunities`
- `vv trends intelligence`
- `vv creator-dna show`
- `vv metrics product`
- `vv predictions calibration`
- `vv doctor`

### Phase 3: safe mutation commands

- `vv creator-dna refresh`
- `vv creator-dna set`
- `vv creator-dna reset --yes`
- `vv trends use`
- `vv analyze video --content-id`
- `vv experiments create`
- `vv experiments winner`

### Phase 4: publishing workflow

Only after confirmation/idempotency tests exist:

- `vv posts create`
- `vv publish`
- `vv schedule`
- `vv distribution retry`
- `vv distribution cancel`

## API client behavior

Every request:

- set auth header if token exists
- set client header
- set request source header
- set timeout
- parse JSON safely
- return typed result or typed error

Every mutation:

- include `Idempotency-Key`
- support `--dry-run` when the command exposes it

## Stop conditions

Stop and leave notes instead of guessing if:

- an endpoint does not exist
- a response shape is unclear
- a command would need product behavior not documented here
- a command would require storing secrets unsafely
- a command could make content externally visible without confirmation
