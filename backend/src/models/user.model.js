const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            lowercase: true,
            trim: true
        },
        role: {
            type: String,
            enum: ["owner", "staff", "admin"],
            default: "owner"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        passwordHash: {
            type: String,
            required: true,
            select: false
        },
        passwordSalt: {
            type: String,
            required: true,
            select: false
        },
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            default: null
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre("validate", function setIdentityValidation() {
    if (!this.phone && !this.email) {
        this.invalidate("phone", "Phone or email is required");
    }
});

userSchema.index(
    { email: 1 },
    {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } }
    }
);

userSchema.index(
    { phone: 1 },
    {
        unique: true,
        partialFilterExpression: { phone: { $type: "string" } }
    }
);

userSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.passwordSalt;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
