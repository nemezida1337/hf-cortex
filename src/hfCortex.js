// src/hfCortex.js
// HF-CORTEX Core 1.1 + Sales-Rozatti 1.0 (reference JS helpers)

import crypto from "crypto";

/**
 * Каноническая оценка заголовка H (L и D) по содержимому C.
 * L: round(log2(N)), где N — байты UTF-8 compact JSON
 * D: упрощённый fallback — доля ненулевых полей верхнего уровня C
 */
export function computeHeaderFromContent(content) {
  const C = content ?? {};
  const json = JSON.stringify(C); // compact JSON по умолчанию
  const bytes = Buffer.byteLength(json, "utf8");
  const N = Math.max(bytes, 1);

  const L = Math.round(Math.log2(N));

  const keys = Object.keys(C);
  let D = 0;
  if (keys.length > 0) {
    const nonNull = keys.filter((k) => C[k] !== null && C[k] !== undefined).length;
    D = nonNull / keys.length;
  }

  return { L, D };
}

/**
 * Базовый конструктор HF-CORTEX Core 1.1 пакета.
 * Ничего доменного, только Core.
 */
export function makeCorePacket({
  ver = "hf-cortex-core-1.1",
  id,
  dom = "generic",
  H,
  C = {},
  M,
  S,
  R,
  ext,
} = {}) {
  // Заголовок: если не передан — считаем по C
  const baseHeader = H && Object.keys(H).length ? { ...H } : computeHeaderFromContent(C);

  if (typeof baseHeader.L !== "number") {
    const { L } = computeHeaderFromContent(C);
    baseHeader.L = L;
  }
  if (typeof baseHeader.D !== "number") {
    const { D } = computeHeaderFromContent(C);
    baseHeader.D = D;
  }

  const packet = {
    ver,
    id: id ?? `cortex_${crypto.randomUUID()}`,
    dom,
    H: baseHeader,
    C,
  };

  if (M) packet.M = M;
  if (S) packet.S = S;
  if (R) packet.R = R;
  if (ext) packet._ext = ext;

  return packet;
}

/**
 * HF-CORTEX Sales Profile: Rozatti 1.0 (Stable)
 * Формат:
 *   C.oem: string
 *   C.lead: [full_name, phone_e164, city, comment, source]
 *   C.offers: [ [supplier_label, price_rub, delivery_days, description], ... ]
 *   C.meta: optional object
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

  if (meta && typeof meta === "object") {
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
    role: "offer_eval",
    action: "interpret",
    goal: "Объяснить варианты и рекомендовать лучший по цене и сроку поставки.",
    rules: [
      "Отвечай на русском языке.",
      "Используй только офферы из C.offers.",
      "Не указывай названия складов и брендов, если их нет в данных.",
    ],
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
    ver: "hf-cortex-core-1.1",
    id,
    dom: "sales.rozatti",
    H,
    C,
    M,
  });
}

/**
 * Лёгкая валидация Core пакета.
 */
export function validateCorePacket(packet) {
  const errors = [];

  if (!packet || typeof packet !== "object") {
    errors.push("packet must be an object");
    return errors;
  }

  if (packet.ver !== "hf-cortex-core-1.1") {
    errors.push(`ver must be 'hf-cortex-core-1.1', got ${JSON.stringify(packet.ver)}`);
  }
  if (typeof packet.id !== "string") errors.push("id must be string");
  if (typeof packet.dom !== "string") errors.push("dom must be string");

  if (!packet.H || typeof packet.H !== "object") {
    errors.push("H (header) is required and must be object");
  } else {
    if (typeof packet.H.L !== "number") errors.push("H.L must be number");
    if (typeof packet.H.D !== "number") {
      errors.push("H.D must be number");
    } else if (packet.H.D < 0 || packet.H.D > 1) {
      errors.push("H.D must be in [0,1]");
    }
  }

  if (!packet.C || typeof packet.C !== "object") {
    errors.push("C (content) is required and must be object");
  }

  return errors;
}

/**
 * Валидация Rozatti профиля поверх Core.
 */
export function validateRozattiPacket(packet) {
  const errors = [...validateCorePacket(packet)];

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
    errors.push("C.lead must be array of length 5");
  }

  if (!Array.isArray(C.offers)) {
    errors.push("C.offers must be an array (possibly empty)");
  } else {
    C.offers.forEach((o, idx) => {
      if (!Array.isArray(o) || o.length !== 4) {
        errors.push(`C.offers[${idx}] must be array of length 4`);
        return;
      }
      const [supplier_label, price_rub, delivery_days, description] = o;
      if (typeof supplier_label !== "string") {
        errors.push(`C.offers[${idx}][0] (supplier_label) must be string`);
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

  return errors;
}
