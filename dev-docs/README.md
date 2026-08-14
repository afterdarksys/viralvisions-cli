# ViralVisions CLI Build Handoff

This folder is the implementation handoff for building `viralvisions-cli`.

The goal is to let a cheaper/faster implementation model build the base CLI mechanically, using the platform API and rules documented here. The CLI should not invent product behavior. It should call ViralVisions workflow endpoints, preserve stable structured output, and fail closed around publishing, deletion, spend, credentials, and external visibility.

## Suggested build order

1. Read `CLI-ARCHITECTURE.md`.
2. Implement the core command framework and config/auth context.
3. Implement the API client from `API-CONTRACT.md`.
4. Build commands in the order listed in `COMMAND-MAP.md`.
5. Add tests from `TEST-PLAN.md`.
6. Use `MODEL-INSTRUCTIONS.md` as the model-facing implementation brief.

## Current platform assumption

The ViralVisions app now has enough server-side machinery for a CLI base:

- account readiness
- trend opportunities and trend content packages
- trend intelligence
- creator DNA controls
- video coach analysis
- experiments and winner capture
- product metrics
- distribution orchestration
- media upload reservation

The CLI should be a client over those APIs, not a second backend.
