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
      return res.status(400).json({
        message: "Mã trạm (stationId) không hợp lệ. Vui lòng cung cấp một số.",
      });
    }

    const aqisRecord = await AQIS.findOne({ stationId: stationId });
    if (!aqisRecord) {
      return res.status(404).json({
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

  // Validate required fields
  if (
    !newAqisData.stationName ||
    !newAqisData.location ||
    !newAqisData.location.coordinates ||
    !Array.isArray(newAqisData.location.coordinates) ||
    newAqisData.location.coordinates.length !== 2 ||
    isNaN(newAqisData.location.coordinates[0]) ||
    isNaN(newAqisData.location.coordinates[1])
  ) {
    return res.status(400).json({
      message:
        "Dữ liệu không hợp lệ. Vui lòng cung cấp 'stationName' và 'location.coordinates' là mảng [kinh độ, vĩ độ] hợp lệ.",
    });
  }

  // Ensure location type is 'Point'
  newAqisData.location.type = newAqisData.location.type || "Point";
  if (newAqisData.location.type !== "Point") {
    return res
      .status(400)
      .json({ message: "Kiểu vị trí (location.type) phải là 'Point'." });
  }

  // Automatically generate stationUid
  try {
    const lastStation = await AQIS.findOne().sort({ stationUid: -1 });
    newAqisData.stationUid = lastStation ? lastStation.stationUid + 1 : 1000;
  } catch (error) {
    console.error("Error generating stationUid:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi tạo mã trạm (stationUid).",
      error: error.message,
    });
  }

  // Validate optional numeric fields
  const numericFields = ["aqi", "pm25", "pm10", "co", "no2", "so2", "o3"];
  for (const field of numericFields) {
    if (newAqisData[field] !== undefined) {
      const value = parseFloat(newAqisData[field]);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          message: `Trường ${field} phải là số không âm.`,
        });
      }
      newAqisData[field] = value;
    }
  }

  // Set default time if not provided
  newAqisData.time = newAqisData.time ? new Date(newAqisData.time) : new Date();
  if (isNaN(newAqisData.time)) {
    return res.status(400).json({
      message:
        "Trường time không hợp lệ. Vui lòng cung cấp định dạng ISO hợp lệ.",
    });
  }

  try {
    const newAqisRecord = new AQIS(newAqisData);
    const savedAqisRecord = await newAqisRecord.save();
    res.status(201).json(savedAqisRecord);
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
      return res.status(409).json({
        message: `Bản ghi AQIS với mã trạm ${newAqisData.stationUid} đã tồn tại.`,
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
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Định dạng ID AQIS không hợp lệ." });
  }

  // Prevent updating stationUid
  if (updateData.stationUid !== undefined) {
    delete updateData.stationUid;
  }

  // Validate location if provided
  if (
    updateData.location &&
    (updateData.location.coordinates || updateData.location.type)
  ) {
    if (
      !Array.isArray(updateData.location.coordinates) ||
      updateData.location.coordinates.length !== 2 ||
      isNaN(updateData.location.coordinates[0]) ||
      isNaN(updateData.location.coordinates[1])
    ) {
      return res.status(400).json({
        message: "'location.coordinates' phải là mảng [kinh độ, vĩ độ] hợp lệ.",
      });
    }
    updateData.location.type = updateData.location.type || "Point";
    if (updateData.location.type !== "Point") {
      return res
        .status(400)
        .json({ message: "Kiểu vị trí (location.type) phải là 'Point'." });
    }
  }

  // Validate numeric fields
  const numericFields = ["aqi", "pm25", "pm10", "co", "no2", "so2", "o3"];
  for (const field of numericFields) {
    if (updateData[field] !== undefined) {
      const value = parseFloat(updateData[field]);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          message: `Trường ${field} phải là số không âm.`,
        });
      }
      updateData[field] = value;
    }
  }

  // Validate time if provided
  if (updateData.time) {
    updateData.time = new Date(updateData.time);
    if (isNaN(updateData.time)) {
      return res.status(400).json({
        message:
          "Trường time không hợp lệ. Vui lòng cung cấp định dạng ISO hợp lệ.",
      });
    }
  }

  try {
    const updatedAqisRecord = await AQIS.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    });

    if (!updatedAqisRecord) {
      return res.status(404).json({
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
    res.status(200).json({
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
