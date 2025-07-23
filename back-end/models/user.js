const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Tên người dùng là bắt buộc"],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: [true, "Email là bắt buộc"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, "Vui lòng nhập một địa chỉ email hợp lệ"],
  },
  password: {
    type: String,
    required: [true, "Mật khẩu là bắt buộc"],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["user", "admin"], // Các vai trò có thể có
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware để mã hóa mật khẩu trước khi lưu
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Phương thức để so sánh mật khẩu
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
