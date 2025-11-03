## Why
The system needs to efficiently import a large number of existing order numbers (2,752 orders) from a text file into the `multi_orders` database table. Currently, the admin interface only supports individual order addition or JSON batch import, but there's no direct way to import from a simple text file format where each line contains one order number.

## What Changes
- Add new API endpoint `/api/admin/orders/import-text` to handle text file uploads
- Extend admin interface with file upload functionality for text files
- Add text file parsing and validation logic
- Add bulk database insertion with proper error handling and progress reporting
- Support optional `max_access` parameter for imported orders

## Impact
- Affected specs: `admin-api` (new capability for text file import)
- Affected code:
  - `src/server/api/admin.js` (new import endpoint)
  - `public/admin.html` (file upload UI)
  - `public/css/admin.css` (upload styling)
  - `public/js/api.js` (file upload functionality)
- Database: `multi_orders` table will receive bulk insertions