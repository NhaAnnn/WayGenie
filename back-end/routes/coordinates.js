// routes/coordinates.js
const express = require("express");
const router = express.Router();
const Coordinate = require("../models/coordinates");

// Middleware để log thời gian truy cập API (tùy chọn)
router.use((req, res, next) => {
  console.log(
    `[Coordinates API] ${req.method} ${
      req.originalUrl
    } at ${new Date().toISOString()}`
  );
  next();
});

// --- GET All Coordinates (có thể thêm pagination/filter trong tương lai) ---
router.get("/", async (req, res) => {
  try {
    const coordinates = await Coordinate.find({});
    res.status(200).json(coordinates);
  } catch (error) {
    console.error("Lỗi khi lấy tất cả tọa độ:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ khi lấy tọa độ", error: error.message });
  }
});

// --- GET Coordinate by NODE-NO ---
router.get("/:nodeNo", async (req, res) => {
  try {
    const coordinate = await Coordinate.findOne({
      "NODE-NO": parseInt(req.params.nodeNo),
    });
    if (!coordinate) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tọa độ với NODE-NO này" });
    }
    res.status(200).json(coordinate);
  } catch (error) {
    console.error("Lỗi khi lấy tọa độ theo NODE-NO:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ khi lấy tọa độ", error: error.message });
  }
});

// --- Thêm tọa độ mới (Nếu bạn cần) ---
// Router.post('/', async (req, res) => { ... });

module.exports = router;
