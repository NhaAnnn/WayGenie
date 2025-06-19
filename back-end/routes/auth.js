const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// --- Middleware (Tùy chọn, để xác thực và phân quyền) ---
// Giả định bạn có một middleware để kiểm tra token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Không có token xác thực." });
  }
  const token = authHeader.split(" ")[1]; // Lấy token từ 'Bearer TOKEN'

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined in environment variables.");
    return res.status(500).json({ message: "Lỗi cấu hình server." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }
    req.user = user;
    next();
  });
};

// Middleware kiểm tra quyền admin
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
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });
  }

  try {
    // Kiểm tra xem username hoặc email đã tồn tại chưa
    let existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Tên người dùng hoặc email đã tồn tại." });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo người dùng mới
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({
      message: "Đăng ký thành công!",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi server khi đăng ký.", error: err.message });
  }
});

// 2. Đăng nhập người dùng (Login) - Đã thay đổi để đăng nhập bằng EMAIL
router.post("/login", async (req, res) => {
  const { email, password } = req.body; // Lấy email thay vì username

  if (!email || !password) {
    // Kiểm tra email thay vì username
    return res
      .status(400)
      .json({ message: "Vui lòng điền đầy đủ email và mật khẩu." });
  }

  try {
    // Tìm người dùng theo email (thay vì username)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại." }); // Thông báo lỗi phù hợp
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu không đúng." });
    }

    // Tạo JWT token
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables.");
      return res.status(500).json({ message: "Lỗi cấu hình server." });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token hết hạn sau 1 giờ
    );

    // Trả về thông tin người dùng (không bao gồm password) và token
    res.status(200).json({
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
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
    const users = await User.find().select("-password"); // Không trả về password
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách người dùng.",
      error: err.message,
    });
  }
});

// 4. Lấy thông tin một người dùng cụ thể (Có thể dùng cho người dùng tự xem hoặc admin xem)
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tìm thấy." });
    }
    // Đảm bảo chỉ người dùng đó hoặc admin mới có thể xem thông tin chi tiết
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập thông tin người dùng này.",
      });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({
      message: "Lỗi server khi lấy thông tin người dùng.",
      error: err.message,
    });
  }
});

// Cập nhật thông tin người dùng
router.put("/:id", verifyToken, async (req, res) => {
  // Chỉ cho phép user tự cập nhật của mình hoặc admin cập nhật bất kỳ ai
  if (req.user.id !== req.params.id && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền cập nhật người dùng này." });
  }

  try {
    const updates = req.body;
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }
    if (req.user.role !== "admin" && updates.role) {
      delete updates.role;
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true } // `new: true` trả về tài liệu đã cập nhật, `runValidators` chạy validation
    ).select("-password"); // Không trả về password

    if (!updatedUser) {
      return res.status(404).json({ message: "Người dùng không tìm thấy." });
    }

    res
      .status(200)
      .json({ message: "Cập nhật người dùng thành công!", user: updatedUser });
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

// 5. Đăng nhập bằng Google
// router.post("/google",  async (req, res) => {

//   try {
//     const user = await User.findOne({ email: req.body.email });
//     if (user) {
//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
//       const { password: pass, ...rest } = user._doc;
//       res
//         .cookie("access_token", token, { httpOnly: true })
//         .status(200)
//         .json(rest);
//     } else {
//       const generatedPassword =
//         Math.random().toString(36).slice(-8) +
//         Math.random().toString(36).slice(-8);
//       const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
//       const newUser = new User({
//         username:
//           req.body.name.split(" ").join("").toLowerCase() +
//           Math.random().toString(36).slice(-4),
//         email: req.body.email,
//         password: hashedPassword,
//         avatar: req.body.photo,
//       });
//       await newUser.save();
//       const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
//       const { password: pass, ...rest } = newUser._doc;
//       res
//         .cookie("access_token", token, { httpOnly: true })
//         .status(200)
//         .json(rest);
//     }
//   } catch (error) {
//     next(error);
//   }
// };

// app.post("/auth/google", async (req, res) => {
//   try {
//     const { idToken, email, name } = req.body;

//     // 1. Verify idToken với Firebase
//     const decodedToken = await admin.auth().verifyIdToken(idToken);
//     const firebaseUserId = decodedToken.uid;

//     // 2. Kiểm tra user đã tồn tại trong DB chưa (ví dụ dùng MongoDB)
//     const user = await User.findOne({ firebaseId: firebaseUserId });

//     // 3. Nếu chưa có → Tạo mới user
//     if (!user) {
//       const newUser = new User({
//         firebaseId: firebaseUserId,
//         email,
//         name,
//         provider: "google",
//       });
//       await newUser.save();
//     }

//     // 4. Tạo JWT token để gửi về client
//     const jwtToken = generateJWT(firebaseUserId); // Hàm tự định nghĩa

//     res.json({ success: true, token: jwtToken });
//   } catch (error) {
//     res.status(401).json({ success: false, message: error.message });
//   }
// });

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

module.exports = router;
