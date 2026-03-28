const { processTransactionText } = require("../services/extraction.service");
const {
  saveProcessedTransaction,
  saveRawLog,
} = require("../services/transaction.store");

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
      parseMeta: {
        confidence: result.meta.confidence,
        parserSource: result.meta.source,
        needsClarification: result.meta.needs_clarification,
        clarificationQuestion: result.meta.clarification_question,
      },
    };

    const rawLog = await saveRawLog(rawLogPayload);

    await saveProcessedTransaction({
      rawText: text,
      normalizedText,
      rawLogId: rawLog?._id || null,
      sales: result.sales,
      expenses: result.expenses,
      meta: {
        confidence: result.meta.confidence,
        source: result.meta.source,
        needsClarification: result.meta.needs_clarification,
        clarificationQuestion: result.meta.clarification_question,
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processText,
};
