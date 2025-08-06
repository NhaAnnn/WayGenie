const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

// Tải biến môi trường từ file secrets.env
dotenv.config({ path: path.resolve(__dirname, "./secrets.env") });

const API_KEY = process.env.WAQI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// Định nghĩa khu vực Hà Nội
const HANOI_BOUNDING_BOX = {
  lat1: 20.5, // Giảm vĩ độ thấp nhất một chút
  lon1: 105.2, // Giảm kinh độ thấp nhất một chút
  lat2: 21.5, // Tăng vĩ độ cao nhất
  lon2: 106.3, // Tăng kinh độ cao nhất
};

// Kiểm tra biến môi trường
if (!API_KEY || !MONGODB_URI) {
  console.error("Lỗi: Thiếu WAQI_API_KEY hoặc MONGODB_URI trong file .env.");
  // Không exit ở đây để server chính có thể xử lý lỗi kết nối
}

// Kết nối MongoDB
async function connectMongoDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB from aqiFetcher.");
  } catch (err) {
    console.error("Error connecting to MongoDB from aqiFetcher:", err.message);
    throw err;
  }
}

// Định nghĩa Schema và Model AQI
const aqiSchema = new mongoose.Schema({
  stationName: { type: String, required: true },
  stationUid: { type: Number, required: true, unique: true },
  aqi: { type: Number, default: null },
  pm25: { type: Number, default: null },
  pm10: { type: Number, default: null },
  co: { type: Number, default: null },
  no2: { type: Number, default: null },
  so2: { type: Number, default: null },
  o3: { type: Number, default: null },
  time: { type: Date, default: Date.now },
  location: {
    type: { type: String, enum: ["Point"], required: false },
    coordinates: { type: [Number], required: false },
  },
});
const AQI = mongoose.model("AQI", aqiSchema, "aqis");

/**
 * Lấy dữ liệu chi tiết từ một trạm và lưu vào MongoDB.
 * @param {number} stationUid UID của trạm, có thể là số âm.
 * @param {string} stationName Tên của trạm.
 */
async function fetchAndSaveStationData(stationUid, stationName) {
  try {
    // Sửa lỗi: Loại bỏ Math.abs() để giữ nguyên UID âm
    console.log(
      `Đang lấy dữ liệu AQI cho trạm: ${stationName} (UID: ${stationUid})...`
    );
    const stationUrl = `https://api.waqi.info/feed/@${stationUid}/?token=${API_KEY}`;
    const response = await axios.get(stationUrl);
    const data = response.data;

    if (data.status === "ok" && data.data) {
      const iaqi = data.data.iaqi || {};
      let aqiValue = data.data.aqi;

      if (aqiValue === "-" || aqiValue === null) {
        console.warn(
          `⚠️ Trạm ${stationName} báo cáo AQI không hợp lệ ("-"), sẽ bỏ qua.`
        );
        return;
      }

      // Xử lý giá trị AQI
      aqiValue = typeof aqiValue === "string" ? parseFloat(aqiValue) : aqiValue;
      if (isNaN(aqiValue)) {
        console.warn(
          `⚠️ Trạm ${stationName} báo cáo AQI không phải số (${data.data.aqi}), sẽ bỏ qua.`
        );
        return;
      }

      // Lấy thông tin vị trí và các chỉ số ô nhiễm
      const geo =
        data.data.city && data.data.city.geo ? data.data.city.geo : null;
      const location = geo
        ? { type: "Point", coordinates: [geo[1], geo[0]] }
        : undefined;

      const aqiData = {
        stationName: stationName,
        stationUid: stationUid,
        aqi: aqiValue,
        pm25: iaqi.pm25?.v ?? null,
        pm10: iaqi.pm10?.v ?? null,
        co: iaqi.co?.v ?? null,
        no2: iaqi.no2?.v ?? null,
        so2: iaqi.so2?.v ?? null,
        o3: iaqi.o3?.v ?? null,
        time: new Date(),
        location: location,
      };

      // Cập nhật hoặc chèn bản ghi vào database
      await AQI.findOneAndUpdate(
        { stationUid: aqiData.stationUid },
        { $set: aqiData },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(
        `✅ Cập nhật dữ liệu AQI thành công cho trạm: ${stationName}, AQI: ${aqiData.aqi}`
      );
    } else {
      console.error(
        `❌ Dữ liệu không hợp lệ từ API cho trạm ${stationName}. Status: ${data.status}`
      );
    }
  } catch (error) {
    console.error(
      `❌ Lỗi khi lấy dữ liệu cho trạm ${stationName} (UID: ${stationUid}):`,
      error.message
    );
    if (error.response) {
      console.error(
        `Phản hồi lỗi API: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    }
  }
}

/**
 * Tìm tất cả các trạm AQI trong khu vực Hà Nội và lấy dữ liệu chi tiết.
 */
async function fetchAllHanoiAQIData() {
  try {
    await connectMongoDB();
    console.log("Đang tìm kiếm các trạm AQI ở Hà Nội...");
    const mapUrl = `https://api.waqi.info/map/bounds/?latlng=${HANOI_BOUNDING_BOX.lat1},${HANOI_BOUNDING_BOX.lon1},${HANOI_BOUNDING_BOX.lat2},${HANOI_BOUNDING_BOX.lon2}&token=${API_KEY}`;
    const mapResponse = await axios.get(mapUrl);
    const stations = mapResponse.data.data;

    if (!stations || stations.length === 0) {
      console.warn("⚠️ Không tìm thấy trạm AQI nào trong khu vực Hà Nội.");
      return;
    }

    console.log(
      `Tìm thấy ${stations.length} trạm ở Hà Nội. Đang lấy dữ liệu chi tiết...`
    );

    // Tạo một mảng các Promise để gọi đồng thời các trạm
    const fetchPromises = stations
      .filter((station) => station.uid) // Lọc các trạm không có uid
      .map((station) =>
        fetchAndSaveStationData(station.uid, station.station.name)
      );

    await Promise.all(fetchPromises);
    console.log("✅ Hoàn thành cập nhật dữ liệu AQI cho tất cả các trạm.");
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

// Xuất hàm chính để có thể sử dụng ở file server
module.exports = {
  fetchAllHanoiAQIData,
};
