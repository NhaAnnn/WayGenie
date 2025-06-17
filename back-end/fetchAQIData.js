const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "./secrets.env") });

// Lấy API Key từ biến môi trường hoặc đặt giá trị mặc định/placeholder
const API_KEY = process.env.WAQI_API_KEY;
// Lấy MongoDB URI từ biến môi trường
const MONGODB_URI = process.env.MONGODB_URI;

const CITY = "hanoi"; // Bạn có thể thay đổi thành tên thành phố khác hoặc sử dụng tọa độ.
const FETCH_INTERVAL_MS = 600000; // 10 phút (600000 ms)

// Kiểm tra nếu API_KEY chưa được cung cấp
if (!API_KEY) {
  console.error(
    "Lỗi: Vui lòng thiết lập biến môi trường WAQI_API_KEY trong file .env."
  );

  process.exit(1); // Thoát ứng dụng nếu không có API Key
}

// Kiểm tra nếu MONGODB_URI chưa được cung cấp
if (!MONGODB_URI) {
  console.error(
    'Lỗi: Vui lòng thiết lập biến môi trường MONGODB_URI trong file .env. Ví dụ: MONGODB_URI="mongodb://localhost:27017/aqiDB"'
  );
  process.exit(1); // Thoát ứng dụng nếu không có MongoDB URI
}
const url = `https://api.waqi.info/feed/${CITY}/?token=${API_KEY}`;

mongoose
  .connect(MONGODB_URI, {
    // Sử dụng MONGODB_URI từ biến môi trường
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message); // Sử dụng err.message để in lỗi cụ thể hơn
    process.exit(1); // Thoát ứng dụng nếu không kết nối được DB
  });

const aqiSchema = new mongoose.Schema({
  city: { type: String, required: true },
  aqi: { type: Number, required: true },
  pm25: { type: Number, default: null },
  pm10: { type: Number, default: null },
  co: { type: Number, default: null },
  no2: { type: Number, default: null },
  so2: { type: Number, default: null },
  o3: { type: Number, default: null },
  time: { type: Date, default: Date.now },
});

// Thêm chỉ mục để tìm kiếm hiệu quả hơn theo thành phố và thời gian
aqiSchema.index({ city: 1, time: -1 });

const AQI = mongoose.model("AQI", aqiSchema);

// ***************************************************************
// 4. Hàm lấy dữ liệu từ WAQI API
// ***************************************************************

async function fetchAQIData() {
  try {
    console.log(`Đang lấy dữ liệu AQI cho ${CITY} từ WAQI API...`);
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === "ok" && data.data) {
      const iaqi = data.data.iaqi || {}; // Đảm bảo iaqi tồn tại
      const cityDetails = data.data.city || {}; // Đảm bảo city tồn tại

      const aqiData = {
        city: cityDetails.name || CITY, // Sử dụng tên từ API nếu có, nếu không thì dùng tên đã định nghĩa
        aqi: data.data.aqi,
        pm25: iaqi.pm25 ? iaqi.pm25.v : null,
        pm10: iaqi.pm10 ? iaqi.pm10.v : null,
        co: iaqi.co ? iaqi.co.v : null,
        no2: iaqi.no2 ? iaqi.no2.v : null,
        so2: iaqi.so2 ? iaqi.so2.v : null,
        o3: iaqi.o3 ? iaqi.o3.v : null,
        time: new Date(),
      };

      // Kiểm tra dữ liệu cần thiết trước khi lưu
      if (aqiData.city && aqiData.aqi !== undefined && aqiData.aqi !== null) {
        // Lưu vào MongoDB
        const newAQI = new AQI(aqiData);
        await newAQI.save();
        console.log("✅ Dữ liệu AQI đã được lưu vào MongoDB:", aqiData);
      } else {
        console.warn(
          "⚠️ Dữ liệu AQI không đầy đủ hoặc không hợp lệ, không lưu vào DB:",
          aqiData
        );
      }
    } else {
      console.error(
        "❌ Dữ liệu không hợp lệ từ WAQI API. Status:",
        data.status,
        "Dữ liệu:",
        data.data
      );
    }
  } catch (error) {
    console.error(
      "❌ Lỗi khi lấy hoặc lưu dữ liệu từ WAQI API:",
      error.message
    );
    if (error.response) {
      console.error(
        "Phản hồi lỗi API:",
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
fetchAQIData();
// Sau đó gọi hàm fetch dữ liệu mỗi 10 phút
setInterval(fetchAQIData, FETCH_INTERVAL_MS);

// Xử lý đóng kết nối MongoDB khi ứng dụng thoát
process.on("SIGINT", async () => {
  console.log("\nĐang đóng kết nối MongoDB...");
  await mongoose.disconnect();
  console.log("Kết nối MongoDB đã đóng.");
  process.exit(0);
});
