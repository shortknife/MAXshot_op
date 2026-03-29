# CX Dev Tooling Note

- Date: 2026-03-29
- Status: Active / Dev-only
- Scope: local development efficiency only

## 1. Purpose

`cx` is a local semantic code navigation tool used to reduce full-file reads during development and review.

It is useful for:

1. file structure overview
2. symbol discovery
3. precise definition lookup
4. reference-driven code tracing

It is not part of MAXshot runtime and does not affect Step 1-9 architecture.

## 2. Local install status

- Binary:
  - `/Users/alexzheng/.local/bin/cx`
- Verified version:
  - `cx 0.5.2`
- Verified grammar:
  - `typescript`

## 3. Recommended usage order

Before reading a whole file, prefer this order:

1. `cx overview <file>`
2. `cx symbols --kind fn --file <file>`
3. `cx definition --name <symbol>`
4. only then use full file read if needed

This keeps code exploration narrower and cheaper.

## 4. Common commands

From:

```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
export PATH="$HOME/.local/bin:$PATH"
```

### File structure

```bash
cx overview lib/router/router-main.ts
```

### Functions in a file

```bash
cx symbols --kind fn --file lib/router/router-main.ts
```

### Find one symbol definition

```bash
cx definition --name executeRouter
```

### Find symbol references

```bash
cx references --name executeRouter
```

## 5. Practical rule for this repo

For MAXshot development, prefer `cx` first when doing:

1. code review
2. router/capability call-chain tracing
3. multi-file refactor prep
4. Step-level implementation work after brainstorming

Use normal file reads when:

1. full surrounding logic matters
2. the symbol output is insufficient
3. patching requires exact line-level context

## 6. Non-goals

`cx` does not replace:

1. acceptance tests
2. step contracts
3. freeze checks
4. runtime observability

It is only a developer-side efficiency tool.
