const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            trim: true,
            default: "general"
        },
        currency: {
            type: String,
            trim: true,
            uppercase: true,
            default: "INR"
        },
        language: {
            type: String,
            trim: true,
            default: "hinglish"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        type: {
            type: String,
            required: true,
            trim: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.Business || mongoose.model("Business", businessSchema);
