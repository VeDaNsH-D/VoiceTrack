const Transaction = require("../models/transaction.model");
const RawLog = require("../models/rawLog.model");
const { processTransactionText } = require("../services/extraction.service");

async function processText(req, res, next) {
  try {
    const { text } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: {
          message: "text is required",
          code: "INVALID_TEXT",
        },
      });
    }

    const { normalizedText, result } = await processTransactionText(text);

    const rawLogPayload = {
      text,
      normalizedText,
      source: "api",
      status: result.meta.needs_clarification ? "clarification" : "processed",
    };

    const transactionPayload = {
      rawText: text,
      normalizedText,
      sales: result.sales,
      expenses: result.expenses,
      meta: {
        confidence: result.meta.confidence,
        source: result.meta.source,
        needsClarification: result.meta.needs_clarification,
        clarificationQuestion: result.meta.clarification_question,
      },
    };

    await Promise.allSettled([
      RawLog.create(rawLogPayload),
      Transaction.create(transactionPayload),
    ]);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processText,
};
