// routes/aqis.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // Required for ObjectId validation
const AQIS = require("../models/aqis"); // Correct path to your AQIS Mongoose model

// --- Middleware for logging API access ---
router.use((req, res, next) => {
  console.log(
    `[AQIS API] ${req.method} ${req.originalUrl} at ${new Date().toISOString()}`
  );
  next(); // Pass control to the next middleware/route handler
});

// --- GET All AQIS Records ---
// Supports optional filtering (e.g., GET /api/aqis?stationName=Hanoi)
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.stationName) {
      // Case-insensitive regex search for stationName
      query.stationName = { $regex: new RegExp(req.query.stationName, "i") };
    }
    // You can add more filters here if needed, e.g., by date range, AQI value

    const aqisRecords = await AQIS.find(query);
    res.status(200).json(aqisRecords);
  } catch (error) {
    console.error("Error fetching all AQIS records:", error);
    res.status(500).json({
      message: "Lỗi máy chủ khi lấy tất cả bản ghi AQIS.",
      error: error.message,
    });
  }
});

// --- GET AQIS Record by MongoDB _id ---
// Example: GET /api/aqis/66538d77d51c1b2e794775e7
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Định dạng ID AQIS không hợp lệ." });
    }

    const aqisRecord = await AQIS.findById(id);
    if (!aqisRecord) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy bản ghi AQIS với ID: ${id}.` });
    }
    res.status(200).json(aqisRecord);
  } catch (error) {
    console.error(
      `Error fetching AQIS record by ID (${req.params.id}):`,
      error
    );
    res.status(500).json({
      message: "Lỗi máy chủ khi lấy bản ghi AQIS theo ID.",
      error: error.message,
    });
  }
});

// --- GET AQIS Record by stationId ---
// Example: GET /api/aqis/by-station-id/13251
router.get("/by-station-id/:stationId", async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);

    if (isNaN(stationId)) {
      return res
        .status(400)
        .json({
          message:
            "Mã trạm (stationId) không hợp lệ. Vui lòng cung cấp một số.",
        });
    }

    const aqisRecord = await AQIS.findOne({ stationId: stationId });
    if (!aqisRecord) {
      return res
        .status(404)
        .json({
          message: `Không tìm thấy bản ghi AQIS với mã trạm: ${stationId}.`,
        });
    }
    res.status(200).json(aqisRecord);
  } catch (error) {
    console.error(
      `Error fetching AQIS record by stationId (${req.params.stationId}):`,
      error
    );
    res.status(500).json({
      message: "Lỗi máy chủ khi lấy bản ghi AQIS theo mã trạm.",
      error: error.message,
    });
  }
});

// --- POST Create New AQIS Record ---
/*
Example Body:
{
  "stationId": 99999,
  "stationName": "Trạm thử nghiệm mới",
  "aqi": 50,
  "pm25": 25,
  "pm10": 30,
  "co": 1.2,
  "no2": 0.5,
  "so2": 0.1,
  "o3": 0.2,
  "time": "2025-06-21T15:00:00.000Z",
  "location": {
    "type": "Point",
    "coordinates": [105.78, 10.03] // [longitude, latitude]
  }
}
*/
router.post("/", async (req, res) => {
  const newAqisData = req.body;

  // Basic validation for required fields
  if (
    !newAqisData.stationId ||
    !newAqisData.location ||
    !newAqisData.location.coordinates ||
    !Array.isArray(newAqisData.location.coordinates) ||
    newAqisData.location.coordinates.length !== 2
  ) {
    return res.status(400).json({
      message:
        "Thiếu trường bắt buộc hoặc dữ liệu không hợp lệ. Đảm bảo 'stationId' và 'location.coordinates' (mảng [kinh độ, vĩ độ]) được cung cấp.",
    });
  }
  // Ensure location type is 'Point', though schema has a default, explicit check is safer
  if (newAqisData.location.type && newAqisData.location.type !== "Point") {
    return res
      .status(400)
      .json({ message: "Kiểu vị trí (location.type) phải là 'Point'." });
  }

  try {
    const newAqisRecord = new AQIS(newAqisData);
    const savedAqisRecord = await newAqisRecord.save();
    res.status(201).json(savedAqisRecord); // 201 Created
  } catch (error) {
    console.error("Error creating new AQIS record:", error);
    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));
      return res.status(400).json({
        message: "Lỗi xác thực dữ liệu.",
        errors: errors,
      });
    }
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({
        message: `Bản ghi AQIS với mã trạm ${newAqisData.stationId} đã tồn tại.`,
        error: error.message,
      });
    }
    res.status(500).json({
      message: "Lỗi máy chủ khi tạo bản ghi AQIS mới.",
      error: error.message,
    });
  }
});

// --- PUT Update Existing AQIS Record by _id ---
// Example: PUT /api/aqis/66538d77d51c1b2e794775e7
/*
Example Body:
{
  "aqi": 65,
  "pm25": 35,
  "time": "2025-06-21T16:30:00.000Z"
}
*/
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "Định dạng ID AQIS không hợp lệ để cập nhật." });
  }

  // Prevent updating stationId if it's meant to be immutable, or handle carefully
  if (updateData.stationId !== undefined) {
    console.warn(
      `Cảnh báo: Đang cố gắng cập nhật trường stationId (${updateData.stationId}) cho ID ${id}. Đây thường là ID duy nhất và không nên thay đổi.`
    );
    // Uncomment the line below if you want to strictly prevent stationId updates via PUT
    // delete updateData.stationId;
  }

  try {
    const updatedAqisRecord = await AQIS.findByIdAndUpdate(id, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators on update
      context: "query", // Important for unique validators to work correctly on update
    });

    if (!updatedAqisRecord) {
      return res
        .status(404)
        .json({
          message: `Không tìm thấy bản ghi AQIS với ID: ${id} để cập nhật.`,
        });
    }
    res.status(200).json(updatedAqisRecord);
  } catch (error) {
    console.error(`Error updating AQIS record by ID (${id}):`, error);
    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));
      return res.status(400).json({
        message: "Lỗi xác thực dữ liệu khi cập nhật.",
        errors: errors,
      });
    }
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({
        message: `Lỗi khóa trùng lặp khi cập nhật. Mã trạm mới có thể đã tồn tại.`,
        error: error.message,
      });
    }
    res.status(500).json({
      message: "Lỗi máy chủ khi cập nhật bản ghi AQIS.",
      error: error.message,
    });
  }
});

// --- DELETE AQIS Record by _id ---
// Example: DELETE /api/aqis/66538d77d51c1b2e794775e7
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "Định dạng ID AQIS không hợp lệ để xóa." });
  }

  try {
    const deletedAqisRecord = await AQIS.findByIdAndDelete(id);

    if (!deletedAqisRecord) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy bản ghi AQIS với ID: ${id} để xóa.` });
    }
    res
      .status(200)
      .json({
        message: "Bản ghi AQIS đã được xóa thành công.",
        deletedAqisRecord,
      });
  } catch (error) {
    console.error(`Error deleting AQIS record by ID (${id}):`, error);
    res.status(500).json({
      message: "Lỗi máy chủ khi xóa bản ghi AQIS.",
      error: error.message,
    });
  }
});

module.exports = router;
