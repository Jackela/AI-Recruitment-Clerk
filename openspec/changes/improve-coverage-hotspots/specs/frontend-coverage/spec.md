## ADDED Requirements
### Requirement: Frontend coverage for mobile UI and live regions
This capability SHALL add tests to cover mobile navigation/swipe behaviors and aria-live announcements.

#### Scenario: Mobile navigation toggles and swipe gestures are exercised
- **WHEN** specs render mobile navigation and swipe components
- **AND** simulate menu toggle and left/right swipe events
- **THEN** nav state (open/close) and swipe callbacks are asserted without runtime errors.

#### Scenario: Aria-live announces messages once per region
- **WHEN** specs render the aria-live component and push polite and assertive messages
- **THEN** polite and alert containers update with correct `aria-live`/`aria-relevant` attributes and do not duplicate announcements.

### Requirement: Frontend infra utilities
This capability MUST add tests that exercise logger/error/websocket services and lazy-load directive branches using mocks.

#### Scenario: Logger and error-handling services log success and errors
- **WHEN** tests invoke logger/error services with info/warn/error inputs and simulated handler failures
- **THEN** logs route to console or fall back without throwing, and error metadata is captured.

#### Scenario: Websocket service reconnects and surfaces failures
- **WHEN** tests mock websocket connection open/close/error and message events
- **THEN** reconnect/backoff logic and message handling paths execute without uncaught exceptions.

#### Scenario: Lazy-load directive triggers load and error callbacks
- **WHEN** tests stub IntersectionObserver callbacks for intersecting and error cases
- **THEN** load callbacks fire once per target and error handling executes without leaking observers.
