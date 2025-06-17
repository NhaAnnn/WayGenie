// models/Coordinate.js
const mongoose = require("mongoose");

const coordinateSchema = new mongoose.Schema(
  {
    "NODE-NO": {
      // Giữ nguyên tên trường từ MongoDB
      type: Number,
      required: true,
      unique: true,
    },
    XCOORD: {
      // Kinh độ
      type: Number,
      required: true,
    },
    YCOORD: {
      // Vĩ độ
      type: Number,
      required: true,
    },
    ZCOORD: {
      // MỚI: Tọa độ Z
      type: Number,
    },
    OSM_NODE_ID: {
      type: Number,
    },
    WKTLOC: {
      // ĐÃ ĐỔI TÊN: Well-Known Text representation của điểm
      type: String,
      required: true,
    },
    VOLRPT: {
      type: Number,
    },
    // Thêm một trường GeoJSON Point để dễ dàng thực hiện các truy vấn không gian
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        // [longitude, latitude]
        type: [Number],
        required: true,
      },
    },
  },
  { collection: "COORDINATES" }
); // Chỉ định tên collection trong MongoDB

// Tạo chỉ mục không gian cho trường 'location'
coordinateSchema.index({ location: "2dsphere" });

// Middleware để tự động điền trường 'location' từ XCOORD và YCOORD
coordinateSchema.pre("save", function (next) {
  if (this.XCOORD != null && this.YCOORD != null) {
    this.location = {
      type: "Point",
      coordinates: [this.XCOORD, this.YCOORD], // Lưu ý: [longitude, latitude]
    };
  }
  next();
});

const Coordinate = mongoose.model("Coordinate", coordinateSchema);

module.exports = Coordinate;
