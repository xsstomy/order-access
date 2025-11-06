## MODIFIED Requirements

### Requirement: Dual-Channel Device ID Generation
The system SHALL use a dual-channel approach for device identification using server-issued UUIDs with fallback mechanisms.

#### Scenario: Initial device ID assignment
- **WHEN** a user first accesses the verification page without device identifiers
- **THEN** the server SHALL generate a UUID and set it in an HttpOnly + Secure + SameSite=Lax cookie (365-day expiry)
- **AND** the same UUID SHALL be stored in localStorage for redundancy
- **AND** both identifiers SHALL be used for device recognition

#### Scenario: Device ID recovery mechanism
- **WHEN** the cookie is lost but localStorage still contains the UUID
- **THEN** the system SHALL restore the cookie using the localStorage value
- **AND** maintain the same device identity for binding purposes
- **AND** only treat as new device when both identifiers are missing

#### Scenario: Cross-request device identification
- **WHEN** making subsequent requests to the server
- **THEN** the system SHALL prioritize the cookie value for device identification
- **AND** fall back to localStorage when cookie is unavailable
- **AND** ensure consistent device identity across browser sessions

### Requirement: Device-Order Binding
The system SHALL bind order numbers to specific device IDs to prevent unauthorized access from other devices.

#### Scenario: First-time device binding
- **WHEN** a user successfully verifies an order from a new device
- **THEN** the system SHALL create a binding between the order number and device ID
- **AND** record the binding timestamp and device information
- **AND** allow access from the bound device

#### Scenario: Multiple device support
- **WHEN** a user accesses the same order from different devices
- **THEN** the system SHALL allow up to 3 device bindings per order
- **AND** track each device's last access time
- **AND** reject access from additional devices beyond the limit

#### Scenario: Device validation during verification
- **WHEN** a user attempts to verify an order
- **THEN** the system SHALL check if the current device ID is bound to the order
- **AND** allow access if the device is already bound
- **AND** create a new binding if under the device limit and order is valid
- **AND** reject access if device limit is exceeded

### Requirement: Device Management API
The system SHALL provide API endpoints to manage device bindings for administrative purposes.

#### Scenario: Query device bindings
- **WHEN** an administrator requests device information for an order
- **THEN** the system SHALL return all bound devices with their metadata
- **AND** include device creation time and last access time
- **AND** mask sensitive device information for security

#### Scenario: Remove device binding
- **WHEN** an administrator needs to remove a device binding
- **THEN** the system SHALL remove the specific device-order binding
- **AND** invalidate any active sessions from that device
- **AND** log the administrative action for audit purposes

### Requirement: Device ID Privacy and Transparency
The system SHALL handle device identification in a privacy-conscious manner using non-intrusive methods.

#### Scenario: Privacy-friendly identification
- **WHEN** implementing device identification
- **THEN** the system SHALL use randomly generated UUIDs rather than device fingerprinting
- **AND** avoid collecting any personal identifiable information or device characteristics
- **AND** store only the UUID values, not any browser or hardware information

#### Scenario: User transparency
- **WHEN** device binding is created
- **THEN** the system SHALL inform the user about device binding in plain language
- **AND** explain that device identification uses anonymous random identifiers
- **AND** provide information about device limits if applicable

## ADDED Requirements

### Requirement: Differentiated Time Windows for Order Types
The system SHALL apply different time window restrictions based on order type to align with business intent.

#### Scenario: Single-order 24-hour access window
- **WHEN** a user verifies a single-order for the first time
- **THEN** the system SHALL create a 24-hour access window from first verification
- **AND** allow access within this 24-hour window
- **AND** reject access after the 24-hour window expires
- **AND** display appropriate expiry message

#### Scenario: Multi-order unlimited time access
- **WHEN** a user verifies a multi-order
- **THEN** the system SHALL NOT impose any time-based access restrictions
- **AND** allow access based only on usage count limits (if any)
- **AND** ignore 24-hour window expiry logic for multi-orders
- **AND** continue access until usage count is exhausted (if limits are set)

#### Scenario: Order type time validation
- **WHEN** processing any order verification request
- **THEN** the system SHALL first determine the order type (single vs multi)
- **AND** apply appropriate time restriction logic based on order type
- **AND** maintain separate time tracking for different order types

## REMOVED Requirements

### Requirement: Universal 24-hour Access Window
**Reason**: The universal 24-hour window was too restrictive for multi-orders, which are intended for long-term access.

**Migration**: Replace with differentiated time windows - keep 24-hour restriction for single-orders only, remove time restrictions for multi-orders.

#### Scenario: Previous universal 24-hour window application
- **REMOVED**: All orders (both single and multi) were subject to 24-hour access window
- **REMOVED**: Multi-orders would expire after 24 hours regardless of remaining usage count
- **REMOVED**: "该订单已超过24小时访问期限" error applied to all order types