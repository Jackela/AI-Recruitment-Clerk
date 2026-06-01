## ADDED Requirements

### Requirement: Server health check verifies HTTP connectivity

The health check SHALL verify that the frontend server responds to HTTP requests on the configured port.

#### Scenario: Server responds with HTTP 200

- **WHEN** the health check sends a GET request to the frontend URL
- **THEN** the server SHALL respond with HTTP status code 200

#### Scenario: Server is not ready

- **WHEN** the health check sends a GET request to the frontend URL
- **AND** the server is not yet accepting connections
- **THEN** the health check SHALL retry with exponential backoff
- **AND** the health check SHALL fail after the maximum timeout (60 seconds)

### Requirement: Server health check verifies Angular app content

The health check SHALL verify that the server is serving the actual Angular application by checking for key application elements in the response.

#### Scenario: Angular app is properly served

- **WHEN** the health check receives an HTTP 200 response
- **THEN** the response body SHALL contain the `<app-root>` or `arc-root` element
- **AND** the response body SHALL contain Angular bootstrap indicators

#### Scenario: Wrong content served

- **WHEN** the health check receives an HTTP 200 response
- **AND** the response does not contain Angular app indicators
- **THEN** the health check SHALL log a warning
- **AND** the health check SHALL continue retrying

### Requirement: Health check provides detailed logging

The health check SHALL provide clear logging of each verification step to aid debugging.

#### Scenario: Health check in progress

- **WHEN** the health check is attempting to connect
- **THEN** each retry attempt SHALL be logged with the attempt number and URL
- **AND** successful connection SHALL be logged with timing information

#### Scenario: Health check fails

- **WHEN** the health check exceeds the maximum timeout
- **THEN** a detailed error message SHALL be logged including:
  - The URL that was checked
  - The number of retry attempts
  - The final error response (if any)
  - Suggested troubleshooting steps
