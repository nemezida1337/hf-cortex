# HF-CORTEX Sales Profile: Rozatti 1.0 (Stable)

Author: Mozhanov Aleksandr Mikhaylovich  
Status: Stable  
Date: 2025-11-25  
Repository: https://github.com/nemezida1337/hf-cortex  

---

## 1. Overview

The **HF-CORTEX Sales Profile: Rozatti 1.0 (Stable)** defines a strict, production-ready schema and behavioral rules for LLM agents that handle **OEM-based automotive parts selection** for Rozatti.

It extends **HF-CORTEX Core 1.1** and specifies:

- the structure of `C.lead` and `C.offers`,
- allowed and forbidden model behaviors,
- constraints ensuring no hallucinations or invented offers,
- domain routing identifiers,
- compliance rules for sales bots.

This profile is already used in production.

---

## 2. Activation (Domain Identification)

A packet MUST explicitly declare the domain profile:

```jsonc
"_ext": {
  "domain": {
    "profile": "hf-cortex-sales-rozatti-1.0"
  }
}
```

If this field is absent, validators MUST NOT apply Rozatti rules.

---

## 3. Packet Structure

A Rozatti sales packet extending HF-CORTEX Core:

```jsonc
{
  "ver": "hf-cortex-core-1.1",
  "id": "uuid",
  "dom": "sales.rozatti",

  "H": { ... },
  "M": { ... },

  "C": {
    "lead": [...],
    "offers": [...],
    "oem": "string",
    "meta": {}
  },

  "_ext": {
    "domain": {
      "profile": "hf-cortex-sales-rozatti-1.0"
    }
  }
}
```

---

## 4. Content Block (C)

### 4.1. Field `C.oem`

- MUST be a valid OEM string supplied by the external system.
- LLM MUST NOT modify, reformat or infer OEMs.
- LLM MUST use this field as the central reference.

### 4.2. Field `C.lead` (tuple)

`C.lead` MUST be a fixed-length tuple of **exactly 5 elements**:

```jsonc
"lead": [
  full_name,        // string or empty
  phone_e164,       // string or empty
  city,             // string or empty
  comment,          // string or empty
  source            // string or empty
]
```

Rules:

- The order MUST NOT change.
- Keys MUST NOT be added.
- Empty fields MUST be retained as empty strings or nulls.
- LLM MUST NOT rewrite phone numbers other than simple E.164 formatting.

### 4.3. Field `C.offers` (array of tuples)

`C.offers` MUST be an array. Each element MUST be a **tuple of exactly 4 fields**:

```jsonc
[
  supplier_label,   // short string ("1", "2", "3", etc.)
  price_rub,        // number
  delivery_days,    // integer
  description       // short label; MUST NOT contain supplier names
]
```

Rules:

- LLM MUST NOT invent suppliers, prices, terms or glosses.
- LLM MUST NOT mention warehouse names or brands not listed here.
- All output MUST originate from the items present in `C.offers`.
- If `C.offers` is an empty array, the model MUST explicitly state that **no offers are available**.

### Important Clarification (added in 1.0.1 Stable)

If `offers = []`, this is an **explicit semantic signal** that:

- No options exist.
- The model MUST NOT invent any offer.
- The model MUST state clearly: *“По вашему запросу предложений нет.”* (or similar phrasing in Russian).

---

## 5. Meaning Block (M)

Rozatti strongly RECOMMENDS providing:

```jsonc
"M": {
  "role": "offer_eval",
  "action": "interpret",
  "goal": "Explain the offers to the customer and recommend the best one.",
  "rules": [
    "Answer in Russian.",
    "Do not invent missing offers.",
    "Use only offers listed in C.offers."
  ],
  "constraints": [
    "Do not modify OEM.",
    "Do not create offers.",
    "Do not reference suppliers directly."
  ]
}
```

---

## 6. Prohibited Behaviors (MUST NOT)

LLM MUST NOT:

- invent any offers,
- invent delivery dates,
- invent suppliers or warehouses,
- mention warehouse names (“MB Dealer”, “DK MB”, etc.),
- fabricate availability,
- rewrite OEMs,
- guess missing fields,
- output any offer not in `C.offers`,
- rely on external knowledge about Mercedes/BMW/etc.

All reasoning MUST be confined strictly to `C.offers`.

---

## 7. Required Behaviors (MUST)

LLM MUST:

- use only provided offers,
- explicitly state when `offers = []`,
- keep responses concise, accurate and in Russian,
- preserve original OEM,
- select best offer using only `price_rub` + `delivery_days`,
- reflect customer data from `lead` without altering meaning.

---

## 8. Optional Metadata (C.meta)

`C.meta` MAY contain auxiliary fields:

```jsonc
"meta": {
  "city": "Москва",
  "urgency": "high",
  "repeat_request": false
}
```

LLM MUST NOT hallucinate meta fields.

---

## 9. `_ext.vendor` Extensions

Vendors MAY attach additional data:

```jsonc
"_ext": {
  "domain": {
    "profile": "hf-cortex-sales-rozatti-1.0"
  },
  "vendor": {
    "com.rozatti.session": "chat001",
    "com.rozatti.abcp.raw": {}
  }
}
```

Reverse-DNS is RECOMMENDED.

---

## 10. Compliance Criteria

A packet complies with Rozatti Profile 1.0 if:

1. `_ext.domain.profile == "hf-cortex-sales-rozatti-1.0"`
2. `C.lead` is exactly 5-element tuple.
3. `C.offers` is an array of 4-element tuples.
4. No invented fields appear in `C`.
5. LLM output obeys all “MUST” and avoids all “MUST NOT”.

---

## 11. Versioning

- This is **Stable 1.0**.  
- Minor text clarifications do NOT change profile identifier.
- Breaking changes will produce `"hf-cortex-sales-rozatti-2.0"`.

---

## 12. Example

```jsonc
{
  "ver": "hf-cortex-core-1.1",
  "id": "pkt-002",
  "dom": "sales.rozatti",

  "H": { "L": 7, "D": 0.7 },

  "C": {
    "oem": "A2128300318",
    "lead": ["Иван Петров", "+79031234567", "Москва", "", "whatsapp"],
    "offers": [
      ["1", 8100, 18, "вариант 1"],
      ["2", 9700, 7, "вариант 2"]
    ],
    "meta": { "city": "Москва" }
  },

  "_ext": {
    "domain": {
      "profile": "hf-cortex-sales-rozatti-1.0"
    }
  }
}
```

---

End of HF-CORTEX Sales Profile: Rozatti 1.0 (Stable).