# HF‑CORTEX — Open Cognitive Packet Protocol  
**Version:** 1.0 (Stable)  
**Author:** Mozhanov Aleksandr Mikhaylovich  
**Repository:** https://github.com/nemezida1337/hf-cortex  

---

## 🔥 What is HF‑CORTEX?

HF‑CORTEX is an **open standard** for structured cognitive packets designed for LLM‑agents, reasoning systems and production AI pipelines.

It solves the core problem of modern LLM architectures:

> **LLMs need structured, deterministic, context‑aware packets — not raw text.**

HF‑CORTEX provides that structure through a minimal **Core**, domain‑specific **Profiles**, and universal **Error Packets**.

The protocol is already used in production (Rozatti automotive sales bot).

---

## 📦 HF‑CORTEX Components

### 1. **Core Protocol 1.1 (Stable)**
Defines the universal packet:

- `H` — header with scale (`L`) and density (`D`)
- `C` — content (domain data)
- `M` — meaning / cognitive contract
- `S` — structure tree
- `R` — relations
- `_ext` — extensions

📄 Spec: `spec/HF-CORTEX-Core-1.1-Stable.md`

---

### 2. **Error Packet 1.0 (Stable)**  
Uniform error format for all agents and tools:

- machine-readable error codes  
- human-readable explanation  
- recovery hints (`retry`, `suggested_fix`)  
- vendor extension namespace  

📄 Spec: `spec/HF-CORTEX-ERROR-1.0-Stable.md`

---

### 3. **Sales Profile: Rozatti 1.0 (Stable)**  
Domain specification used by the production auto‑parts sales bot.

Defines:

- OEM routing  
- strict offer tuples  
- strict lead tuples  
- zero hallucination policy  
- explicit rule for empty offers  

📄 Spec: `spec/HF-CORTEX-Sales-Rozatti-1.0-Stable.md`

---

## 🧠 Why HF‑CORTEX?

### ✓ Designed for LLM‑agents  
Clear roles, goals, constraints (`M` block).

### ✓ Zero‑hallucination profiles  
Perfect for sales, CRM, medical and legal systems.

### ✓ Deterministic Header  
`L` and `D` metrics give instant signal of packet size + information density.

### ✓ Extensible  
Through `_ext.domain`, `_ext.metrics`, `_ext.vendor`.

### ✓ Wire‑compatible and future‑proof  
Like protobuf / JSON‑RPC / MCP, but tailored for LLMs.

---

## 📊 Packet Example

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
    ]
  },

  "_ext": {
    "domain": {
      "profile": "hf-cortex-sales-rozatti-1.0"
    }
  }
}
```

---

## 🚀 Roadmap

### HF‑CORTEX 1.x  
- Reference Python SDK  
- MessagePack binary schema  
- Fuzz‑validator  
- Domain profiles: dialogs, support, solar, CRM

### HF‑CORTEX 2.0  
- Multi‑packet reasoning flows  
- Incremental graph‑context  
- Advanced hyperfractal metrics (E, S, U)

---

## 📄 License

MIT License — open and free for commercial use.

---

## 🧬 Status

HF‑CORTEX is actively evolving and has already passed:  
✔ Production testing  
✔ Independent LLM code reviews (Grok, DeepSeek)  
✔ Stability freeze for 1.0 Core, Error, Rozatti profiles  

---

## ✉ Contact

**Author:**  
Mozhanov Aleksandr Mikhaylovich  
Republic of Belarus  
Email: mozhanovsasha@gmail.com

---

This repository contains the **official reference specifications** of the HF‑CORTEX protocol.  
Use it to build **deterministic, structured, production‑grade LLM‑agents**.
