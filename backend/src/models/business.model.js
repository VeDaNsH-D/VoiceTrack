const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    category: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Business || mongoose.model("Business", businessSchema);
