const express = require("express");
const router = express.Router();
const UserSimulation = require("../models/userSimulation");
const { verifyToken, authorizeRoles } = require("../utils/auth");

router.use(verifyToken);

/**
 * @route POST /simulate/aqis
 * @desc Applies an Air Quality Index (AQI) simulation at a specific location for the authenticated user.
 * The simulation data is stored in MongoDB.
 * @access Private (requires JWT token)
 */

// POST /simulate/aqis

router.post("/aqis", async (req, res) => {
  const userId = req.user.id;

  const {
    lon,
    lat,
    pm25,
    radiusKm,
    simulationName,
    aqi,
    pm10,
    co,
    no2,
    so2,
    o3,
  } = req.body;

  // 1. Xác thực đầu vào
  if (
    lon === undefined ||
    lat === undefined ||
    pm25 === undefined ||
    radiusKm === undefined ||
    !simulationName ||
    aqi === undefined
  ) {
    return res.status(400).json({
      success: false,
      error: "Thiếu thông tin bắt buộc cho mô phỏng AQI.",
      required: [
        "lon",
        "lat",
        "pm25",
        "radiusKm",
        "simulationName",
        "aqi",
        "pm10",
      ],
    });
  }

  // Chuyển đổi sang số và xác thực tất cả các trường
  const parsedLon = parseFloat(lon);
  const parsedLat = parseFloat(lat);
  const parsedPm25 = parseFloat(pm25);
  const parsedRadiusKm = parseFloat(radiusKm);
  const parsedAqi = parseFloat(aqi);
  const parsedPm10 = parseFloat(pm10);
  const parsedCo = parseFloat(co);
  const parsedNo2 = parseFloat(no2);
  const parsedSo2 = parseFloat(so2);
  const parsedO3 = parseFloat(o3);

  if (
    isNaN(parsedLon) ||
    isNaN(parsedLat) ||
    isNaN(parsedPm25) ||
    isNaN(parsedRadiusKm) ||
    isNaN(parsedAqi) ||
    isNaN(parsedPm10)
  ) {
    return res.status(400).json({
      success: false,
      error:
        "Tất cả các giá trị (Kinh độ, Vĩ độ, PM2.5, Bán kínhKm, AQI, PM10) phải là các số hợp lệ.",
    });
  }

  if (
    parsedPm25 < 0 ||
    parsedRadiusKm <= 0 ||
    parsedAqi < 0 ||
    parsedPm10 < 0
  ) {
    return res.status(400).json({
      success: false,
      error:
        "Các giá trị PM2.5, AQI, PM10 không thể âm. Bán kínhKm phải là số dương.",
    });
  }

  try {
    // 2. Tạo dữ liệu mô phỏng AQI với tất cả các chỉ số
    const simulatedAqiData = {
      stationId: `sim-aqi-${userId}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,
      lon: parsedLon,
      lat: parsedLat,
      aqi: parsedAqi,
      pm25: parsedPm25,
      pm10: parsedPm10,
      co: parsedCo,
      no2: parsedNo2,
      so2: parsedSo2,
      o3: parsedO3,
      radiusKm: parsedRadiusKm,
    };

    // 3. Lưu mô phỏng vào cơ sở dữ liệu
    const newSimulation = await UserSimulation.create({
      user: userId,
      simulation_type: "aqi",
      simulation_name: simulationName,
      simulation_data: simulatedAqiData,
      is_active: true,
      created_at: new Date(),
    });

    console.log(
      `Người dùng ${userId} đã áp dụng mô phỏng AQI mới: "${simulationName}" (ID Mô phỏng: ${newSimulation._id})`
    );

    res.status(201).json({
      success: true,
      message: "Mô phỏng AQI đã được áp dụng thành công.",
      simulationId: newSimulation._id,
      simulationDetails: newSimulation.simulation_data,
    });
  } catch (error) {
    console.error("Lỗi khi áp dụng mô phỏng AQI vào DB:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi máy chủ nội bộ khi áp dụng mô phỏng AQI.",
      details: error.message,
    });
  }
});

/**
 * @route POST /simulate/traffic
 * @desc Applies a traffic impact simulation (e.g., congestion, incidents) for a specific road segment.
 * For Roadblock, the segment is marked as blocked and unavailable for routing.
 * @access Private (requires JWT token)
 */
router.post("/traffic", async (req, res) => {
  const userId = req.user.id;
  const { segmentId, fromnode, tonode, VC, incident, simulationName } =
    req.body;

  if (
    !segmentId ||
    fromnode === undefined ||
    tonode === undefined ||
    VC === undefined ||
    incident === undefined ||
    !simulationName
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required information for traffic simulation.",
      required: ["segmentId", "VC", "incident", "simulationName"],
    });
  }

  const vcValue = parseFloat(VC);
  if (isNaN(vcValue) || vcValue < 0 || vcValue > 1) {
    return res.status(400).json({
      success: false,
      error: "VC must be a number between 0 and 1.",
    });
  }

  const validIncidents = ["Không", "Tai nạn", "Đóng đường"];
  if (!validIncidents.includes(incident)) {
    return res.status(400).json({
      success: false,
      error: `Invalid incident type. Must be one of: ${validIncidents.join(
        ", "
      )}.`,
    });
  }

  try {
    let isBlocked = false;
    if (incident == "Đóng đường") {
      isBlocked = true;
    } else if (incident == "Tai nạn") {
    }

    const fromNode = parseInt(fromnode);
    const toNode = parseInt(tonode);
    const simulatedTrafficData = {
      fromNode,
      toNode,
      VC: vcValue,
      incident,

      isBlocked,
      segmentKey: `${fromNode}-${toNode}`,
      reverseSegmentKey: `${toNode}-${fromNode}`,
    };

    const newSimulation = await UserSimulation.create({
      user: userId,
      simulation_type: "traffic",
      simulation_name: simulationName,
      simulation_data: simulatedTrafficData,
      is_active: true,
    });

    console.log(
      `User ${userId} applied new simulated traffic: "${simulationName}" (Simulation ID: ${newSimulation._id})`
    );
    res.status(201).json({
      success: true,
      message: "Traffic simulation applied successfully.",
      simulationId: newSimulation._id,
      simulationDetails: newSimulation.simulation_data,
    });
  } catch (error) {
    console.error("Error applying simulated traffic to DB:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while applying traffic simulation.",
      details: error.message,
    });
  }
});

/**
 * @route GET /simulate
 * @desc Retrieves all simulations created by the authenticated user.
 * @access Private (requires JWT token)
 */
router.get("/", async (req, res) => {
  const userId = req.user.id;
  try {
    const simulations = await UserSimulation.find({ user: userId }).lean();
    res.json({ success: true, simulations });
  } catch (error) {
    console.error("Error fetching user simulations:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching simulations.",
      details: error.message,
    });
  }
});

/**
 * @route GET /simulate/:id
 * @desc Retrieves a single simulation by ID for the authenticated user.
 * @access Private (requires JWT token)
 */
router.get("/:id", async (req, res) => {
  const userId = req.user.id;
  const simulationId = req.params.id;
  try {
    const simulation = await UserSimulation.findOne({
      _id: simulationId,
      user: userId,
    }).lean();
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message:
          "Simulation not found or you do not have permission to access it.",
      });
    }
    res.json({ success: true, simulation });
  } catch (error) {
    console.error(
      `Error fetching simulation ${simulationId} for user ${userId}:`,
      error
    );
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching simulation.",
      details: error.message,
    });
  }
});

/**
 * @route PUT /simulate/:id
 * @desc Updates a specific simulation owned by the authenticated user.
 * @access Private (requires JWT token)
 */
router.put("/:id", async (req, res) => {
  const userId = req.user.id;
  const simulationId = req.params.id;
  const { simulationName, simulation_data, simulation_type } = req.body;

  if (!simulationName || !simulation_data || !simulation_type) {
    return res.status(400).json({
      success: false,
      error:
        "Missing simulationName, simulation_data, or simulation_type for update.",
    });
  }

  try {
    // Validate simulation_data based on type
    let validatedData;
    if (simulation_type === "aqi") {
      const { lon, lat, aqi, pm25, pm10, co, no2, so2, o3, radiusKm } =
        simulation_data;
      if (!lon || !lat || !pm25 || !radiusKm || !aqi) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields for AQI simulation: lon, lat, aqi, pm25, pm10, co, no2, so2, o3, radiusKm.",
        });
      }
      if (
        isNaN(parseFloat(lon)) ||
        isNaN(parseFloat(lat)) ||
        isNaN(parseFloat(pm25)) ||
        isNaN(parseFloat(radiusKm))
      ) {
        return res.status(400).json({
          success: false,
          error:
            "lon, lat, pm25, pm10, co, no2, so2, o3, and radiusKm must be valid numbers.",
        });
      }
      if (parseFloat(radiusKm) <= 0 || parseFloat(pm25) < 0) {
        return res.status(400).json({
          success: false,
          error:
            "radiusKm must be positive, and pm25, pm10, co, no2, so2, o3 cannot be negative.",
        });
      }
      validatedData = {
        aqi: parseFloat(aqi),
        lon: parseFloat(lon),
        lat: parseFloat(lat),
        pm25: parseFloat(pm25),
        pm10: parseFloat(pm10),
        co: parseFloat(co),
        no2: parseFloat(no2),
        so2: parseFloat(so2),
        o3: parseFloat(o3),
        radiusKm: parseFloat(radiusKm),
      };
    } else if (simulation_type === "traffic") {
      const { fromNode, toNode, travelTimeMultiplier, VC } = simulation_data;
      if (!fromNode || !toNode || !travelTimeMultiplier || VC === undefined) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields for traffic simulation: fromNode, toNode, travelTimeMultiplier, VC.",
        });
      }
      if (
        isNaN(parseInt(fromNode)) ||
        isNaN(parseInt(toNode)) ||
        isNaN(parseFloat(travelTimeMultiplier)) ||
        isNaN(parseFloat(VC))
      ) {
        return res.status(400).json({
          success: false,
          error:
            "fromNode, toNode, travelTimeMultiplier, and VC must be valid numbers.",
        });
      }
      if (
        parseFloat(travelTimeMultiplier) <= 0 ||
        parseFloat(VC) < 0 ||
        parseFloat(VC) > 1
      ) {
        return res.status(400).json({
          success: false,
          error:
            "travelTimeMultiplier must be positive, and VC must be between 0 and 1.",
        });
      }
      validatedData = {
        fromNode: parseInt(fromNode),
        toNode: parseInt(toNode),
        travelTimeMultiplier: parseFloat(travelTimeMultiplier),
        VC: parseFloat(VC), // Đảm bảo VC được cập nhật
      };
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid simulation_type. Must be 'aqi' or 'traffic'.",
      });
    }

    const updatedSimulation = await UserSimulation.findOneAndUpdate(
      { _id: simulationId, user: userId },
      {
        simulation_name: simulationName,
        simulation_data: validatedData,
        simulation_type,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedSimulation) {
      return res.status(404).json({
        success: false,
        message:
          "Simulation not found or you do not have permission to update it.",
      });
    }

    console.log(`User ${userId} updated simulation ID: ${simulationId}`);
    res.json({
      success: true,
      message: "Simulation updated successfully.",
      simulation: updatedSimulation,
    });
  } catch (error) {
    console.error("Error updating simulation:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while updating simulation.",
      details: error.message,
    });
  }
});

/**
 * @route PUT /simulate/:id/status
 * @desc Toggles the 'is_active' status of a simulation.
 * @access Private (requires JWT token)
 */
router.put("/:id/status", async (req, res) => {
  const userId = req.user.id;
  const simulationId = req.params.id;
  const { is_active } = req.body;

  if (is_active === undefined || typeof is_active !== "boolean") {
    return res.status(400).json({
      success: false,
      error:
        "Invalid 'is_active' status provided. It must be a boolean (true/false).",
    });
  }

  try {
    const updatedSimulation = await UserSimulation.findOneAndUpdate(
      { _id: simulationId, user: userId },
      { is_active, updatedAt: Date.now() },
      { new: true }
    ).lean();

    if (!updatedSimulation) {
      return res.status(404).json({
        success: false,
        error:
          "Simulation not found or you do not have permission to update it.",
      });
    }

    console.log(
      `User ${userId} toggled simulation ID ${simulationId} to active: ${is_active}`
    );
    res.json({
      success: true,
      message: `Simulation with ID ${simulationId} status updated to ${is_active}.`,
      simulation: updatedSimulation,
    });
  } catch (error) {
    console.error("Error toggling simulation active status:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while updating simulation status.",
      details: error.message,
    });
  }
});

/**
 * @route DELETE /simulate/reset
 * @desc Deletes ALL simulations owned by the authenticated user.
 * @access Private (requires JWT token)
 */
router.delete("/reset", async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await UserSimulation.deleteMany({ user: userId });

    console.log(
      `User ${userId} reset all their simulations. Deleted ${result.deletedCount} documents.`
    );
    res.json({
      success: true,
      message: `All ${result.deletedCount} simulations for user ${userId} have been reset.`,
    });
  } catch (error) {
    console.error(`Error resetting simulations for user ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: "Internal server error while resetting simulations.",
      details: error.message,
    });
  }
});

/**
 * @route DELETE /simulate/:id
 * @desc Deletes a specific simulation owned by the authenticated user.
 * @access Private (requires JWT token)
 */
router.delete("/:id", async (req, res) => {
  const userId = req.user.id;
  const simulationId = req.params.id;

  try {
    const result = await UserSimulation.deleteOne({
      _id: simulationId,
      user: userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error:
          "Simulation not found or you do not have permission to delete it.",
      });
    }

    console.log(`User ${userId} deleted simulation ID: ${simulationId}`);
    res.json({
      success: true,
      message: `Simulation with ID ${simulationId} deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting simulation from DB:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while deleting simulation.",
      details: error.message,
    });
  }
});

/**
 * Fetches all ACTIVE AQI simulation configurations for a given user.
 * @param {string} userId - The ID of the user.
 * @returns {Array<Object>} An array of active AQI simulation data.
 */
async function getSimulatedAqisForUser(userId) {
  try {
    const records = await UserSimulation.find({
      user: userId,
      simulation_type: "aqi",
      is_active: true,
    })
      .select("simulation_data simulation_name _id")
      .lean();

    return records.map((record) => {
      const data = record.simulation_data;
      return {
        _id: record._id,
        simulation_name: record.simulation_name,
        stationId: data.stationId,
        lon: parseFloat(data.lon),
        lat: parseFloat(data.lat),
        pm25: parseFloat(data.pm25),
        radiusKm: parseFloat(data.radiusKm),
        aqi: data.aqi,
        pm10: data.pm10,
        co: data.co,
        so2: data.so2,
        no2: data.no2,
        o3: data.o3,
        location: {
          type: "Point",
          coordinates: [parseFloat(data.lon), parseFloat(data.lat)],
        },
        isSimulated: true,
      };
    });
  } catch (error) {
    console.error(
      `Error fetching active simulated AQIs for user ${userId}:`,
      error
    );
    return [];
  }
}

/**
 * Fetches all ACTIVE traffic impact simulation configurations for a given user.
 * @param {string} userId - The ID of the user.
 * @returns {Map<string, Object>} A Map where key is segment 'fromNode-toNode' and value is the traffic impact object.
 */
async function getSimulatedTrafficImpactsForUser(userId) {
  try {
    const records = await UserSimulation.find({
      user: userId,
      simulation_type: "traffic",
      is_active: true,
    })
      .select("simulation_data simulation_name _id")
      .lean();

    const trafficMap = new Map();
    records.forEach((record) => {
      const data = record.simulation_data;
      const trafficImpact = {
        _id: record._id,
        simulation_name: record.simulation_name,
        fromNode: data.fromNode,
        toNode: data.toNode,
        VC: parseFloat(data.VC),
        incident: data.incident,
        travelTimeMultiplier: data.travelTimeMultiplier
          ? parseFloat(data.travelTimeMultiplier)
          : null,
        isBlocked: data.isBlocked || false,
        isSimulated: true,
      };
      trafficMap.set(data.segmentKey, trafficImpact);
      trafficMap.set(data.reverseSegmentKey, trafficImpact);
    });
    return trafficMap;
  } catch (error) {
    console.error(
      `Error fetching active simulated traffic for user ${userId}:`,
      error
    );
    return new Map();
  }
}

module.exports = router;
module.exports.getSimulatedAqisForUser = getSimulatedAqisForUser;
module.exports.getSimulatedTrafficImpactsForUser =
  getSimulatedTrafficImpactsForUser;
