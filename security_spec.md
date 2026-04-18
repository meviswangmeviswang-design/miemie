# Security Spec

## Data Invariants
1. Orders consist of a public document (`/orders/{orderId}`) and a private sub-document (`/orders/{orderId}/private/data`).
2. Private order data contains PII (contact information) and MUST ONLY be readable by Admins.
3. Unauthenticated users cannot list orders (`allow list: if false`). They can only `get` an order by providing the exact ID.
4. When a user submits an order, they MUST simultaneously create the public document and its private sub-document atomically.
5. `trackingId` is unguessable and serves as the document ID for orders.
6. The admin can read and write all paths.
7. Only Admins can modify an existing order's status or create an `OrderAlias`.
8. Order statuses can only be updated sequentially by admins, or assigned an `officialOrderId`.

## The "Dirty Dozen" Payloads
1. Create order missing private data (Atomicity bypass).
2. Create order missing mandatory fields (Schema bypass).
3. Create order with oversized string mimicking DoS attack (Size limit bypass).
4. Update order status as unauthenticated user (Privilege escalation).
5. Read `/orders/private/data` as unauthenticated user (PII leak).
6. Perform `list` on `/orders` as unauthenticated user (Enumeration/Scraping).
7. Create `order_aliases` as unauthenticated user.
8. Modify `settings/global` as unauthenticated user.
9. Inject `officialOrderId` during order creation (State injection).
10. Spoof `request.auth.token.email` with `email_verified: false` to act as Admin.
11. Admin trying to update `updatedAt` with non-request.time (Temporal integrity bypass).
12. Creating order with non-request.time `createdAt` (Temporal integrity bypass).

