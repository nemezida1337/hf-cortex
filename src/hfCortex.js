// src/hfCortex.js
// HF-CORTEX Core 1.1 + Sales-Rozatti 1.0 (reference JS helpers)

/**
 * Версия протокола HF-CORTEX Core, которая уходит в поле `ver`.
 * Версия npm-пакета может отличаться (патч-версии SDK).
 */
export const HF_CORTEX_VERSION = "hf-cortex-core-1.1";

/**
 * Публичная ссылка на спецификацию протокола.
 * Очень полезно в логах, сообщениях об ошибках и README.
 */
export const HF_CORTEX_SPEC_URL =
  "https://github.com/nemezida1337/hf-cortex/blob/main/spec/HF-CORTEX-Core-1.1-Stable.md";

/**
 * Вспомогательный расчёт размера JSON в байтах UTF-8.
 * Пытаемся быть кросс-рантаймовыми:
 *  - Node: Buffer.byteLength
 *  - Браузер / Deno / Bun: TextEncoder
 *  - Фоллбэк: длина строки (приближение)
 */
function utf8ByteLength(str) {
  if (typeof Buffer !== "undefined" && Buffer.byteLength) {
    return Buffer.byteLength(str, "utf8");
  }
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str).length;
  }
  // Фоллбэк — не идеально, но лучше, чем 0
  return str.length;
}

/**
 * Каноническая оценка заголовка H (L и D) по содержимому C.
 *  - L: round(log2(N)), где N — размер compact JSON в байтах (UTF-8)
 *  - D: доля «ненулевых» полей верхнего уровня C в диапазоне [0,1]
 *
 * Пустыми считаются:
 *  - null / undefined
 *  - пустые строки / строки из пробелов
 *  - пустые массивы
 *  - пустые объекты
 */
export function computeHeaderFromContent(content) {
  const C = content ?? {};
  const json = JSON.stringify(C); // compact JSON по умолчанию
  const bytes = utf8ByteLength(json);
  const N = Math.max(bytes, 1);

  const L = Math.round(Math.log2(N));

  const keys = Object.keys(C);
  let D = 0;
  if (keys.length > 0) {
    let nonEmpty = 0;
    for (const k of keys) {
      const v = C[k];
      if (v === null || v === undefined) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
      nonEmpty++;
    }
    D = nonEmpty / keys.length;
  }

  return { L, D };
}

/**
 * Нестрогий, но кросс-платформенный генератор id.
 * Подходит для браузера/Node/Bun/Deno без crypto.
 */
export function makeCortexId() {
  return `cortex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Опциональный детерминированный id по (H,C).
 * Удобен для тестов/реплеев; не криптографический хэш.
 */
export function makeDeterministicCortexId(H, C) {
  const src = JSON.stringify({ H: H ?? null, C: C ?? null });
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
  }
  return `cortex_${hash.toString(36)}`;
}

/**
 * Базовый конструктор HF-CORTEX Core пакета.
 *
 * Поля:
 *  - ver: версия протокола (по умолчанию HF_CORTEX_VERSION)
 *  - id: строковый идентификатор пакета (если не задан — генерируется)
 *  - dom: логический домен (например, "sales.rozatti")
 *  - H: заголовок; если не задан, вычисляется по C через computeHeaderFromContent
 *  - C: основное содержимое (обязательное)
 *  - M: meaning / семантический слой (опционально)
 *  - S: source / информация об источнике (опционально)
 *  - R: reserved / дополнительные данные (опционально)
 *  - ext: будет сохранён в packet._ext (опционально)
 */
export function makeCorePacket({
  ver = HF_CORTEX_VERSION,
  id,
  dom = "generic",
  H,
  C = {},
  M,
  S,
  R,
  ext,
} = {}) {
  const Cobj = C ?? {};

  // Заголовок: если не передан — считаем по C
  const baseHeader =
    H && typeof H === "object" && Object.keys(H).length > 0
      ? { ...H }
      : computeHeaderFromContent(Cobj);

  // Гарантируем наличие L и D
  if (typeof baseHeader.L !== "number") {
    const { L } = computeHeaderFromContent(Cobj);
    baseHeader.L = L;
  }
  if (typeof baseHeader.D !== "number") {
    const { D } = computeHeaderFromContent(Cobj);
    baseHeader.D = D;
  }

  const packet = {
    ver,
    id: id ?? makeCortexId(),
    dom,
    H: baseHeader,
    C: Cobj,
  };

  if (M !== undefined) packet.M = M;
  if (S !== undefined) packet.S = S;
  if (R !== undefined) packet.R = R;
  if (ext !== undefined) packet._ext = ext;

  return packet;
}

/**
 * Лёгкая валидация Core-пакета.
 *
 * В обычном режиме проверяет обязательные поля и базовую структуру.
 * В strict-режиме дополнительно запрещает лишние поля, не входящие в
 * официальное ядро [ver,id,dom,H,C,M,S,R,_ext].
 */
export function validateCorePacket(packet, { strict = false } = {}) {
  const errors = [];

  if (!packet || typeof packet !== "object") {
    errors.push("packet must be an object");
    return errors;
  }

  const required = ["ver", "id", "dom", "H", "C"];
  for (const field of required) {
    if (!(field in packet)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (packet.H && typeof packet.H !== "object") {
    errors.push("H must be an object");
  }
  if (packet.C && typeof packet.C !== "object") {
    errors.push("C must be an object");
  }

  if (strict) {
    const allowed = new Set(["ver", "id", "dom", "H", "C", "M", "S", "R", "_ext"]);
    for (const key of Object.keys(packet)) {
      if (!allowed.has(key)) {
        errors.push(`Forbidden field: ${key}`);
      }
    }
  }

  return errors;
}

/**
 * HF-CORTEX Sales Profile: Rozatti 1.0 (Stable)
 *
 * Формат C:
 *   C.oem: string
 *   C.lead: [full_name, phone_e164, city, comment, source]
 *   C.offers: [ [supplier_label, price_rub, delivery_days, description], ... ]
 *   C.meta: optional object
 *
 * meaning: поверхностный слой M с подсказками для LLM.
 */
export function makeRozattiSalesPacket({
  id,
  oem,
  lead,
  offers,
  meta,
  meaning,
  header,
} = {}) {
  if (!oem) {
    throw new Error("makeRozattiSalesPacket: oem is required");
  }
  if (!Array.isArray(lead) || lead.length !== 5) {
    throw new Error("makeRozattiSalesPacket: lead must be array of length 5");
  }
  if (!Array.isArray(offers)) {
    throw new Error("makeRozattiSalesPacket: offers must be an array (possibly empty)");
  }

  const C = {
    oem,
    lead,
    offers,
  };

  if (meta !== undefined) {
    C.meta = meta;
  }

  // Встраиваем профиль в H._ext.domain.profile
  const H = {
    ...(header ?? {}),
  };

  const hExt = { ...(H._ext ?? {}) };
  hExt.domain = {
    ...(hExt.domain ?? {}),
    profile: "hf-cortex-sales-rozatti-1.0",
  };
  H._ext = hExt;

  const defaultMeaning = {
    role: "sales_agent",
    locale: "ru-RU",
    description:
      "Ответ менеджера по автозапчастям Rozatti на основе заранее вычисленных офферов.",
    constraints: [
      "Не придумывай новые офферы.",
      "Не изменяй OEM.",
      "Если offers пустой массив — честно скажи, что предложений нет.",
    ],
  };

  const M = {
    ...defaultMeaning,
    ...(meaning ?? {}),
  };

  return makeCorePacket({
    ver: HF_CORTEX_VERSION,
    id,
    dom: "sales.rozatti",
    H,
    C,
    M,
  });
}

/**
 * Валидация Rozatti Sales профиля поверх Core.
 *
 * strict === true:
 *   - запрещает любые лишние поля в C, кроме [oem,lead,offers,meta]
 */
export function validateRozattiPacket(packet, { strict = false } = {}) {
  const errors = [...validateCorePacket(packet, { strict })];

  if (packet.dom !== "sales.rozatti") {
    errors.push(`dom must be 'sales.rozatti', got ${JSON.stringify(packet.dom)}`);
  }

  const H = packet.H ?? {};
  const ext = H._ext ?? {};
  const domain = ext.domain ?? {};
  if (domain.profile !== "hf-cortex-sales-rozatti-1.0") {
    errors.push(
      `_ext.domain.profile must be 'hf-cortex-sales-rozatti-1.0', got ${JSON.stringify(
        domain.profile,
      )}`,
    );
  }

  const C = packet.C ?? {};
  if (typeof C.oem !== "string" || !C.oem) {
    errors.push("C.oem must be non-empty string");
  }

  if (!Array.isArray(C.lead) || C.lead.length !== 5) {
    errors.push("C.lead must be array[5]");
  } else {
    const [fullName, phone, city, comment, source] = C.lead;
    if (typeof fullName !== "string" || !fullName.trim()) {
      errors.push("C.lead[0] (full_name) must be non-empty string");
    }
    if (typeof phone !== "string" || !phone.trim()) {
      errors.push("C.lead[1] (phone_e164) must be non-empty string");
    }
    if (typeof city !== "string") {
      errors.push("C.lead[2] (city) must be string");
    }
    if (typeof comment !== "string") {
      errors.push("C.lead[3] (comment) must be string");
    }
    if (typeof source !== "string" || !source.trim()) {
      errors.push("C.lead[4] (source) must be non-empty string");
    }
  }

  if (!Array.isArray(C.offers)) {
    errors.push("C.offers must be an array");
  } else {
    C.offers.forEach((offer, idx) => {
      if (!Array.isArray(offer) || offer.length !== 4) {
        errors.push(`C.offers[${idx}] must be array[4]`);
        return;
      }
      const [supplier_label, price_rub, delivery_days, description] = offer;
      if (typeof supplier_label !== "string" || !supplier_label.trim()) {
        errors.push(`C.offers[${idx}][0] (supplier_label) must be non-empty string`);
      }
      if (typeof price_rub !== "number") {
        errors.push(`C.offers[${idx}][1] (price_rub) must be number`);
      }
      if (!Number.isFinite(delivery_days)) {
        errors.push(`C.offers[${idx}][2] (delivery_days) must be finite number`);
      }
      if (typeof description !== "string") {
        errors.push(`C.offers[${idx}][3] (description) must be string`);
      }
    });
  }

  if (C.meta !== undefined && (typeof C.meta !== "object" || Array.isArray(C.meta))) {
    errors.push("C.meta must be an object if present");
  }

  if (strict) {
    const allowedC = new Set(["oem", "lead", "offers", "meta"]);
    for (const key of Object.keys(C)) {
      if (!allowedC.has(key)) {
        errors.push(`Forbidden C field for Rozatti profile: ${key}`);
      }
    }
  }

  return errors;
}

/**
 * Готовый промпт-шаблон для LLM (Grok/Claude/Gemini и т.п.)
 * на основе уже собранного HF-CORTEX Rozatti пакета.
 */
export function rozattiPromptTemplate(packet) {
  const json = JSON.stringify(packet, null, 2);
  return `Ты — эксперт по автозапчастям Rozatti.
Отвечай ТОЛЬКО на основе следующего HF-CORTEX пакета. 
Не добавляй ничего от себя.

Пакет:
${json}

Ответь клиенту на русском языке, используя ТОЛЬКО данные из C.offers.
Если offers пустой — честно скажи, что предложений нет.`;
}

/**
 * Магический хелпер: парсит JSON-вывод LLM, валидирует его
 * как HF-CORTEX пакет и либо кидает одну жёсткую ошибку, либо
 * возвращает уже проверенный объект.
 *
 * profile:
 *  - "rozatti"  -> validateRozattiPacket(strict=true)
 *  - "core"     -> validateCorePacket(strict=true)
 */
export function enforceCortex(output, profile = "rozatti") {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("LLM did not return valid JSON");
  }

  let validator;
  switch (profile) {
    case "rozatti":
      validator = validateRozattiPacket;
      break;
    case "core":
      validator = validateCorePacket;
      break;
    default:
      throw new Error(`Unknown HF-CORTEX profile: ${profile}`);
  }

  const errors = validator(parsed, { strict: true });
  if (errors.length > 0) {
    throw new Error(
      `HF-CORTEX validation failed:\n${errors.join("\n")}\nSpec: ${HF_CORTEX_SPEC_URL}`,
    );
  }

  return parsed;
}

/**
 * Удобный namespace-экспорт для Rozatti-профиля.
 *
 * Пример использования:
 *   import { Rozatti } from "hf-cortex";
 *   const packet = Rozatti.make({ oem, lead, offers });
 *   const prompt = Rozatti.prompt(packet);
 */
export const Rozatti = {
  make: makeRozattiSalesPacket,
  validate: validateRozattiPacket,
  prompt: rozattiPromptTemplate,
  profile: "hf-cortex-sales-rozatti-1.0",
};
