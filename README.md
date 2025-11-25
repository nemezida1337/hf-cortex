# hf-cortex · Official HF-CORTEX Core 1.1 SDK  
[![npm](https://img.shields.io/npm/v/hf-cortex)](https://npmjs.com/package/hf-cortex)

**The protocol that killed LLM hallucinations** — now with an official JavaScript SDK.

This package implements:

- **HF-CORTEX Core 1.1** — a base cognitive packet protocol for LLM agents  
- **Rozatti Sales Profile 1.0** — a production profile for OEM auto parts selection  
- **enforceCortex()** — a strict LLM output validator (zero-hallucination)

---

Русская версия ниже 👇

Этот пакет реализует:

- **HF-CORTEX Core 1.1** — базовый когнитивный пакет для LLM-агентов  
- **Rozatti Sales Profile 1.0** — боевой профиль для подбора автозапчастей по OEM  
- **enforceCortex()** — жёсткий валидатор вывода LLM (zero-hallucination)

---

## 🚀 Installation

```bash
npm install hf-cortex
# или
pnpm add hf-cortex
# или
yarn add hf-cortex
```

---

## ⚙ Quick Start · Rozatti Sales Profile

```js
import { Rozatti, enforceCortex } from "hf-cortex";

// 1. Собираем HF-CORTEX пакет для запроса по OEM
const packet = Rozatti.make({
  oem: "A2128300318",
  lead: ["Иван Петров", "+79031234567", "Москва", "", "whatsapp"],
  offers: [
    ["1", 8100, 18, "оригинал"],
    ["2", 9700, 7, "аналог"]
  ]
});

// 2. Генерируем промпт для LLM
const prompt = Rozatti.prompt(packet);

// 3. Отправляем в любую LLM (Grok / Claude / Gemini / OpenAI)
const rawOutput = await llm.call(prompt);

// 4. Жёстко валидируем ответ как HF-CORTEX пакет
const result = enforceCortex(rawOutput, "rozatti");
// Если здесь нет ошибки — галлюцинаций по офферам нет физически
```

---

## 🧠 Core API

```js
import {
  HF_CORTEX_VERSION,
  HF_CORTEX_SPEC_URL,
  computeHeaderFromContent,
  makeCorePacket,
  validateCorePacket,
  enforceCortex,
} from "hf-cortex";
```

### `makeCorePacket(opts)`

Собирает базовый HF-CORTEX пакет:

- автоматически считает `H.L` и `H.D` из `C`, если `H` не задан;
- генерирует `id`, если не передан;
- принимает опциональные `M`, `S`, `R`, `_ext`.

```js
const packet = makeCorePacket({
  dom: "demo.core",
  C: { foo: 1, bar: "abc" },
  M: { role: "demo", goal: "example" },
});
```

### `validateCorePacket(packet, { strict })`

Возвращает массив ошибок (пустой, если всё ок).

- `strict: true` — запрещает любые лишние поля помимо `[ver,id,dom,H,C,M,S,R,_ext]`.

```js
const errors = validateCorePacket(packet, { strict: true });
if (errors.length > 0) {
  console.error("Invalid HF-CORTEX packet:", errors);
}
```

---

## 🧾 Rozatti Profile API

```js
import {
  Rozatti,
  validateRozattiPacket,
} from "hf-cortex";
```

### `Rozatti.make({ oem, lead, offers, meta, meaning, header })`

Построить пакет профиля **Rozatti Sales 1.0**:

- `lead` — строго **5 элементов**:  
  `[full_name, phone_e164, city, comment, source]`
- каждый `offer` — строго **4 элемента**:  
  `[supplier_label, price_rub, delivery_days, description]`
- автоматически прописывает профиль:  
  `H._ext.domain.profile = "hf-cortex-sales-rozatti-1.0"`

```js
const packet = Rozatti.make({
  oem: "A2128300318",
  lead: ["Иван Петров", "+79031234567", "Москва", "", "whatsapp"],
  offers: [
    ["1", 8100, 18, "оригинал"],
    ["2", 9700, 7, "аналог"],
  ],
  meta: { currency: "RUB" },
});
```

### `Rozatti.validate(packet, { strict })`

Строгая проверка, что пакет соответствует профилю:

- `dom` должен быть `"sales.rozatti"`  
- `_ext.domain.profile` — `"hf-cortex-sales-rozatti-1.0"`  
- структура `C.oem`, `C.lead`, `C.offers`, `C.meta` — строго по профилю

```js
const errors = Rozatti.validate(packet, { strict: true });
if (errors.length) {
  throw new Error("Invalid Rozatti packet:
" + errors.join("
"));
}
```

---

## 🛡 `enforceCortex(output, profile = "rozatti")`

Универсальный хелпер для LLM-агентов:

- принимает **строку** (JSON из LLM),
- парсит,
- валидирует как HF-CORTEX пакет (в strict-режиме),
- кидает `Error`, если что-то не так (со ссылкой на спецификацию).

```js
import { enforceCortex } from "hf-cortex";

const rawOutput = await llm.call(prompt);

try {
  const safePacket = enforceCortex(rawOutput, "rozatti");
  // здесь safePacket гарантированно соответствует профилю
} catch (err) {
  console.error("LLM output rejected by HF-CORTEX:", err);
}
```

Profiles:

- `"rozatti"` — профиль Rozatti Sales 1.0  
- `"core"` — чистый HF-CORTEX Core пакет без доменного профиля

---

## 🧩 Creating Your Own HF-CORTEX Profile

HF-CORTEX Core 1.1 задуман как универсальный протокол.  
Профиль Rozatti — лишь первый пример.

Чтобы создать свой профиль:

1. **Определите структуру `C`**  
2. **Выберите домен и профиль**  
3. **Напишите makeProfilePacket()**  
4. **Напишите validateProfilePacket()**  
5. **Опционально — профильный prompt-шаблон**

Профиль Rozatti можно использовать как референс.

---

## 📚 Specs

- **HF-CORTEX Core 1.1 (Stable)** — `spec/HF-CORTEX-Core-1.1-Stable.md`  
- **HF-CORTEX Error Packet 1.0** — `spec/HF-CORTEX-ERROR-1.0-Stable.md`  
- **HF-CORTEX Sales Profile 1.0** — `spec/HF-CORTEX-Sales-Rozatti-1.0-Stable.md`

---

## 📜 License
## 👤 Author / Автор

- Mozhanov Alexander Mikhailovich  
- Можанов Александр Михайлович  
- г. Гомель, Республика Беларусь

MIT — свободно для коммерческого использования.
