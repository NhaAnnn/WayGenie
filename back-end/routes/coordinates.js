// routes/coordinates.js
const express = require("express");
const router = express.Router();
const Coordinate = require("../models/coordinates"); // Ensure this path is correct

// Middleware to log API access time (optional)
router.use((req, res, next) => {
  console.log(
    `[Coordinates API] ${req.method} ${
      req.originalUrl
    } at ${new Date().toISOString()}`
  );
  next();
});

// --- GET All Coordinates ---
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

// --- POST: Add a new Coordinate ---
router.post("/", async (req, res) => {
  // Extract data from the request body
  // Make sure your frontend sends data that matches your Coordinate schema (e.g., {node_id: ..., location: {type: 'Point', coordinates: [...]}, ...})
  const newCoordinateData = req.body;

  try {
    // Check if a coordinate with the same node_id already exists
    if (newCoordinateData.node_id) {
      // <--- CHANGED: Check for newCoordinateData.node_id
      const existingCoordinate = await Coordinate.findOne({
        node_id: newCoordinateData.node_id,
      }); // <--- CHANGED: Query by node_id
      if (existingCoordinate) {
        return res.status(409).json({
          message: `Tọa độ với node_id ${newCoordinateData.node_id} đã tồn tại.`,
        });
      }
    }

    const newCoordinate = new Coordinate(newCoordinateData);
    const savedCoordinate = await newCoordinate.save();

    res.status(201).json(savedCoordinate);
  } catch (error) {
    console.error("Lỗi khi thêm tọa độ mới:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ", errors: error.errors });
    }
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({
        message: `Lỗi trùng lặp: node_id ${newCoordinateData.node_id} đã tồn tại.`,
      }); // <--- CHANGED: message uses node_id
    }
    res
      .status(500)
      .json({ message: "Lỗi máy chủ khi thêm tọa độ", error: error.message });
  }
});

// --- PUT: Update an existing Coordinate by node_id ---
router.put("/:nodeId", async (req, res) => {
  // Changed parameter name to nodeId
  const nodeId = parseInt(req.params.nodeId); // The node_id to update
  const updateData = req.body; // The data to update with

  // Basic validation for nodeId
  if (isNaN(nodeId)) {
    return res
      .status(400)
      .json({ message: "node_id không hợp lệ. Vui lòng cung cấp một số." });
  }

  // Prevent updating the node_id itself if it's meant to be immutable
  // If you allow updating node_id, remove this check.
  if (updateData.node_id && updateData.node_id !== nodeId) {
    // <--- CHANGED: Check updateData.node_id
    return res
      .status(400)
      .json({ message: "Không được phép thay đổi node_id." });
  }

  try {
    const updatedCoordinate = await Coordinate.findOneAndUpdate(
      { node_id: nodeId }, // <--- CHANGED: Query by node_id
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCoordinate) {
      return res.status(404).json({
        message: `Không tìm thấy tọa độ với node_id: ${nodeId} để cập nhật.`,
      });
    }

    res.status(200).json(updatedCoordinate);
  } catch (error) {
    console.error(`Lỗi khi cập nhật tọa độ với node_id (${nodeId}):`, error); // <--- CHANGED: message uses node_id
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Dữ liệu cập nhật không hợp lệ",
        errors: error.errors,
      });
    }
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Lỗi trùng lặp dữ liệu khi cập nhật." });
    }
    res.status(500).json({
      message: "Lỗi máy chủ khi cập nhật tọa độ",
      error: error.message,
    });
  }
});

// --- DELETE: Delete a Coordinate by node_id ---
router.delete("/:nodeId", async (req, res) => {
  // Changed parameter name to nodeId
  const nodeId = parseInt(req.params.nodeId); // The node_id to delete

  // Basic validation for nodeId
  if (isNaN(nodeId)) {
    return res
      .status(400)
      .json({ message: "node_id không hợp lệ. Vui lòng cung cấp một số." });
  }

  try {
    const deletedCoordinate = await Coordinate.findOneAndDelete({
      node_id: nodeId,
    }); // <--- CHANGED: Query by node_id

    if (!deletedCoordinate) {
      return res.status(404).json({
        message: `Không tìm thấy tọa độ với node_id: ${nodeId} để xóa.`,
      });
    }

    res.status(200).json({
      message: `Tọa độ với node_id: ${nodeId} đã được xóa thành công.`,
      deletedCoordinate,
    });
  } catch (error) {
    console.error(`Lỗi khi xóa tọa độ với node_id (${nodeId}):`, error); // <--- CHANGED: message uses node_id
    res
      .status(500)
      .json({ message: "Lỗi máy chủ khi xóa tọa độ", error: error.message });
  }
});

// Thêm vào routes/coordinates.js
router.get("/nearby", async (req, res) => {
  try {
    const { lon, lat, limit = 1 } = req.query;

    // Validate input
    if (!lon || !lat) {
      return res.status(400).json({
        error: "Thiếu tham số bắt buộc",
        details: "Vui lòng cung cấp cả longitude và latitude",
      });
    }

    const coordinates = await Coordinate.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lon), parseFloat(lat)],
          },
          $maxDistance: 5000, // 5km
        },
      },
    }).limit(parseInt(limit));

    if (coordinates.length === 0) {
      return res.status(404).json({
        error: "Không tìm thấy node nào trong phạm vi 5km",
        request: { lon, lat },
      });
    }

    // Format response data
    const result = coordinates.map((coord) => ({
      node_id: coord.node_id,
      location: {
        type: "Point",
        coordinates: coord.location.coordinates,
      },
      properties: coord.properties, // Thêm các thuộc tính khác nếu cần
    }));

    res.json(result);
  } catch (error) {
    console.error("Lỗi API /nearby:", error);
    res.status(500).json({
      error: "Lỗi server khi tìm node gần nhất",
      details: error.message,
    });
  }
});

module.exports = router;
