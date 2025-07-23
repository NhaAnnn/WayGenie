const mongoose = require("mongoose");

const userSimulationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Tham chiếu đến User model
    required: true,
  },
  simulation_type: {
    type: String,
    enum: ["aqi", "traffic"], // Các loại mô phỏng có thể có
    required: true,
  },
  simulation_name: {
    type: String,
    required: [true, "Tên mô phỏng là bắt buộc"],
    trim: true,
    minlength: 3,
  },
  simulation_data: {
    type: Object, // Lưu trữ dữ liệu cụ thể của mô phỏng (lon, lat, pm25, radiusKm, fromNode, toNode, travelTimeMultiplier, v.v.)
    required: true,
  },
  is_active: {
    type: Boolean,
    default: true, // Trạng thái hoạt động của mô phỏng
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Cập nhật trường updatedAt mỗi khi tài liệu được sửa đổi
userSimulationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
userSimulationSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const UserSimulation = mongoose.model("UserSimulation", userSimulationSchema);
module.exports = UserSimulation;
