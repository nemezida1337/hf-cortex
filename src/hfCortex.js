// src/hfCortex.js
// HF-CORTEX Protocol v1.0 — ядро для Node.js (ESM)

import crypto from "crypto";

/**
 * Простейшая оценка фрактального слоя и плотности по содержимому.
 * Это можно будет заменить более умной метрикой.
 */
export function estimateHeaderFromContent(content) {
  const json = JSON.stringify(content ?? {});
  const len = Math.max(json.length, 1);

  const L = Math.round(Math.log2(len));        // логарифмический масштаб
  const D = Math.min(1, Math.max(0.4, len / 2000)); // грубая оценка плотности

  return { L, D };
}

/**
 * Конструктор базового HF-CORTEX пакета.
 */
export function makeCortexPacket({
  ver = "hf-cortex-1.0",
  id = null,
  dom = "generic",
  header = {},
  content = {},
  structure = [],
  relations = {},
  meaning = {},
}) {
  const baseHeader = {
    L: 0,
    E: 0,
    D: 0.7,
    T: "auto",
    S: 0.9,
    U: 0.1,
    tags: [],
  };

  // если явный header не передан — оценим по content
  let H;
  if (!header || Object.keys(header).length === 0) {
    const { L, D } = estimateHeaderFromContent(content);
    H = { ...baseHeader, L, D };
  } else {
    H = { ...baseHeader, ...header };
  }

  const M = {
    role: "generic",
    priority: 0.5,
    action: "interpret",
    goal: "",
    rules: [],
    constraints: [],
    ...meaning,
  };

  const packet = {
    ver,
    id: id ?? "cortex_" + crypto.randomUUID(),
    dom,
    H,
    S: structure,
    C: content,
    R: relations,
    M,
  };

  return packet;
}

/**
 * Специализированный хелпер: лид + офферы (кейс Rozatti).
 * Это пример доменного профиля, позже можно вынести в "дескрипторы".
 */
export function makeLeadOffersPacket({
  dom = "bot.rozatti",
  lead,
  offers,
  goal = "Выбрать лучший вариант по OEM и объяснить клиенту.",
  tags = [],
  extraHeader = {},
  extraMeaning = {},
}) {
  if (!lead) throw new Error("makeLeadOffersPacket: lead is required");
  if (!Array.isArray(offers)) throw new Error("makeLeadOffersPacket: offers must be array");

  const content = {
    lead: [
      lead.id ?? null,
      lead.name ?? null,
      lead.phone ?? null,
      lead.city ?? null,
      lead.carLabel ?? null,
      lead.vin ?? null,
    ],
    offers: offers.map((o) => [
      o.oem ?? null,
      o.brandCode ?? null,
      o.priceRub ?? null,
      o.deliveryDays ?? null,
    ]),
  };

  const structure = [
    { id: "root", children: ["lead", "offers"], role: "context" },
    { id: "lead", children: [], role: "actor" },
    { id: "offers", children: [], role: "options" },
  ];

  const relations = {
    refs: {
      bitrix_lead_id: lead.id ?? null,
    },
  };

  const header = {
    T: "f-lead+offers",
    tags: ["lead", "offers", ...(tags ?? [])],
    ...extraHeader,
  };

  const meaning = {
    role: "offer_eval",
    priority: 0.8,
    action: "interpret",
    goal,
    rules: [
      "Отвечай на русском языке.",
      "Не указывай название склада и наличие, только цену и срок.",
      "Не выдумывай цены и сроки.",
    ],
    constraints: [
      "Если данных недостаточно — честно скажи об этом.",
    ],
    ...extraMeaning,
  };

  return makeCortexPacket({
    dom,
    header,
    content,
    structure,
    relations,
    meaning,
  });
}

/**
 * Утилита: валидация базовой формы HF-CORTEX пакета.
 * Очень лёгкая, без жёсткой схемы — пригодится для логов/тестов.
 */
export function validateCortexPacket(packet) {
  const errors = [];

  if (!packet || typeof packet !== "object") {
    errors.push("packet must be an object");
    return errors;
  }
  if (typeof packet.ver !== "string") errors.push("ver must be string");
  if (typeof packet.id !== "string") errors.push("id must be string");
  if (typeof packet.dom !== "string") errors.push("dom must be string");
  if (!packet.H || typeof packet.H !== "object") errors.push("H (header) is required");
  if (!("C" in packet)) errors.push("C (content) is required");
  if (!("M" in packet)) errors.push("M (meaning) is required");

  return errors;
}
