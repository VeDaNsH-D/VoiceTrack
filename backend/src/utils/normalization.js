const { FILLER_WORDS, ITEM_MAPPINGS, NUMBER_WORDS } = require("../constants");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceWholeWords(text, replacements) {
  return Object.entries(replacements).reduce((current, [from, to]) => {
    const pattern = new RegExp(`\\b${escapeRegExp(from)}\\b`, "g");
    return current.replace(pattern, to);
  }, text);
}

function preprocessText(text) {
  let normalized = String(text || "").toLowerCase().trim();

  normalized = replaceWholeWords(normalized, NUMBER_WORDS);
  normalized = replaceWholeWords(normalized, ITEM_MAPPINGS);
  normalized = normalized.replace(/\b(rs|rupaye)\b|₹/g, " ");

  for (const filler of FILLER_WORDS) {
    const pattern = new RegExp(`\\b${escapeRegExp(filler)}\\b`, "g");
    normalized = normalized.replace(pattern, " ");
  }

  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

module.exports = {
  preprocessText,
};
