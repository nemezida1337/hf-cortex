# HF-CORTEX Core Protocol 1.1 (Stable)

Author: Mozhanov Aleksandr Mikhaylovich (Можанов Александр Михайлович)  
Status: Stable  
Date: 2025-11-25  
Repository: https://github.com/nemezida1337/hf-cortex  

---

## 1. Overview

HF-CORTEX Core 1.1 defines a **minimal, domain-neutral cognitive data packet format** for LLMs and AI agents.

The goals of the Core:

- Provide a **compact, structured and semantically oriented** container (`cortex packet`).
- Stay **domain-agnostic**: no built-in business logic.
- Define **extension points** for domain profiles, security, metrics, etc.
- Be compatible with HF-CORTEX v1.0 while cleaning up and formalizing the core.

Higher-level domain profiles (e.g. sales, solar, dialogs) and advanced metrics (full hyperfractal header, security, error conventions) are defined in **separate documents**.

This document refines the canonical definitions of the metrics `L` and `D`, describes extension and versioning rules, and is intended as the **reference text** for HF-CORTEX Core 1.1.

---

## 2. Packet Structure (Core)

A HF-CORTEX Core packet is a JSON-like object with the following top-level fields:

```jsonc
{
  "ver": "hf-cortex-core-1.1",
  "id": "string",
  "dom": "string",
  "H": { /* Header (Core) */ },
  "C": { /* Content (domain data) */ },

  // Optional (but strongly RECOMMENDED for LLM use)
  "M": { /* Meaning / cognitive contract */ },

  // Optional
  "S": [ /* Structure tree/graph */ ],
  "R": { /* Relations / links */ },

  // Extension point (Core-wide)
  "_ext": { /* extensions */ }
}
```

### 2.1. Required fields

- `ver` (string)  
  Protocol version identifier. For Core 1.1: `"hf-cortex-core-1.1"`.

- `id` (string)  
  Globally unique packet ID (UUID or domain-specific unique key).

- `dom` (string)  
  Domain namespace, e.g. `"sales.rozatti"`, `"solar.hf"`, `"dialog.support"`.  
  `dom` MUST NOT be used to encode business semantics inside the Core; it is a **routing/namespace hint**.

- `H` (object)  
  Core header (see §3).

- `C` (object)  
  Domain content (see §4).

### 2.2. Optional fields

- `M` (object) — Meaning block (see §5).  
  MUST be present when the packet is intended as a **cognitive instruction** to an LLM/agent.  
  MAY be absent for pure storage, logging or non-LLM processing.

- `S` (array) — Structure block (see §6).  
  MAY be used to encode a tree/graph of internal elements.

- `R` (object) — Relations block (see §7).  
  MAY be used to link cortex packets and external IDs.

- `_ext` (object) — Extension block (see §8).  
  MAY contain any additional fields not covered by Core (security, domain profiles, vendor-specific data, full hyperfractal metrics, etc.).

---

## 3. Core Header (H)

`H` describes **scale and density** of the content in `C`.  
Core 1.1 defines only two required metrics: `L` and `D`.

```jsonc
"H": {
  "L": 32,
  "D": 0.75,

  // Optional convenience fields (kept for compatibility / usability)
  "T": "optional_type_code",
  "tags": ["optional", "tags"],

  // Extensions (full hyperfractal metrics, security, etc.)
  "_ext": { /* see §8 */ }
}
```

### 3.1. Field: L (scale)

- Name: `L`  
- Type: number  
- Required: YES  

**Intended meaning:** log-scale measure of the content size.

**Canonical computation:**

1. Serialize `C` to JSON using:
   - UTF-8 encoding,
   - compact separators (no insignificant whitespace, no pretty-print).

2. Let `N` be the number of bytes in this UTF-8 representation.

Then:

```text
L SHOULD be computed as:  L = round(log2(N))
```

Implementations:

- MUST base `L` on UTF-8 bytes of compact JSON if they claim Core 1.1 compliance.
- MAY apply domain-specific normalization/scaling on top of `L` if needed, but MUST preserve monotonicity: larger content → larger `L`.

#### 3.1.1. High-precision variant (optional)

For high-precision or analytical use-cases, implementations MAY also compute:

```text
L_float = log2(N)        // non-rounded
```

and expose it as:

```jsonc
"H": {
  "L": 32,
  "D": 0.75,
  "_ext": {
    "metrics": {
      "L_float": 4.98
    }
  }
}
```

Downstream systems SHOULD continue to use integer `L` for coarse-grained routing and monitoring, and MAY use `L_float` for fine-grained analysis.

### 3.2. Field: D (density)

- Name: `D`  
- Type: number in [0, 1]  
- Required: YES  

**Intended meaning:** density of **informative elements** within `C`.

**Recommended computation (leaf-based):**

- Traverse `C` as a JSON tree and collect all **leaf fields** (values that are not objects and not arrays).  
- Let `total_leaf_slots` be the total number of such leaf positions.  
- Let `informative_leaf_slots` be the number of leaf slots whose values are not `null`, not empty strings, not `NaN` and not a domain-specific "missing" marker.

Then:

```text
D SHOULD be computed as:  D = informative_leaf_slots / total_leaf_slots
```

If `total_leaf_slots = 0`, implementations SHOULD set `D = 0.0`.

**Clarification for arrays:**

- If a leaf value appears inside any level of arrays (including nested arrays), each position counts as one leaf slot.
- Example: `[1, 2, 3]` has `total_leaf_slots = 3`.  
- Example: `[[1, 2], [3, null]]` has `total_leaf_slots = 4`, and `informative_leaf_slots = 3`.

#### 3.2.1. Field-based fallback (optional, simplified)

If an implementation does not wish to traverse all leaves, a simpler approximation MAY be used, based only on the **top-level fields of `C`**:

- Let `total_fields` be the number of top-level keys in `C`.  
- Let `non_null_fields` be the number of those keys whose values are not `null`.  
  Arrays and nested objects are counted as a single field; their internal structure is NOT inspected.

Then an approximate density MAY be computed as:

```text
D_alt = non_null_fields / total_fields
```

In such cases, `D` MAY be set to `D_alt`, provided that the implementation uses this method consistently within the same domain/profile.

Implementations SHOULD document which method they use when precision matters.

### 3.3. Optional fields: T, tags

To preserve convenience and compatibility with earlier drafts:

- `T` (string) — optional type/topology code, e.g. `"lead+offers"`, `"dialog_step", "solar_sample"`.  
- `tags` (array of strings) — optional semantic tags, e.g. `["lead", "offers", "oem:A2128300318"]`.

These fields:

- MAY be used by agents and infrastructure for quick filtering and routing.
- SHOULD NOT be overloaded with full domain definitions (these belong to profiles / `_ext.domain`).

### 3.4. Header extensions

`H._ext` MAY contain any additional metrics and flags, including:

```jsonc
"H": {
  "L": 32,
  "D": 0.75,
  "_ext": {
    "metrics": {
      "L_float": 4.98,
      "E": 0.12,
      "S": 0.9,
      "U": 0.1
    },
    "domain": {
      "profile": "hf-cortex-sales-rozatti-1.0"
    }
  }
}
```

Advanced hyperfractal metrics (`E`, `S`, `U`, etc.) are defined in separate documents and are NOT required for Core compliance.

---

## 4. Content Block (C)

`C` contains **domain-specific data**.  
Core does not impose a concrete schema, only **general principles**:

1. `C` MUST be a JSON object at the top level.  
2. Within a given domain/profile, the structure of `C` SHOULD be:
   - stable across packets of the same `T` / profile,
   - documented in a separate domain profile spec (e.g. `HF-CORTEX-Sales-Rozatti-1.0.md`).  
3. For LLM-facing use:
   - Implementations SHOULD prefer **compact representations** (arrays/tuples) where human readability is not critical.
   - Keys SHOULD be short when used frequently.

Core only requires that:

- `C` be JSON-object,
- `H.L` and `H.D` be computed consistently over `C`.

### 4.1. Examples of L and D

**Example 1:**

```jsonc
"C": { "a": 1, "b": 2 }
```

- Compact JSON: `{"a":1,"b":2}` (without spaces)  
- UTF-8 bytes length `N` = 13 → `L = round(log2(13)) = 4`  
- Leaves: `a = 1`, `b = 2` → `total_leaf_slots = 2`, `informative_leaf_slots = 2` → `D = 1.0`

**Example 2:**

```jsonc
"C": {
  "lead": [123, "Иван", null],
  "meta": { "city": "Москва", "comment": "" }
}
```

Leaf values (assuming Unicode strings count as a single leaf each):

- `123`, `"Иван"`, `null`, `"Москва"`, `""` → `total_leaf_slots = 5`  
- Informative: `123`, `"Иван"`, `"Москва"` → `informative_leaf_slots = 3`  
- `D = 3 / 5 = 0.6`

---

## 5. Meaning Block (M) — Optional but Recommended

`M` encodes the **cognitive contract** for an LLM/agent: role, goal, intended action, rules, and constraints.

```jsonc
"M": {
  "role": "offer_eval",
  "priority": 0.8,
  "action": "interpret",
  "goal": "Select the best option and explain it to the user.",
  "rules": [
    "Answer in Russian.",
    "Do not invent missing offers."
  ],
  "constraints": [
    "If data is insufficient, say so explicitly."
  ]
}
```

### 5.1. Fields

- `role` (string)  
  Semantic role of this packet in the system, e.g. `"offer_eval"`, `"dialog_step"`, `"solar_train"`, `"crm_update"`.

- `priority` (number in [0,1], optional)  
  Scheduling/importance hint.

- `action` (string)  
  High-level action: `"interpret"`, `"train"`, `"update"`, `"classify"`, `"route"`, etc.

- `goal` (string)  
  Human-readable description of the target outcome.

- `rules` (array of strings, optional)  
  Behavioral instructions / soft constraints.

- `constraints` (array of strings, optional)  
  Hard limitations (what MUST NOT be done).

### 5.2. Core position of M

- Core 1.1 defines `M` as **optional**, but:
  - LLM-facing packets SHOULD include a meaningful `M`.  
  - Infrastructure MAY use `M` to route packets to appropriate agents/tools.

---

## 6. Structure Block (S) — Optional

`S` describes **tree/graph structure** of elements inside `C`.

Core does not enforce a specific schema beyond:

- `S` MUST be an array if present.  
- Its elements SHOULD be JSON objects with stable keys within a given profile.

---

## 7. Relations Block (R) — Optional

`R` contains **external relations and links** and MUST be an object if present.

Common usages:

- Linking dialogue steps,  
- Linking packets to external systems (CRM IDs, order IDs),  
- Building reasoning graphs.

---

## 8. Extension Block (_ext)

`_ext` is the **primary extension point** in HF-CORTEX Core.

Core rules:

- Implementations MUST ignore unknown `_ext` keys they do not understand.  
- Reserved extension namespaces (recommended):
  - `_ext.security` — signatures, encryption, ACLs.  
  - `_ext.domain` — profile identifiers and domain-level metadata.  
  - `_ext.metrics` — non-core metrics (E, S, U, etc.).  
  - `_ext.vendor` — implementation-specific information.

### 8.1. Vendor namespace conventions

To avoid collisions between different vendors, it is RECOMMENDED that `_ext.vendor` keys use reverse-DNS style or similarly namespaced identifiers, for example:

```jsonc
"_ext": {
  "vendor": {
    "com.rozatti.legacy_id": "LD-99128",
    "io.hf.cortex.impl": "hf-cortex-nodejs-0.3.1"
  }
}
```

Vendors SHOULD avoid generic keys like `"data"` or `"meta"` at the top level of `_ext.vendor`.

---

## 9. Serialization

HF-CORTEX Core is **serialization-agnostic**.  
Typical encodings:

- JSON / JSONL (for LLM interfacing, logs, datasets),  
- MessagePack / CBOR (for internal storage and transport),  
- Embedding into higher-level protocols (HTTP, gRPC, MCP, etc.).

For interaction with LLMs:

- JSON with compact separators is RECOMMENDED.  
- Keys SHOULD be stable and, where appropriate, short.

---

## 10. Compliance

An implementation is HF-CORTEX Core 1.1 compliant if:

1. It produces packets with:
   - `ver = "hf-cortex-core-1.1"`,  
   - valid `id` and `dom`,  
   - `H` containing numeric `L` and `D`,  
   - `C` as JSON object,  
   - optional `M`, `S`, `R`, `_ext`.

2. It computes `L` and `D` in a way that:
   - respects the RECOMMENDED definitions (or provides documented alternatives),  
   - is consistent within the same domain/profile.

3. It ignores unknown fields in `_ext` safely.

Formal domain profiles (e.g. `HF-CORTEX-Sales-Rozatti-1.0`) MAY add additional constraints for specific use cases.

---

## 11. Versioning and Published Documents

The `ver` field is used for routing, parsing and compatibility checks.

- Minor updates to this document (clarifications, examples, non-breaking additions) do NOT change `ver` as long as the wire format is unchanged.  
- A change of the `ver` string (e.g. to `"hf-cortex-core-1.2"` or `"hf-cortex-core-2.0"`) indicates a new wire-level version.

Recommended policy:

- `1.x → 1.y` (minor) — SHOULD be backward compatible; new fields MUST be optional or in `_ext`.  
- `1.x → 2.0` (major) — MAY introduce breaking changes; parsers MUST NOT assume compatibility without explicit migration logic.

### 11.1. Published versions (as of 2025-11-25)

| Document                              | Spec version | Wire `ver`                | Status  |
|---------------------------------------|--------------|---------------------------|---------|
| HF-CORTEX Core                        | 1.1          | `hf-cortex-core-1.1`      | Stable  |
| HF-CORTEX Error Packet                | 1.0          | `hf-cortex-error-1.0`     | Stable  |
| HF-CORTEX Sales Profile: Rozatti      | 1.0          | — (uses Core 1.1)         | Stable  |

Implementations MAY support multiple Core versions in parallel, and SHOULD route/parse based on `ver`.

---

End of HF-CORTEX Core Protocol 1.1 (Stable).
