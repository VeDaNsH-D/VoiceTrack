const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: "general",
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    language: {
      type: String,
      trim: true,
      default: "hinglish",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

businessSchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports =
  mongoose.models.Business || mongoose.model("Business", businessSchema);
