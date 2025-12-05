## Approach
- Use focused Jest/Angular specs to exercise existing behavior only; no production code changes unless trivial test helpers are needed.
- Stub external dependencies (HTTP, websocket, storage, redis) to force success and failure paths without network/I/O.
- Prefer small, isolated specs per target file to keep scope tight and measurable.
- Validate via `act -j test_coverage` so coverage deltas align with CI expectations.
