const { FILLER_WORDS, ITEM_MAPPINGS, NUMBER_WORDS } = require("../constants");
const {
  isHindiContent,
  normalizeHindiText,
} = require("../services/hindi-normalization.service");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceWholeWords(text, replacements) {
  return Object.entries(replacements).reduce((current, [from, to]) => {
    const pattern = new RegExp(`\\b${escapeRegExp(from)}\\b`, "g");
    return current.replace(pattern, to);
  }, text);
}

/**
 * FIXED: Preprocessing now includes Hindi normalization
 */
function preprocessText(text) {
  let normalized = String(text || "").toLowerCase().trim();

  // Step 1: If Hindi content detected, use dedicated Hindi normalization
  if (isHindiContent(text)) {
    normalized = normalizeHindiText(text);
  } else {
    // Step 2: Replace number words (Hinglish/English)
    normalized = replaceWholeWords(normalized, NUMBER_WORDS);

    // Step 3: Replace item mappings
    normalized = replaceWholeWords(normalized, ITEM_MAPPINGS);
  }

  // Remove currency markers
  normalized = normalized.replace(/\b(rs|rupaye|रुपये|रुपया|rupee)\b|₹/g, " ");

  // Remove filler words
  for (const filler of FILLER_WORDS) {
    const pattern = new RegExp(`\\b${escapeRegExp(filler)}\\b`, "g");
    normalized = normalized.replace(pattern, " ");
  }

  // Clean up multi-spaces and trim
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

function normalizeItemValue(item) {
  const normalized = preprocessText(String(item || ""));
  return normalized.replace(/\s+/g, " ").trim();
}

function normalizeNumericValue(value) {
  if (typeof value === "number") {
    return value;
  }

  const normalized = preprocessText(String(value || ""));
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

module.exports = {
  preprocessText,
  normalizeItemValue,
  normalizeNumericValue,
};
