const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User.js");
const sendEmail = require("../config/sendEmail.js");
const forgotPasswordTemplate = require("../utils/forgotPasswordTemplate.js");

const router = express.Router();

// Tạo OTP ngẫu nhiên
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 chữ số
};

// 1. Quên mật khẩu
router.put("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Vui lòng kiểm tra lại email" });
    }

    const otp = generateOTP();
    const expireTime = Date.now() + 1000 * 60 * 30; // 30 phút

    await User.findByIdAndUpdate(user._id, {
      passwordResetOTP: otp,
      passwordResetExpires: expireTime,
    });

    const data = {
      to: email,
      subject: "TN-MAP- Mã xác nhận",
      text: `Mã OTP của bạn là: ${otp}`,
      html: forgotPasswordTemplate({ name: user.username, otpCode: otp }),
    };

    await sendEmail(data);

    return res.status(200).json({
      message: "Kiểm tra email của bạn để đặt lại mật khẩu",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
});

// 2. Xác minh OTP
router.put("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.passwordResetOTP !== otp) {
      return res
        .status(400)
        .json({ message: "Mã xác nhận không hợp lệ hoặc đã hết hạn" });
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: "Mã xác nhận đã hết hạn" });
    }

    await User.findByIdAndUpdate(user._id, {
      passwordResetOTP: "",
      passwordResetExpires: null,
    });

    return res.status(200).json({ message: "Xác thực thành công" });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
});

// 3. Đặt lại mật khẩu
router.put("/reset-password", async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Cần nhập email, mật khẩu mới và xác nhận mật khẩu",
      });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Mật khẩu và xác nhận không khớp" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(user._id, {
      password: hashed,
    });

    return res.status(200).json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
});

module.exports = router;
