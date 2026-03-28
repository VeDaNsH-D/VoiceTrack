const mongoose = require("mongoose");

const rawLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },
    text: { type: String, required: true, trim: true },
    normalizedText: { type: String, trim: true },
    source: {
      type: String,
      trim: true,
      enum: ["api", "webhook", "manual", "stt", "llm"],
      default: "api",
    },
    status: {
      type: String,
      trim: true,
      enum: ["received", "processed", "clarification", "failed"],
      default: "received",
    },
    parseMeta: {
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
      },
      parserSource: {
        type: String,
        enum: ["rules", "llm", "fallback"],
        default: null,
      },
      needsClarification: {
        type: Boolean,
        default: false,
      },
      clarificationQuestion: {
        type: String,
        default: null,
        trim: true,
      },
    },
  },
  { timestamps: true }
);

rawLogSchema.index({ businessId: 1, createdAt: -1 });
rawLogSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.RawLog || mongoose.model("RawLog", rawLogSchema);
