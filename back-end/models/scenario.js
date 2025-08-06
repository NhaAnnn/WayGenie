const mongoose = require("mongoose");

const simulationSchema = new mongoose.Schema({
  simulation_type: {
    type: String,
    enum: ["aqi", "traffic"],
    required: [true, "Loại mô phỏng là bắt buộc"],
  },
  simulation_name: {
    type: String,
    required: [true, "Tên mô phỏng là bắt buộc"],
    trim: true,
    minlength: 3,
  },
  simulation_data: {
    type: Object,
    required: [true, "Dữ liệu mô phỏng là bắt buộc"],
  },
});

const scenarioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Người dùng là bắt buộc"],
  },
  name: {
    type: String,
    required: [true, "Tên kịch bản là bắt buộc"],
    trim: true,
    minlength: 3,
  },
  simulations: [simulationSchema],
  is_active: {
    type: Boolean,
    default: true,
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
scenarioSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

scenarioSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const Scenario = mongoose.model("Scenario", scenarioSchema);
module.exports = Scenario;
