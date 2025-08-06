const express = require("express");
const router = express.Router();
const Scenario = require("../models/scenario");
const { verifyToken } = require("../utils/auth");

router.use(verifyToken);

/**
 * @route GET /scenarios
 * @desc Retrieves all scenarios created by the authenticated user.
 * @access Private (requires JWT token)
 */
router.get("/", async (req, res) => {
  const userId = req.user.id;
  try {
    const scenarios = await Scenario.find({ user: userId }).lean();
    res.json({ success: true, scenarios });
  } catch (error) {
    console.error("Error fetching user scenarios:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching scenarios.",
      details: error.message,
    });
  }
});

/**
 * @route POST /scenarios
 * @desc Creates a new scenario with simulations for the authenticated user.
 * @access Private (requires JWT token)
 */
router.post("/", async (req, res) => {
  const userId = req.user.id;
  const { name, simulations, is_active } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: "Thiếu tên kịch bản.",
      required: ["name"],
    });
  }

  if (!Array.isArray(simulations)) {
    return res.status(400).json({
      success: false,
      error: "Simulations phải là một mảng.",
    });
  }

  try {
    const scenario = new Scenario({
      user: userId,
      name,
      simulations,
      is_active: is_active !== undefined ? is_active : false,
    });
    await scenario.save();

    console.log(
      `Người dùng ${userId} đã tạo kịch bản mới: "${name}" (ID Kịch bản: ${scenario._id})`
    );

    res.status(201).json({
      success: true,
      message: "Kịch bản đã được tạo thành công.",
      scenarioId: scenario._id,
      scenarioDetails: scenario,
    });
  } catch (error) {
    console.error("Lỗi khi tạo kịch bản:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi máy chủ nội bộ khi tạo kịch bản.",
      details: error.message,
    });
  }
});

/**
 * @route GET /scenarios/:id
 * @desc Retrieves a single scenario by ID for the authenticated user.
 * @access Private (requires JWT token)
 */
router.get("/:id", async (req, res) => {
  const userId = req.user.id;
  const scenarioId = req.params.id;
  try {
    const scenario = await Scenario.findOne({
      _id: scenarioId,
      user: userId,
    }).lean();
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: "Kịch bản không tồn tại hoặc bạn không có quyền truy cập.",
      });
    }
    res.json({ success: true, scenario });
  } catch (error) {
    console.error(
      `Lỗi khi lấy kịch bản ${scenarioId} cho người dùng ${userId}:`,
      error
    );
    res.status(500).json({
      success: false,
      error: "Lỗi máy chủ nội bộ khi lấy kịch bản.",
      details: error.message,
    });
  }
});

/**
 * @route PUT /scenarios/:id
 * @desc Updates a specific scenario owned by the authenticated user.
 * @access Private (requires JWT token)
 */
router.put("/:id", async (req, res) => {
  const userId = req.user.id;
  const scenarioId = req.params.id;
  const { name, simulations } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: "Thiếu tên kịch bản để cập nhật.",
    });
  }

  if (!Array.isArray(simulations)) {
    return res.status(400).json({
      success: false,
      error: "Simulations phải là một mảng.",
    });
  }

  try {
    const updatedScenario = await Scenario.findOneAndUpdate(
      { _id: scenarioId, user: userId },
      { name, simulations, updatedAt: Date.now() },
      { new: true }
    ).lean();

    if (!updatedScenario) {
      return res.status(404).json({
        success: false,
        message: "Kịch bản không tồn tại hoặc bạn không có quyền cập nhật.",
      });
    }

    console.log(`Người dùng ${userId} đã cập nhật kịch bản ID: ${scenarioId}`);
    res.json({
      success: true,
      message: "Kịch bản đã được cập nhật thành công.",
      scenario: updatedScenario,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật kịch bản:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi máy chủ nội bộ khi cập nhật kịch bản.",
      details: error.message,
    });
  }
});

/**
 * @route DELETE /scenarios/:id
 * @desc Deletes a specific scenario owned by the authenticated user.
 * @access Private (requires JWT token)
 */
router.delete("/:id", async (req, res) => {
  const userId = req.user.id;
  const scenarioId = req.params.id;

  try {
    const result = await Scenario.deleteOne({
      _id: scenarioId,
      user: userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Kịch bản không tồn tại hoặc bạn không có quyền xóa.",
      });
    }

    console.log(`Người dùng ${userId} đã xóa kịch bản ID: ${scenarioId}`);
    res.json({
      success: true,
      message: `Kịch bản với ID ${scenarioId} đã được xóa thành công.`,
    });
  } catch (error) {
    console.error("Lỗi khi xóa kịch bản từ DB:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi máy chủ nội bộ khi xóa kịch bản.",
      details: error.message,
    });
  }
});

/**
 * @route PUT /scenarios/:id/status
 * @desc Toggles the 'is_active' status of a scenario.
 * @access Private (requires JWT token)
 */
router.put("/:id/status", async (req, res) => {
  const userId = req.user.id;
  const scenarioId = req.params.id;
  const { is_active } = req.body;

  if (is_active === undefined || typeof is_active !== "boolean") {
    return res.status(400).json({
      success: false,
      error:
        "Trạng thái 'is_active' không hợp lệ. Phải là boolean (true/false).",
    });
  }

  try {
    // Tắt tất cả kịch bản khác nếu đang bật một kịch bản mới
    if (is_active) {
      await Scenario.updateMany(
        { _id: { $ne: scenarioId }, user: userId, is_active: true },
        { is_active: false, updatedAt: Date.now() }
      );
    }

    const updatedScenario = await Scenario.findOneAndUpdate(
      { _id: scenarioId, user: userId },
      { is_active, updatedAt: Date.now() },
      { new: true }
    ).lean();

    if (!updatedScenario) {
      return res.status(404).json({
        success: false,
        error: "Kịch bản không tồn tại hoặc bạn không có quyền cập nhật.",
      });
    }

    console.log(
      `Người dùng ${userId} đã thay đổi trạng thái kịch bản ID ${scenarioId} thành: ${is_active}`
    );
    res.json({
      success: true,
      message: `Trạng thái kịch bản với ID ${scenarioId} đã được cập nhật thành ${is_active}.`,
      scenario: updatedScenario,
    });
  } catch (error) {
    console.error("Lỗi khi thay đổi trạng thái kịch bản:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi máy chủ nội bộ khi cập nhật trạng thái kịch bản.",
      details: error.message,
    });
  }
});

/**
 * Fetches all ACTIVE scenario configurations for a given user.
 * @param {string} userId - The ID of the user.
 * @returns {Array<Object>} An array of active scenario data.
 */
async function getActiveScenariosForUser(userId) {
  try {
    const records = await Scenario.find({
      user: userId,
      is_active: true,
    })
      .select("name simulations _id")
      .lean();

    return records.map((record) => ({
      _id: record._id,
      name: record.name,
      simulations: record.simulations.map((sim) => ({
        simulation_type: sim.simulation_type,
        simulation_name: sim.simulation_name,
        simulation_data: sim.simulation_data,
      })),
      isSimulated: true,
    }));
  } catch (error) {
    console.error(`Error fetching active scenarios for user ${userId}:`, error);
    return [];
  }
}

module.exports = router;
module.exports.getActiveScenariosForUser = getActiveScenariosForUser;
