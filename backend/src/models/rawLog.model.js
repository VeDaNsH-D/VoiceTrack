const mongoose = require("mongoose");

const rawLogSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    normalizedText: { type: String, trim: true },
    source: { type: String, trim: true, default: "api" },
    status: { type: String, trim: true, default: "received" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.RawLog || mongoose.model("RawLog", rawLogSchema);
