const express = require("express");
const router = express.Router();
const User = require("../models/user"); // Đảm bảo đường dẫn đúng
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({ path: "../secrets.env" }); // Đường dẫn tương đối từ routes/auth.js đến secrets.env

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// --- Middleware (Định nghĩa cục bộ, lý tưởng nên import từ utils/auth) ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Không có token xác thực." });
  }
  const token = authHeader.split(" ")[1];

  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not defined in environment variables.");
    return res.status(500).json({ message: "Lỗi cấu hình server." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token đã hết hạn." });
      }
      return res.status(403).json({ message: "Token không hợp lệ." });
    }
    req.user = user;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Bạn không có quyền truy cập." });
  }
};

// --- ROUTES ---

// 1. Đăng ký người dùng mới (Register)
router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body; // Thêm role nếu muốn đăng ký admin từ đầu (cẩn thận)

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });
  }

  try {
    let existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Tên người dùng hoặc email đã tồn tại." });
    }

    const newUser = new User({
      username,
      email,
      password, // Mật khẩu sẽ được hash bởi pre-save hook trong User model
      role: role || "user", // Mặc định là 'user' nếu không cung cấp role
    });

    await newUser.save();
    res.status(201).json({
      message: "Đăng ký thành công!",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        phone: "", // Thêm mặc định để đảm bảo
        address: "", // Thêm mặc định để đảm bảo
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi server khi đăng ký.", error: err.message });
  }
});

// 2. Đăng nhập người dùng (Login)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng điền đầy đủ email và mật khẩu." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại." });
    }

    const isMatch = await user.matchPassword(password); // Sử dụng phương thức matchPassword từ User model
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng." });
    }

    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables.");
      return res.status(500).json({ message: "Lỗi cấu hình server." });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone || "", // Thêm mặc định để đảm bảo
        address: user.address || "", // Thêm mặc định để đảm bảo
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi server khi đăng nhập.", error: err.message });
  }
});

// 3. Lấy tất cả người dùng (Chỉ Admin)
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách người dùng.",
      error: err.message,
    });
  }
});

// 4. Lấy thông tin một người dùng cụ thể (Có thể dùng cho người dùng tự xem hoặc admin xem)
// GET /auth/:id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tìm thấy." });
    }
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập thông tin người dùng này.",
      });
    }
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi server khi lấy thông tin người dùng.",
      error: err.message,
    });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng điền đầy đủ email và mật khẩu." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng." });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || "", // Thêm phone
        address: user.address || "", // Thêm address
        role: user.role,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi server khi đăng nhập.", error: err.message });
  }
});

// 5. Cập nhật thông tin người dùng
router.put("/:id", verifyToken, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền cập nhật người dùng này." });
  }

  try {
    const updates = req.body;
    // Nếu có mật khẩu mới, hash nó
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }
    // Ngăn người dùng thường tự thay đổi role của mình
    if (req.user.role !== "admin" && updates.role) {
      delete updates.role;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Người dùng không tìm thấy." });
    }

    res.status(200).json({
      message: "Cập nhật người dùng thành công!",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone || "", // Trả về phone, mặc định rỗng nếu không có
        address: updatedUser.address || "", // Trả về address, mặc định rỗng nếu không có
        role: updatedUser.role,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Tên người dùng hoặc email đã tồn tại.",
        error: err.message,
      });
    }
    res.status(500).json({
      message: "Lỗi server khi cập nhật người dùng.",
      error: err.message,
    });
  }
});
// 6. Xóa người dùng (Chỉ Admin)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "Người dùng không tìm thấy." });
    }
    res.status(200).json({ message: "Xóa người dùng thành công!" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi server khi xóa người dùng.", error: err.message });
  }
});
router.patch("/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  const { role } = req.body;

  // Kiểm tra vai trò hợp lệ
  if (!role || !["user", "admin"].includes(role)) {
    return res.status(400).json({
      message: "Vai trò không hợp lệ. Vai trò phải là 'user' hoặc 'admin'.",
    });
  }

  // Ngăn admin tự thay đổi vai trò của chính mình
  if (req.user.id === req.params.id) {
    return res
      .status(403)
      .json({ message: "Không thể thay đổi vai trò của chính bạn." });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Người dùng không tìm thấy." });
    }

    res.status(200).json({
      message: "Cập nhật vai trò thành công!",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi server khi cập nhật vai trò.",
      error: err.message,
    });
  }
});
module.exports = router;
