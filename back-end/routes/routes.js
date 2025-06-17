// routes/routes.js
const express = require("express");
const router = express.Router();
const Route = require("../models/routes");
const Coordinate = require("../models/coordinates"); // Import Coordinate model
const GraphService = require("../utils/GraphService"); // Import GraphService

// Middleware đơn giản để log thời gian truy cập API (tùy chọn)
router.use((req, res, next) => {
  console.log(
    `[Routes API] ${req.method} ${
      req.originalUrl
    } at ${new Date().toISOString()}`
  );
  next();
});

// --- GET All Routes ---
// Có thể thêm bộ lọc và phân trang (ví dụ: theo TSYSSET)
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.tsysset) {
      // Tìm kiếm các route chứa một TSYSSET cụ thể (ví dụ: 'CAR' trong "B2,BIKE,CAR,Co")
      query.TSYSSET = { $regex: new RegExp(req.query.tsysset, "i") };
    }
    const routes = await Route.find(query);
    res.status(200).json(routes);
  } catch (error) {
    console.error("Lỗi khi lấy tất cả tuyến đường:", error);
    res.status(500).json({
      message: "Lỗi máy chủ khi lấy tuyến đường",
      error: error.message,
    });
  }
});

// --- GET Route by MongoDB _id ---
router.get("/:id", async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: "Không tìm thấy tuyến đường" });
    }
    res.status(200).json(route);
  } catch (error) {
    console.error("Lỗi khi lấy tuyến đường theo ID:", error);
    res.status(500).json({
      message: "Lỗi máy chủ khi lấy tuyến đường",
      error: error.message,
    });
  }
});

// --- GET Route by LINK-NO (alias linkNo) ---
router.get("/by-linkno/:linkNo", async (req, res) => {
  try {
    const route = await Route.findOne({
      "LINK:NO": parseInt(req.params.linkNo),
    }); // Sử dụng tên trường gốc của MongoDB
    if (!route) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tuyến đường với LINK-NO này" });
    }
    res.status(200).json(route);
  } catch (error) {
    console.error("Lỗi khi lấy tuyến đường theo LINK-NO:", error);
    res.status(500).json({
      message: "Lỗi máy chủ khi lấy tuyến đường",
      error: error.message,
    });
  }
});

// --- GET Routes by FROMNODENO and TONODENO ---
router.get("/by-nodes/:fromNode/:toNode", async (req, res) => {
  try {
    const fromNode = parseInt(req.params.fromNode);
    const toNode = parseInt(req.params.toNode);

    const routes = await Route.find({ FROMNODENO: fromNode, TONODENO: toNode });
    if (routes.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tuyến đường nào giữa các nút này" });
    }
    res.status(200).json(routes);
  } catch (error) {
    console.error("Lỗi khi lấy tuyến đường theo nút:", error);
    res.status(500).json({
      message: "Lỗi máy chủ khi lấy tuyến đường",
      error: error.message,
    });
  }
});

// --- POST Create New Route (Nếu bạn cần, ví dụ: Admin nhập thủ công) ---
router.post("/", async (req, res) => {
  const newRouteData = req.body; // Dữ liệu sẽ cần khớp với schema

  // Xử lý các trường có setter (như lengthKm, v0PrtKmH)
  if (newRouteData.LENGTH) {
    newRouteData.lengthKm = parseFloat(newRouteData.LENGTH.replace("km", ""));
    delete newRouteData.LENGTH; // Xóa trường gốc để tránh trùng lặp
  }
  if (newRouteData.V0PRT) {
    newRouteData.v0PrtKmH = parseFloat(newRouteData.V0PRT.replace("km/h", ""));
    delete newRouteData.V0PRT;
  }
  // Tương tự cho các trường VCUR_PRTSYS và IMP_PRTSYS nếu bạn gửi chúng dưới dạng string có đơn vị từ frontend

  const newRoute = new Route(newRouteData);

  try {
    const savedRoute = await newRoute.save();
    res.status(201).json(savedRoute);
  } catch (error) {
    console.error("Lỗi khi tạo tuyến đường mới:", error);
    res
      .status(400)
      .json({ message: "Không thể tạo tuyến đường mới", error: error.message });
  }
});

// --- NEW: Multi-Criteria Route Finding API ---
router.post("/find-multi-criteria", async (req, res) => {
  const { startLon, startLat, endLon, endLat, criteriaWeights, mode } =
    req.body;

  if (
    !startLon ||
    !startLat ||
    !endLon ||
    !endLat ||
    !criteriaWeights ||
    !mode
  ) {
    return res.status(400).json({
      message: "Thiếu thông tin bắt buộc để tìm tuyến đường đa tiêu chí.",
    });
  }

  try {
    // 1. Tìm Node gần nhất với tọa độ Start/End
    // Đối với ứng dụng thực tế, bạn sẽ cần một chỉ mục không gian (2dsphere) trên collection COORDINATES
    // và sử dụng truy vấn địa lý như $near hoặc $geoWithin.
    // Giả định bạn có cách để tìm NODE-NO từ lon/lat
    const startCoordDoc = await Coordinate.findOne({
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [startLon, startLat],
          },
          $maxDistance: 1000, // Tìm trong bán kính 1km
        },
      },
    }).lean(); // Sử dụng .lean() để lấy POJO (Plain Old JavaScript Object) thay vì Mongoose document

    const endCoordDoc = await Coordinate.findOne({
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [endLon, endLat],
          },
          $maxDistance: 1000, // Tìm trong bán kính 1km
        },
      },
    }).lean();

    if (!startCoordDoc || !endCoordDoc) {
      return res.status(404).json({
        message: "Không tìm thấy nút gần điểm bắt đầu hoặc điểm kết thúc.",
      });
    }

    const startNodeNo = startCoordDoc["NODE-NO"];
    const endNodeNo = endCoordDoc["NODE-NO"];

    console.log(
      `Tìm đường từ NODE-NO ${startNodeNo} đến NODE-NO ${endNodeNo} với tiêu chí:`,
      criteriaWeights
    );

    // 2. Lấy tất cả Nodes và Routes để xây dựng đồ thị
    const allCoordinates = await Coordinate.find({}).lean();
    const allRoutes = await Route.find({}).lean();

    // 3. Sử dụng GraphService để tìm đường
    const result = GraphService.findMultiCriteriaRoute(
      startNodeNo,
      endNodeNo,
      allCoordinates,
      allRoutes,
      criteriaWeights,
      mode // Chế độ di chuyển (ví dụ: 'driving', 'cycling')
    );

    if (result && result.path.length > 0) {
      // Chuyển đổi đường dẫn thành GeoJSON LineString
      const routeCoordinates = result.path.map((nodeId) => {
        const coord = allCoordinates.find((c) => c["NODE-NO"] === nodeId);
        return [coord.XCOORD, coord.YCOORD]; // [longitude, latitude]
      });

      const geoJsonRoute = {
        type: "Feature",
        properties: {
          duration: result.totalDuration, // Tổng thời gian
          distance: result.totalDistance * 1000, // Tổng khoảng cách (km -> m)
          cost: result.totalCost, // Tổng chi phí đa tiêu chí
          // Có thể thêm các thuộc tính khác như các đoạn đường (legs, steps)
          // nếu bạn muốn frontend hiển thị chi tiết hơn
        },
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates,
        },
      };

      // Trả về một mảng GeoJSONs, dù chỉ có một tuyến đường cho multi-criteria
      res.status(200).json([geoJsonRoute]);
    } else {
      res.status(404).json({
        message: "Không tìm thấy tuyến đường với các tiêu chí đã chọn.",
      });
    }
  } catch (error) {
    console.error("Lỗi khi tìm tuyến đường đa tiêu chí:", error);
    res.status(500).json({
      message: "Lỗi máy chủ khi tìm tuyến đường đa tiêu chí.",
      error: error.message,
    });
  }
});

module.exports = router;
