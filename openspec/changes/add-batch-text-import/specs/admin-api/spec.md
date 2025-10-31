## ADDED Requirements

### Requirement: Text File Batch Import
The system SHALL provide an API endpoint for bulk importing order numbers from text files into the multi_orders table.

#### Scenario: Successful text file import
- **WHEN** an authenticated admin uploads a text file via POST `/api/admin/orders/import-text`
- **AND** the file contains valid order numbers (one per line, format P + 18 digits)
- **THEN** the system shall parse the file and insert all valid order numbers into multi_orders table
- **AND** return a response with success count, error count, and detailed error information

#### Scenario: Text file with invalid formats
- **WHEN** the uploaded text file contains lines that don't match the order number format
- **THEN** the system shall skip invalid lines and continue processing valid lines
- **AND** report invalid lines in the error details
- **AND** include line numbers and reasons for validation failures

#### Scenario: Duplicate order number handling
- **WHEN** the text file contains order numbers that already exist in multi_orders table
- **THEN** the system shall skip duplicate orders and continue processing
- **AND** report skipped duplicates in the response
- **AND** maintain database integrity with INSERT OR IGNORE operations

#### Scenario: Large file processing
- **WHEN** the uploaded text file contains thousands of order numbers
- **THEN** the system shall process the file efficiently using batch database operations
- **AND** provide progress feedback during processing
- **AND** handle memory usage appropriately for large files

#### Scenario: File validation errors
- **WHEN** the uploaded file is not a text file or exceeds size limits
- **THEN** the system shall reject the upload with appropriate error message
- **AND** specify supported file formats and size limits
- **AND** maintain security by validating file content

## MODIFIED Requirements

### Requirement: Admin Order Management Interface
The admin interface SHALL provide comprehensive order management capabilities including individual order addition, batch JSON import, and text file import.

#### Scenario: Unified import interface
- **WHEN** an admin accesses the order management section
- **THEN** the interface shall display three import options: single order, JSON batch, and text file upload
- **AND** provide clear instructions for each import method
- **AND** show appropriate form fields and validation for each method