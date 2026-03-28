const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0.01 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    rawText: { type: String, required: true, trim: true },
    normalizedText: { type: String, required: true, trim: true },
    sales: { type: [saleSchema], default: [] },
    expenses: { type: [expenseSchema], default: [] },
    meta: {
      confidence: { type: Number, required: true, min: 0, max: 1 },
      source: { type: String, enum: ["rules", "llm", "fallback"], required: true },
      needsClarification: { type: Boolean, default: false },
      clarificationQuestion: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
