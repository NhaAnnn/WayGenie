const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");

dotenv.config({ path: path.resolve(__dirname, "./secrets.env") });

const API_KEY = process.env.WAQI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// Coordinates for Hanoi (approximately, for bounding box)
// You might need to adjust these to cover the entire Hanoi area accurately
const HANOI_BOUNDING_BOX = {
  lat1: 20.8,
  lon1: 105.5,
  lat2: 21.2,
  lon2: 106.0,
};

const FETCH_INTERVAL_MS = 600000; // 10 minutes (600000 ms)

if (!API_KEY) {
  console.error(
    "Lỗi: Vui lòng thiết lập biến môi trường WAQI_API_KEY trong file .env."
  );
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error(
    'Lỗi: Vui lòng thiết lập biến môi trường MONGODB_URI trong file .env. Ví dụ: MONGODB_URI="mongodb://localhost:27017/aqiDB"'
  );
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });

const aqiSchema = new mongoose.Schema({
  stationName: { type: String, required: true },
  stationUid: { type: Number, required: true, unique: true },
  aqi: { type: Number, default: null }, // Changed to default: null
  pm25: { type: Number, default: null },
  pm10: { type: Number, default: null },
  co: { type: Number, default: null },
  no2: { type: Number, default: null },
  so2: { type: Number, default: null },
  o3: { type: Number, default: null },
  time: { type: Date, default: Date.now },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: false,
    },
    coordinates: {
      type: [Number],
      required: false,
    },
  },
});

aqiSchema.index({ stationUid: 1, time: -1 });

// ***************************************************************
// MODIFICATION START HERE
// ***************************************************************

// Change 'AQI' to 'AQIS_DATA' or any desired uppercase name for the collection
const AQI = mongoose.model("AQI", aqiSchema, "AQIS_DATA");

// ***************************************************************
// MODIFICATION END HERE
// ***************************************************************

async function fetchAllHanoiAQIData() {
  try {
    console.log("Đang tìm kiếm các trạm AQI ở Hà Nội...");
    const mapUrl = `https://api.waqi.info/map/bounds/?latlng=${HANOI_BOUNDING_BOX.lat1},${HANOI_BOUNDING_BOX.lon1},${HANOI_BOUNDING_BOX.lat2},${HANOI_BOUNDING_BOX.lon2}&token=${API_KEY}`;
    const mapResponse = await axios.get(mapUrl);
    const stations = mapResponse.data.data;

    if (!stations || stations.length === 0) {
      console.warn(
        "⚠️ Không tìm thấy trạm AQI nào trong khu vực Hà Nội đã định."
      );
      return;
    }

    console.log(
      `Tìm thấy ${stations.length} trạm ở Hà Nội. Đang lấy dữ liệu chi tiết...`
    );

    for (const station of stations) {
      if (station.uid) {
        // Add a small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay per station
        await fetchAndSaveStationData(station.uid, station.station.name);
      }
    }
  } catch (error) {
    console.error("❌ Lỗi khi tìm kiếm các trạm ở Hà Nội:", error.message);
    if (error.response) {
      console.error(
        "Phản hồi lỗi API:",
        error.response.status,
        error.response.data
      );
    }
  }
}

async function fetchAndSaveStationData(stationUid, stationName) {
  try {
    console.log(
      `  Đang lấy dữ liệu AQI cho trạm: ${stationName} (UID: ${stationUid})...`
    );
    const stationUrl = `https://api.waqi.info/feed/@${stationUid}/?token=${API_KEY}`;
    const response = await axios.get(stationUrl);
    const data = response.data;

    if (data.status === "ok" && data.data) {
      const iaqi = data.data.iaqi || {};
      let aqiValue = data.data.aqi; // Use `let` to allow reassignment

      // Explicitly check if aqiValue is the problematic string "-"
      if (aqiValue === "-") {
        console.warn(
          `    ⚠️ Trạm ${stationName} báo cáo AQI là "-", sẽ lưu null.`
        );
        aqiValue = null; // Set to null if it's the problematic string
      } else {
        // Ensure it's a number, if not, try to parse it
        aqiValue =
          typeof aqiValue === "string" ? parseFloat(aqiValue) : aqiValue;
        // If parseFloat results in NaN (Not-a-Number), set to null
        if (isNaN(aqiValue)) {
          console.warn(
            `    ⚠️ Trạm ${stationName} báo cáo AQI không phải số (${data.data.aqi}), sẽ lưu null.`
          );
          aqiValue = null;
        }
      }

      const geo =
        data.data.city && data.data.city.geo ? data.data.city.geo : null;
      const location = geo
        ? { type: "Point", coordinates: [geo[1], geo[0]] }
        : undefined;

      const aqiData = {
        stationName: stationName,
        stationUid: stationUid,
        aqi: aqiValue, // Now potentially null
        pm25: iaqi.pm25 ? iaqi.pm25.v : null,
        pm10: iaqi.pm10 ? iaqi.pm10.v : null,
        co: iaqi.co ? iaqi.co.v : null,
        no2: iaqi.no2 ? iaqi.no2.v : null,
        so2: iaqi.so2 ? iaqi.so2.v : null,
        o3: iaqi.o3 ? iaqi.o3.v : null,
        time: new Date(),
        location: location,
      };

      // We no longer require AQI to be non-null for saving, as we explicitly handle it as null.
      // However, stationName and stationUid are still critical.
      if (aqiData.stationName && aqiData.stationUid) {
        const newAQI = new AQI(aqiData);
        await newAQI.save();
        console.log(
          "    ✅ Dữ liệu AQI đã được lưu vào MongoDB:",
          aqiData.stationName,
          "AQI:",
          aqiData.aqi
        );
      } else {
        console.warn(
          "    ⚠️ Dữ liệu AQI không đầy đủ hoặc không hợp lệ cho trạm",
          stationName,
          ":",
          aqiData
        );
      }
    } else {
      console.error(
        "    ❌ Dữ liệu không hợp lệ từ WAQI API cho trạm",
        stationName,
        ". Status:",
        data.status,
        "Dữ liệu:",
        data.data
      );
    }
  } catch (error) {
    console.error(
      "  ❌ Lỗi khi lấy hoặc lưu dữ liệu cho trạm",
      stationName,
      ":",
      error.message
    );
    if (error.response) {
      console.error(
        "  Phản hồi lỗi API cho trạm",
        stationName,
        ":",
        error.response.status,
        error.response.data
      );
    }
  }
}

// ***************************************************************
// 5. Khởi chạy ứng dụng
// ***************************************************************

// Gọi hàm fetch dữ liệu lần đầu ngay lập tức
fetchAllHanoiAQIData();
// Sau đó gọi hàm fetch dữ liệu mỗi 10 phút
setInterval(fetchAllHanoiAQIData, FETCH_INTERVAL_MS);

// Xử lý đóng kết nối MongoDB khi ứng dụng thoát
process.on("SIGINT", async () => {
  console.log("\nĐang đóng kết nối MongoDB...");
  await mongoose.disconnect();
  console.log("Kết nối MongoDB đã đóng.");
  process.exit(0);
});
