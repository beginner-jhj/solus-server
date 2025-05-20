import { verifyJWT } from "../lib/token.js";

export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided"
      });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format"
      });
    }

    try {
      const decoded = verifyJWT(token);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      next();
      return;
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      next();
      return;
    }

    try {
      const decoded = verifyJWT(token);
      req.user = decoded;
      next();
    } catch (err) {
      next();
    }
  } catch (error) {
    next();
  }
};
