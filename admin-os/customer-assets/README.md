# Customer Assets

Filesystem-managed customer assets for Nexa.

Each customer has:
- `memory.md`: long-term preference and operating profile
- `wallet.md`: wallet/payment contract baseline

These files are the source of truth for customer-specific static profile data. Runtime-derived behavior is merged on top in code.
