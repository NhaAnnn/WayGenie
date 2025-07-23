// routes/routes.js (REFINED FOR CONSISTENCY AND BEST PRACTICES)
const express = require("express");
const router = express.Router();
const Route = require("../models/routes"); // Ensure correct path to your Mongoose model

// --- Middleware for logging API access ---
router.use((req, res, next) => {
  console.log(
    `[Routes API] ${req.method} ${
      req.originalUrl
    } at ${new Date().toISOString()}`
  );
  next(); // Pass control to the next middleware/route handler
});

// --- GET All Routes ---
// Supports optional filtering by TSYSSET
// Example: GET /api/routes?tsysset=CAR
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.tsysset) {
      // Use the actual DB field name 'TSYSSET' for querying directly,
      // or if your schema had an alias for this, use the schema field name.
      // Since TSYSSET doesn't have an alias in the schema (matches DB), use it directly.
      query.TSYSSET = { $regex: new RegExp(req.query.tsysset, "i") }; // Case-insensitive search
    }

    const routes = await Route.find(query);
    res.status(200).json(routes);
  } catch (error) {
    console.error("Error fetching all routes:", error);
    res.status(500).json({
      message: "Server error while fetching routes",
      error: error.message,
    });
  }
});

// --- GET Route by MongoDB _id ---
// Example: GET /api/routes/60f7e1b5c7f8a1a3e4b5c6d7
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params; // Destructure id from req.params

    // Basic validation for ObjectId format (optional but good practice)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid route ID format." });
    }

    const route = await Route.findById(id); // Use the destructured id
    if (!route) {
      return res
        .status(404)
        .json({ message: `Route with ID ${id} not found.` });
    }
    res.status(200).json(route);
  } catch (error) {
    console.error(`Error fetching route by ID (${req.params.id}):`, error);
    res.status(500).json({
      message: "Server error while fetching route by ID",
      error: error.message,
    });
  }
});

// --- GET Route by linkNo (uses schema alias 'linkNo' which maps to 'LINK:NO' in DB) ---

router.get("/by-link-no/:linkNo", async (req, res) => {
  try {
    const linkNo = parseInt(req.params.linkNo);

    if (isNaN(linkNo)) {
      return res
        .status(400)
        .json({ message: "LINK-NO không hợp lệ. Vui lòng cung cấp một số." });
    }

    // Use 'linkNo' (the alias) for querying. Mongoose will automatically convert it to "LINK:NO" for MongoDB.
    const route = await Route.findOne({ linkNo: linkNo });
    if (!route) {
      return res
        .status(404)
        .json({ message: `No route found with LINK-NO: ${linkNo}` });
    }
    res.status(200).json(route);
  } catch (error) {
    console.error(
      `Error fetching route by LINK-NO (${req.params.linkNo}):`,
      error
    );
    res.status(500).json({
      message: "Server error while fetching route by LINK-NO",
      error: error.message,
    });
  }
});

// --- GET Routes by FROMNODENO and TONODENO ---
// Example: GET /api/routes/by-nodes/4122/3784
router.get("/by-nodes/:fromNode/:toNode", async (req, res) => {
  try {
    const fromNode = parseInt(req.params.fromNode);
    const toNode = parseInt(req.params.toNode);

    if (isNaN(fromNode) || isNaN(toNode)) {
      return res.status(400).json({
        message:
          "FROMNODENO hoặc TONODENO không hợp lệ. Vui lòng cung cấp số nguyên.",
      });
    }

    // Query directly using the field names in the DB (which match schema names)
    const routes = await Route.find({ FROMNODENO: fromNode, TONODENO: toNode });
    if (routes.length === 0) {
      return res.status(404).json({
        message: `No routes found between nodes ${fromNode} and ${toNode}`,
      });
    }
    res.status(200).json(routes);
  } catch (error) {
    console.error(
      `Error fetching routes by nodes (${req.params.fromNode} -> ${req.params.toNode}):`,
      error
    );
    res.status(500).json({
      message: "Server error while fetching routes by nodes",
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  const newRouteData = req.body;

  // Basic validation: ensure required fields are present and valid
  // Use the internal schema field names (e.g., linkNo, lengthKm) for validation here.
  if (
    !newRouteData.linkNo ||
    !newRouteData.FROMNODENO ||
    !newRouteData.TONODENO ||
    !newRouteData.geometry ||
    newRouteData.geometry.type !== "LineString" || // Directly check type
    !newRouteData.geometry.coordinates ||
    !Array.isArray(newRouteData.geometry.coordinates) ||
    newRouteData.geometry.coordinates.length < 2 // LineString needs at least 2 points
  ) {
    return res.status(400).json({
      message:
        "Thiếu trường bắt buộc hoặc dữ liệu không hợp lệ. Đảm bảo 'linkNo', 'FROMNODENO', 'TONODENO', 'geometry' (LineString với ít nhất 2 tọa độ) được cung cấp.",
    });
  }

  try {
    const newRoute = new Route(newRouteData); // Mongoose will handle alias mapping automatically
    const savedRoute = await newRoute.save();
    res.status(201).json(savedRoute); // 201 Created status for successful resource creation
  } catch (error) {
    console.error("Error creating new route:", error);
    if (error.name === "ValidationError") {
      // Mongoose validation errors (e.g., required fields missing, type mismatch)
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
      // Duplicate key error for unique field (linkNo)
      return res
        .status(409) // 409 Conflict status for duplicate resource
        .json({
          message: `Tuyến đường với LINK-NO ${newRouteData.linkNo} đã tồn tại.`,
          error: error.message,
        });
    }
    res.status(500).json({
      message: "Lỗi máy chủ khi tạo tuyến đường mới.",
      error: error.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Prevent updating 'linkNo' if it's meant to be immutable, or handle it carefully
  if (updateData.linkNo !== undefined) {
    // Check for undefined, not just truthy value
    console.warn(
      `Cảnh báo: Đang cố gắng cập nhật trường linkNo (${updateData.linkNo}) cho ID ${id}. Đây thường là ID duy nhất và không nên thay đổi.`
    );
    // Option 1: Disallow update of linkNo explicitly
    // delete updateData.linkNo;
    // Option 2: Allow but ensure uniqueness (Mongoose will handle this with `unique: true` + `runValidators: true`)
  }

  // Basic validation for ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "Invalid route ID format for update." });
  }

  try {
    // Mongoose handles alias mapping for updateData as well
    const updatedRoute = await Route.findByIdAndUpdate(id, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators (e.g., 'required', 'enum', 'unique') on the update operation
      context: "query", // Important for unique validators to work correctly on update
    });

    if (!updatedRoute) {
      return res
        .status(404)
        .json({ message: `Route with ID ${id} not found for update.` });
    }
    res.status(200).json(updatedRoute);
  } catch (error) {
    console.error(`Error updating route by ID (${id}):`, error);
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
        message: `Lỗi khóa trùng lặp khi cập nhật. LINK-NO mới có thể đã tồn tại.`,
        error: error.message,
      });
    }
    res.status(500).json({
      message: "Lỗi máy chủ khi cập nhật tuyến đường.",
      error: error.message,
    });
  }
});

// --- DELETE Route by _id ---
// Example: DELETE /api/routes/60f7e1b5c7f8a1a3e4b5c6d7
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  // Basic validation for ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "Invalid route ID format for deletion." });
  }

  try {
    const deletedRoute = await Route.findByIdAndDelete(id);

    if (!deletedRoute) {
      return res
        .status(404)
        .json({ message: `Route with ID ${id} not found for deletion.` });
    }
    res
      .status(200)
      .json({ message: "Tuyến đường đã được xóa thành công.", deletedRoute });
  } catch (error) {
    console.error(`Error deleting route by ID (${id}):`, error);
    res.status(500).json({
      message: "Lỗi máy chủ khi xóa tuyến đường.",
      error: error.message,
    });
  }
});

module.exports = router;
