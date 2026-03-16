import { verifyToken } from "../config/jwt.js";

// Main authentication middleware - PRODUCTION GRADE
export const authenticate = (req, res, next) => {
  try {
    // Get token from header or cookie
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue",
        code: "AUTH_REQUIRED",
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Ensure user ID exists in decoded token
    if (!decoded._id && !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid session. Please log in again",
        code: "INVALID_TOKEN",
      });
    }

    // Attach user to request with consistent ID format
    req.user = {
      ...decoded,
      id: decoded._id || decoded.id,
      _id: decoded._id || decoded.id,
    };
    return next();
  } catch (error) {
    console.error("[AUTH] Token verification failed:", error.message);

    // Provide specific error messages
    const isExpired = error.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: isExpired
        ? "Session expired. Please log in again"
        : "Invalid authentication. Please log in again",
      code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
};

// Legacy export for backward compatibility
export const authMiddleware = authenticate;

export const requireAdmin = (req, res, next) => {
  authenticate(req, res, () => {
    if (!["admin", "pharmacist"].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }
    return next();
  });
};

// Auth check endpoint handler
export const checkAuth = (req, res) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Not authenticated",
      });
    }

    const decoded = verifyToken(token);
    return res.json({
      success: true,
      authenticated: true,
      user: {
        id: decoded._id || decoded.id,
        email: decoded.email,
        role: decoded.role,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: "Invalid or expired session",
    });
  }
};
