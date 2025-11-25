# HF-CORTEX Error Packet 1.0 (Stable)

Author: Mozhanov Aleksandr Mikhaylovich  
Status: Stable  
Date: 2025-11-25  
Repository: https://github.com/nemezida1337/hf-cortex  

---

## 1. Overview

The **HF-CORTEX Error Packet 1.0 (Stable)** defines a universal, domain-agnostic error format for all HF‑CORTEX‑compliant systems and LLM agents.

Its goals:

- unify error signaling across all domains,
- enable self-healing behavior in LLMs and agents,
- provide consistent fields for diagnostics, recovery, and routing,
- remain stable across HF‑CORTEX Core 1.x.

This packet is **type-discriminated** by the `ver` field:

```
ver = "hf-cortex-error-1.0"
```

Any system MUST treat such a packet as an error object, never a content packet.

---

## 2. Packet Structure

```jsonc
{
  "ver": "hf-cortex-error-1.0",

  "id": "string",
  "origin": "string",

  "error": {
    "code": "string",
    "message": "string",
    "details": {},

    "retry": false,
    "suggested_fix": ""
  },

  "_ext": {}
}
```

### Required fields

- `ver` — MUST always be `"hf-cortex-error-1.0"`.
- `id` — unique error identifier (UUID recommended).
- `origin` — source of the error (module, domain, tool, agent).
- `error.code` — machine-readable error class.
- `error.message` — human-readable explanation.

### Optional fields

- `error.details` — any structured metadata.
- `error.retry` — whether automated retry is allowed.
- `error.suggested_fix` — textual recommendation for LLM/self-healing systems.
- `_ext` — extension namespace.

---

## 3. Recommended Error Codes

General errors:

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Packet failed schema or domain validation |
| `MISSING_FIELD` | Required field absent |
| `TYPE_ERROR` | Wrong data type encountered |
| `DOMAIN_ERROR` | Domain-specific rule violation |
| `UNSUPPORTED_VERSION` | Unknown or unsupported `ver` |
| `EMPTY_CONTENT` | Empty or unusable C block |
| `INTERNAL_ERROR` | System-level fault |

LLM-facing errors:

| Code | Meaning |
|------|---------|
| `LLM_FORMAT_ERROR` | Model returned non-parseable output |
| `LLM_RULE_VIOLATION` | Model violated constraints or profile rules |
| `LLM_HALLUCINATION` | Model invented data that MUST NOT be invented |
| `LLM_OFFER_VIOLATION` | (Rozatti) Model tried to create offers not in C.offers |

---

## 4. Self-Healing Fields

### 4.1. `retry`

If `retry = true`, the system MAY automatically re-run the previous operation.

Example:

```jsonc
"retry": true
```

Reasons include transient failures, partial JSON, or small format issues.

### 4.2. `suggested_fix`

LLM can use this to self-correct without manual intervention.

Examples:

```json
"Recompute H.L using compact UTF‑8 JSON."
"Do not invent missing offers. Use only C.offers[]."
"Phone number invalid. Reformat to E.164."
```

Future versions may evolve this into a structured object.

---

## 5. Extension Namespace

`_ext` MAY include:

- vendor information,
- security metadata,
- correlation IDs,
- debugging context.

Reverse‑DNS naming is RECOMMENDED:

```jsonc
"_ext": {
  "vendor": {
    "com.rozatti.session": "chat123",
    "io.hf.cortex.trace": "a8e2fabb"
  }
}
```

---

## 6. Compliance

To comply with HF‑CORTEX Error 1.0:

- `ver` MUST equal `"hf-cortex-error-1.0"`,
- `id`, `origin`, and `error.code` MUST be present,
- unknown fields MUST be safely ignored,
- extension rules MUST follow Core.

---

## 7. Versioning

This is a **Stable** version.

- Minor updates (clarifications, formatting) do NOT change `"ver"`.
- Breaking changes will produce `"hf-cortex-error-2.0"`.

---

## 8. Example (Full)

```jsonc
{
  "ver": "hf-cortex-error-1.0",
  "id": "err-44321",
  "origin": "sales.rozatti.offer_lint",

  "error": {
    "code": "LLM_OFFER_VIOLATION",
    "message": "Model attempted to invent an offer not listed in C.offers.",
    "details": {
      "invented_offer": "OEM-XYZ123"
    },
    "retry": false,
    "suggested_fix": "Use only offers exactly as listed in C.offers[]."
  },

  "_ext": {
    "vendor": {
      "com.rozatti.session": "chat-55221"
    }
  }
}
```

---

End of HF‑CORTEX Error Packet 1.0 (Stable).