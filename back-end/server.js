// server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
// const admin = require("./firebaseAdmin"); // Khởi tạo Firebase Admin SDK

// Tải biến môi trường từ secrets.env
dotenv.config({ path: "./secrets.env" });

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Định nghĩa các routes (API endpoints)

const coordinateRoutes = require("./routes/coordinates"); // MỚI
const routeRoutes = require("./routes/routes"); // MỚI
const authRoutes = require("./routes/auth"); // MỚI
const routeFindingApi = require("./routes/routeFindingApi"); // MỚI
const aqiRoutes = require("./routes/aqis"); // MỚI

app.use("/api/coordinates", coordinateRoutes); // MỚI
app.use("/api/routes", routeRoutes); // MỚI
app.use("/api/auth", authRoutes); // MỚI
app.use("/api/find-route", routeFindingApi); // MỚI
app.use("/api/aqis", aqiRoutes); // MỚI

// Route mặc định (Health check)
app.get("/", (req, res) => {
  res.send("WayGenie Backend API đang chạy!");
});

// Xử lý lỗi 404
app.use((req, res, next) => {
  res.status(404).json({ message: "API Endpoint không tìm thấy" });
});

// Xử lý lỗi tổng quát
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Có lỗi xảy ra ở máy chủ!", error: err.message });
});

// Kết nối MongoDB trước khi khởi động server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Kết nối MongoDB thành công!");
    // Khởi động server CHỈ SAU KHI kết nối DB thành công
    app.listen(PORT, () => {
      console.log(`Server đang chạy trên cổng ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Lỗi kết nối MongoDB:", err);
    process.exit(1); // Thoát ứng dụng nếu không thể kết nối DB
  });
