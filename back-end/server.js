const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const cron = require("node-cron");

const { processData } = require("./utils/getDataRoute");
const { fetchAllHanoiAQIData } = require("./fetchAQIData");

// Tải biến môi trường từ secrets.env
dotenv.config({ path: "./secrets.env" });

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware và các routes khác
app.use(cors({ origin: "http://localhost:8081" }));
app.use(express.json());

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".csv", ".shp", ".shx", ".dbf", ".prj", ".ctf"].includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Chỉ chấp nhận file .csv và shapefile (.shp, .shx, .dbf, .prj, .ctf)"
        )
      );
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

const coordinateRoutes = require("./routes/coordinates");
const routeRoutes = require("./routes/routes");
const authRoutes = require("./routes/auth");
const aqiRoutes = require("./routes/aqis");
const simulateRoutes = require("./routes/simulate");
const scenario = require("./routes/scenarios");
const findWay = require("./routes/findWay");
const forgotPasswordRoutes = require("./routes/forgotPassword");
const SearchRoute = require("./routes/searchRoute");

app.use("/api/coordinates", coordinateRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/aqis", aqiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/simulate", simulateRoutes);
app.use("/api/find-way", findWay);
app.use("/api/scenarios", scenario);
app.use("/api/forgot", forgotPasswordRoutes);
app.use("/api/search-route", SearchRoute);

// app.post(
//   "/api/upload",
//   upload.fields([
//     { name: "nodeFile", maxCount: 1 },
//     { name: "linkFile", maxCount: 1 },
//     { name: "shapefile", maxCount: 5 },
//   ]),
//   async (req, res, next) => {
//     try {
//       console.log("Files received:", JSON.stringify(req.files, null, 2));
//       const files = req.files;

//       if (!files.nodeFile || !files.linkFile || !files.shapefile) {
//         return res.status(400).json({
//           error:
//             "Vui lòng tải lên đầy đủ node.csv, link.csv và tất cả các file shapefile (.shp, .shx, .dbf, .prj, .ctf).",
//         });
//       }

//       if (files.shapefile.length !== 5) {
//         return res.status(400).json({
//           error:
//             "Phải tải lên đúng 5 file shapefile (.shp, .shx, .dbf, .prj, .ctf).",
//         });
//       }

//       const shapefileFiles = files.shapefile.map((f) =>
//         f.originalname.toLowerCase()
//       );
//       console.log("Shapefile names:", shapefileFiles);

//       const requiredShapefileExts = [".shp", ".shx", ".dbf", ".prj", ".ctf"];
//       const missingExts = requiredShapefileExts.filter(
//         (ext) => !shapefileFiles.some((f) => f.endsWith(ext))
//       );

//       if (missingExts.length > 0) {
//         return res.status(400).json({
//           error: `Thiếu các file shapefile bắt buộc: ${missingExts.join(
//             ", "
//           )}.`,
//         });
//       }

//       console.log(
//         "Tất cả các file shapefile cần thiết đã được tải lên:",
//         shapefileFiles
//       );

//       const BASE_DATA_PATH = path.join(__dirname, "uploads");
//       const nodeFilePath = files.nodeFile[0]?.filename
//         ? path.join(BASE_DATA_PATH, files.nodeFile[0].filename)
//         : null;
//       const linkFilePath = files.linkFile[0]?.filename
//         ? path.join(BASE_DATA_PATH, files.linkFile[0].filename)
//         : null;
//       const shpFile = files.shapefile.find((f) =>
//         f.originalname.toLowerCase().endsWith(".shp")
//       );
//       const shapeFilePath = shpFile
//         ? path.join(BASE_DATA_PATH, shpFile.filename)
//         : null;

//       if (!nodeFilePath || !linkFilePath || !shapeFilePath) {
//         return res.status(400).json({
//           error: `Thiếu đường dẫn file: nodeFile=${nodeFilePath}, linkFile=${linkFilePath}, shapeFile=${shapeFilePath}`,
//         });
//       }

//       await processData(nodeFilePath, linkFilePath, shapeFilePath);

//       await Promise.all([
//         fs
//           .unlink(nodeFilePath)
//           .catch((err) =>
//             console.warn(`Không thể xóa ${nodeFilePath}: ${err.message}`)
//           ),
//         fs
//           .unlink(linkFilePath)
//           .catch((err) =>
//             console.warn(`Không thể xóa ${linkFilePath}: ${err.message}`)
//           ),
//         ...files.shapefile.map((f) =>
//           fs
//             .unlink(path.join(BASE_DATA_PATH, f.filename))
//             .catch((err) =>
//               console.warn(`Không thể xóa ${f.filename}: ${err.message}`)
//             )
//         ),
//       ]);

//       res
//         .status(200)
//         .json({ message: "Dữ liệu đã được xử lý và lưu vào MongoDB." });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

app.get("/", (req, res) => {
  res.send("WayGenie Backend API đang chạy!");
});

app.use((req, res, next) => {
  res.status(404).json({ message: "API Endpoint không tìm thấy" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Có lỗi xảy ra ở máy chủ!", error: err.message });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Kết nối MongoDB thành công!");
    // Chạy lần đầu tiên khi server khởi động
    fetchAllHanoiAQIData();

    // 3. Lên lịch chạy hàng ngày
    // Biểu thức cron: "0 2 * * *" nghĩa là chạy vào phút 0, giờ 2 (2 giờ sáng) mỗi ngày
    cron.schedule("0 2 * * *", () => {
      console.log(
        "Đang chạy tác vụ lấy dữ liệu AQI theo lịch trình hàng ngày..."
      );
      fetchAllHanoiAQIData()
        .then(() => console.log("Hoàn thành tác vụ fetch dữ liệu AQI."))
        .catch((err) => console.error("Lỗi trong tác vụ fetch AQI:", err));
    });

    app.listen(PORT, () => {
      console.log(`Server đang chạy trên cổng ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Lỗi kết nối MongoDB:", err);
    process.exit(1);
  });
