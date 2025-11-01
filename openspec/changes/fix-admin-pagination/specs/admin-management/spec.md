## MODIFIED Requirements
### Requirement: Order List Pagination
The admin interface SHALL provide paginated browsing of order records with functional page navigation controls.

#### Scenario: Navigate to next page updates data
- **WHEN** user clicks "下一页" button in order list pagination
- **THEN** the order table SHALL display records from the next page
- **AND** pagination controls SHALL update to reflect current page

#### Scenario: Navigate to specific page updates data
- **WHEN** user clicks any page number button in pagination
- **THEN** the order table SHALL display records from the selected page
- **AND** pagination controls SHALL highlight the current active page

#### Scenario: Navigate to previous page updates data
- **WHEN** user clicks "上一页" button in order list pagination
- **THEN** the order table SHALL display records from the previous page
- **AND** pagination controls SHALL update to reflect current page