const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({ path: "../secrets.env" }); // Đường dẫn tương đối từ utils/auth.js đến secrets.env

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"; // Sử dụng biến môi trường

/**
 * Middleware để xác minh JWT từ header của request.
 * Gắn user ID và role vào req.user nếu token hợp lệ.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Next middleware function.
 */
const verifyToken = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access Denied: No token provided." });
  }

  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not defined in environment variables.");
    return res.status(500).json({
      success: false,
      message: "Server configuration error: JWT_SECRET missing.",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ success: false, message: "Access Denied: Token expired." });
      }
      return res
        .status(403)
        .json({ success: false, message: "Access Denied: Invalid token." });
    }
    // user object từ payload JWT sẽ chứa id và role
    req.user = user;
    next();
  });
};

/**
 * Middleware để kiểm tra nếu người dùng đã xác thực có một vai trò cụ thể.
 * @param {string[]} roles - Mảng các vai trò được phép truy cập route.
 * @returns {Function} Express middleware.
 */
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    // Đảm bảo req.user được thiết lập bởi verifyToken trước đó
    if (!req.user || !req.user.role) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: User role not found or not authenticated.",
        });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          success: false,
          message: `Forbidden: Role '${req.user.role}' is not authorized for this action.`,
        });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
};
