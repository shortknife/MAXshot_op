---
customer_id: maxshot
auth_version: 1
primary_auth_method: email
verification_posture: operator
wallet_posture: identity_only
---
## Summary
MAXshot access should stay operator-first, with direct verification and minimal ceremony.

## Entry Hint
Use your operator email for the primary path. Wallet is available for linked identity proof, not for payment execution.

## Recovery Actions
- 改用 operator email 重新验证
- 检查 wallet 是否绑定到当前 operator
- 返回 Customers workspace 确认当前 customer
