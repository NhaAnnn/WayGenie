const express = require("express");
const router = express.Router();
const SearchRoute = require("../models/searchroute");

router.post("/", async (req, res) => {
  const { userID, description, time, dateKey } = req.body;
  try {
    // Kiểm tra các trường bắt buộc
    if (!userID || !dateKey) {
      return res.status(400).json({ error: "userID và dateKey là bắt buộc" });
    }

    // Validate định dạng dateKey (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateKey)) {
      return res
        .status(400)
        .json({ error: "dateKey phải có định dạng YYYY-MM-DD" });
    }

    // Ép dateKey khớp với ngày hiện tại (UTC+7)
    const serverDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    if (dateKey !== serverDate) {
      console.warn(`Client sent dateKey ${dateKey}, forcing to ${serverDate}`);
      // Ép dateKey = serverDate
      req.body.dateKey = serverDate;
    }

    // Validate time (phải là ISO 8601)
    const parsedTime = time ? new Date(time) : new Date();
    if (time && isNaN(parsedTime)) {
      return res.status(400).json({ error: "time phải là định dạng ISO 8601" });
    }

    // Validate description (tối đa 500 ký tự)
    if (description && description.length > 500) {
      return res
        .status(400)
        .json({ error: "description không được vượt quá 500 ký tự" });
    }

    // Tạo bản ghi mới
    const searchRoute = new SearchRoute({
      userID,
      description: description || "",
      time: parsedTime,
      dateKey: req.body.dateKey, // Sử dụng dateKey đã sửa
    });
    await searchRoute.save();

    res.status(200).json({
      message: "Tìm kiếm đã được lưu",
      data: searchRoute,
    });
  } catch (error) {
    console.error("MongoDB error:", error);
    res.status(500).json({
      error: "Lỗi khi lưu tìm kiếm",
      details: error.message,
    });
  }
});
router.get("/stats/day/:date", async (req, res) => {
  const { date } = req.params;
  try {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res
        .status(400)
        .json({ error: "date phải có định dạng YYYY-MM-DD" });
    }

    const stats = await SearchRoute.aggregate([
      {
        $match: {
          dateKey: date,
        },
      },
      { $group: { _id: "$userID", totalSearches: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          uniqueUsers: { $sum: 1 },
          totalRequests: { $sum: "$totalSearches" },
        },
      },
    ]);

    const result = stats[0] || { uniqueUsers: 0, totalRequests: 0 };
    res.status(200).json({
      date,
      count: result.totalRequests,
      uniqueUsers: result.uniqueUsers,
      totalRequests: result.totalRequests,
    });
  } catch (error) {
    res.status(500).json({
      error: "Lỗi khi thống kê theo ngày",
      details: error.message,
    });
  }
});

router.get("/stats/month/:yearMonth", async (req, res) => {
  const { yearMonth } = req.params;
  try {
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(yearMonth)) {
      return res
        .status(400)
        .json({ error: "yearMonth phải có định dạng YYYY-MM" });
    }

    const stats = await SearchRoute.aggregate([
      {
        $match: {
          dateKey: { $regex: `^${yearMonth}`, $options: "i" },
        },
      },
      { $group: { _id: "$userID", totalSearches: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          uniqueUsers: { $sum: 1 },
          totalRequests: { $sum: "$totalSearches" },
        },
      },
    ]);

    const result = stats[0] || { uniqueUsers: 0, totalRequests: 0 };
    res.status(200).json({
      month: yearMonth,
      count: result.totalRequests,
      uniqueUsers: result.uniqueUsers,
      totalRequests: result.totalRequests,
    });
  } catch (error) {
    res.status(500).json({
      error: "Lỗi khi thống kê theo tháng",
      details: error.message,
    });
  }
});

router.get("/stats/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.dateKey) {
      query.dateKey = { $regex: `^${req.query.dateKey}`, $options: "i" };
    }
    if (req.query.userID) {
      query.userID = req.query.userID;
    }

    const searchRoutes = await SearchRoute.find(query)
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await SearchRoute.countDocuments(query);

    if (!searchRoutes.length) {
      return res.status(200).json({
        message: "Không có dữ liệu tìm kiếm",
        data: [],
        total,
        page,
        pages: 0,
      });
    }
    res.status(200).json({
      data: searchRoutes,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      error: "Lỗi khi lấy tất cả tìm kiếm",
      details: error.message,
    });
  }
});

module.exports = router;
