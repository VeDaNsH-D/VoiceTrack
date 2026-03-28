const authService = require("../services/auth.service");
const { signupUser, loginUser } = authService;
const { generateToken, verifyToken } = require("../services/jwt.service");
const { sendSuccess, sendError } = require("../utils/apiResponse");

async function getAuthStatus(req, res) {
    try {
        const authHeader = String(req.headers?.authorization || "");

        if (!authHeader.startsWith("Bearer ")) {
            return sendSuccess(res, { authenticated: false }, "No auth token provided");
        }

        const token = authHeader.slice(7).trim();
        if (!token) {
            return sendSuccess(res, { authenticated: false }, "No auth token provided");
        }

        const decoded = verifyToken(token);
        return sendSuccess(res, {
            authenticated: true,
            user: decoded,
        }, "Authenticated");
    } catch (error) {
        return sendSuccess(res, { authenticated: false }, "Invalid or expired token");
    }
}

const buildBusinessSummary = (user) => {
    if (!user?.businessId) {
        return null;
    }

    return {
        _id: user.businessId._id,
        businessCode: user.businessId.businessCode,
        name: user.businessId.name,
        type: user.businessId.type
    };
};
const normalizePhone = (phone) => {
    return String(phone || "").replace(/\s+/g, "").trim();
};

const normalizeEmail = (email) => {
    return String(email || "").trim().toLowerCase();
};

const normalizeName = (name) => {
    return String(name || "").trim();
};

const isValidPhone = (phone) => {
    return /^\+?[0-9]{10,15}$/.test(phone);
};

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const signup = async (req, res) => {
    try {
        const name = normalizeName(req.body.name);
        const email = normalizeEmail(req.body.email);
        const phone = normalizePhone(req.body.phone);
        const password = String(req.body.password || "");
        const businessMode = String(req.body.businessMode || "create").trim().toLowerCase();
        const businessCode = String(req.body.businessCode || "").trim().toUpperCase();
        const businessPassword = String(req.body.businessPassword || "");
        const businessName = normalizeName(req.body.businessName);
        const businessType = normalizeName(req.body.businessType || "general").toLowerCase();

        if (!name) {
            return sendError(res, "Name is required", 400);
        }

        if (!email && !phone) {
            return sendError(res, "Email or phone number is required", 400);
        }

        if (email && !isValidEmail(email)) {
            return sendError(res, "Please provide a valid email address", 400);
        }

        if (phone && !isValidPhone(phone)) {
            return sendError(res, "Please provide a valid phone number", 400);
        }

        if (password.length < 6) {
            return sendError(res, "Password must be at least 6 characters long", 400);
        }

        if (!["create", "join"].includes(businessMode)) {
            return res.status(400).json({
                success: false,
                message: "businessMode must be either create or join"
            });
        }

        if (businessPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Business password must be at least 6 characters long"
            });
        }

        if (businessMode === "join" && !businessCode) {
            return res.status(400).json({
                success: false,
                message: "Business ID is required to join an existing business"
            });
        }

        const user = await signupUser({
            name,
            email,
            phone,
            password,
            businessMode,
            businessCode,
            businessPassword,
            businessName,
            businessType
        });
        const token = generateToken(user);
        const business = buildBusinessSummary(user);

        return sendSuccess(res, {
            user,
            business,
            token
        }, "Signup successful", 201);
    } catch (error) {
        const errorMessage = String(error.message || "");
        const statusCode = errorMessage.includes("already exists")
            ? 409
            : errorMessage.includes("not found")
                ? 404
                : errorMessage.includes("Invalid business password")
                    ? 401
                    : 500;

        return sendError(res, errorMessage || "Signup failed", statusCode);
    }
};

const login = async (req, res) => {
    try {
        const identifier = String(
            req.body.identifier || req.body.email || req.body.phone || ""
        )
            .trim()
            .toLowerCase();
        const password = String(req.body.password || "");

        if (!identifier || !password) {
            return sendError(res, "Identifier and password are required", 400);
        }

        const user = await loginUser({
            identifier,
            password
        });
        const token = generateToken(user);
        const business = buildBusinessSummary(user);

        return sendSuccess(res, {
            user,
            business,
            token
        }, "Login successful");
    } catch (error) {
        const statusCode = error.message === "Invalid credentials" ? 401 : 500;
        return sendError(res, error.message, statusCode);
    }
};

const getBusinessDetails = async (req, res) => {
    try {
        const userId = String(req.query.userId || "").trim();
        const businessCode = String(req.query.businessCode || "").trim().toUpperCase();
        const businessId = String(req.query.businessId || "").trim();

        if (!userId && !businessCode && !businessId) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one of userId, businessCode, or businessId"
            });
        }

        const business = await authService.getBusinessSnapshot({
            userId,
            businessCode,
            businessId
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found"
            });
        }

        return res.status(200).json({
            success: true,
            storedInDb: true,
            business
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load business details"
        });
    }
};

module.exports = {
    getAuthStatus,
    signup,
    login,
    getBusinessDetails,
};
