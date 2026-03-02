## ADDED Requirements

### Requirement: PDF report generation

The system SHALL generate PDF reports using Puppeteer.

#### Scenario: Generate individual candidate PDF report

- **WHEN** report generation is requested for a single candidate
- **THEN** system SHALL render HTML template with candidate data
- **AND** system SHALL convert HTML to PDF using Puppeteer
- **AND** PDF SHALL be stored in GridFS

#### Scenario: PDF includes professional styling

- **WHEN** generating PDF report
- **THEN** PDF SHALL include CSS styling for professional appearance
- **AND** PDF SHALL be printable on A4 paper

### Requirement: JSON report output

The system SHALL output structured JSON reports.

#### Scenario: Generate JSON report

- **WHEN** report generation is requested in JSON format
- **THEN** system SHALL return a JSON object matching the ReportSchema
- **AND** JSON SHALL include all scoring data and metadata

### Requirement: Excel report generation

The system SHALL generate Excel reports for batch analysis.

#### Scenario: Generate batch Excel report

- **WHEN** report generation is requested for multiple candidates
- **THEN** system SHALL create an Excel file with candidate comparison
- **AND** Excel SHALL include summary sheet and detail sheets

### Requirement: Real data integration

Reports SHALL use real data from other services, not mock data.

#### Scenario: Fetch scoring data for report

- **WHEN** generating a report
- **THEN** system SHALL fetch real scoring data from scoring-engine-svc
- **AND** system SHALL fetch real resume data from resume-parser-svc

#### Scenario: Fetch job requirements for report

- **WHEN** generating a report
- **THEN** system SHALL fetch real job data from jd-extractor-svc
- **AND** job requirements SHALL be included in the report

### Requirement: Report template system

The system SHALL support customizable report templates.

#### Scenario: Use Handlebars templates

- **WHEN** generating any report format
- **THEN** system SHALL use Handlebars templates
- **AND** templates SHALL be stored in a configurable directory

#### Scenario: Template data binding

- **WHEN** rendering a template
- **THEN** all candidate data SHALL be properly bound
- **AND** missing data SHALL use default fallback values
