# Ops Endpoint Authentication

Ops endpoints under `/ops/*` are protected by an API key header when configured.

- Header: `x-ops-key`
- Environment variable to enable: `OPS_API_KEY`
  - If `OPS_API_KEY` is set and non-empty, requests must include `x-ops-key` equal to this value.
  - If `OPS_API_KEY` is not set, protection is disabled (development-friendly default).

Controllers protected:
- /ops/release/*
- /ops/flags/*
- /ops/audit/*
- /ops/observability/*
- /ops/impact

For CI/E2E, either leave `OPS_API_KEY` unset or pass the header using the configured value.