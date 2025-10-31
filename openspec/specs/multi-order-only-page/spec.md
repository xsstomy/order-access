# multi-order-only-page Specification

## Purpose
TBD - created by archiving change create-multi-order-only-page. Update Purpose after archive.
## Requirements
### Requirement: 多次订单专用验证页面
The system SHALL provide a dedicated HTML page that only accepts multi-order verification, preventing single-order users from accessing premium content.

#### Scenario: 用户通过多次订单验证访问页面
- **WHEN** a user accesses `multi-order.html` and enters a valid multi-order number
- **THEN** the system SHALL verify the order exists in the `multi_orders` database table
- **AND** the system SHALL check if the order has remaining access (if limits are set)
- **AND** upon successful verification, hide the verification overlay and display tutorial content
- **AND** display verification status indicator with session timer

#### Scenario: 用户使用单次订单验证被拒绝
- **WHEN** a user enters a single-order number on `multi-order.html`
- **THEN** the system SHALL detect the order type is not 'multi'
- **AND** display error message: "此页面仅支持多次订单验证，请联系客服获取多次订单权限"
- **AND** keep the verification overlay visible
- **AND** not reveal specific order status information

#### Scenario: 用户输入无效订单号
- **WHEN** a user enters an invalid or non-existent order number
- **THEN** the system SHALL follow existing security policies
- **AND** display standard error message: "验证失败，请稍后再试或联系客服"
- **AND** not reveal whether the order exists in the system

### Requirement: 页面功能完整性
The multi-order page SHALL maintain complete functional parity with the original index.html page.

#### Scenario: 页面功能与原页面保持一致
- **WHEN** a user has successfully verified with a multi-order
- **THEN** tutorial content SHALL display correctly
- **AND** account copy functionality SHALL work properly
- **AND** session management features SHALL function normally
- **AND** device binding mechanism SHALL operate correctly
- **AND** all styling and interactions match the original page

### Requirement: 安全性和兼容性
The multi-order page SHALL maintain all existing security mechanisms and compatibility.

#### Scenario: 保持现有安全机制
- **WHEN** accessing `multi-order.html`
- **THEN** API rate limiting SHALL remain effective
- **AND** session timeout mechanism SHALL work properly
- **AND** device binding SHALL function correctly
- **AND** error messages SHALL not leak sensitive information

