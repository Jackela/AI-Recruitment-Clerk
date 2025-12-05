## Why
Coverage remains low in several hotspots despite a passing pipeline. The latest `act -j test_coverage` shows multiple files under ~50% (e.g., frontend mobile components, aria-live, infrastructure services, and backend auth/cache services). We need a targeted test pass to lift these areas and reduce risk of regressions.

## What Changes
- Add/extend frontend Jest/Angular specs for mobile navigation/swipe components, aria-live announcements, lazy-load directive, and infrastructure services (error-handling, websocket, logger).
- Add backend unit specs for auth notification services (SMS/Email/MFA) and cache layer (cache service, warmup, redis connection) to cover success/error branches.
- Keep production logic unchanged; focus on test coverage and documented behaviors.

## Impact
- Higher confidence in guest/mobile experiences and realtime/logging utilities.
- Better safety net around auth delivery and cache behaviors.
- No runtime changes; only tests and supporting test scaffolding.
