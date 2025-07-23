// models/aqis.js
const mongoose = require("mongoose");

const aqisSchema = new mongoose.Schema(
  {
    stationUid: {
      type: Number, // Example from image
      required: true,
      unique: true,
    },
    stationName: String,
    aqi: Number,
    pm25: Number,
    pm10: Number,
    co: Number,
    no2: Number,
    so2: Number,
    o3: Number,
    time: Date,
    location: {
      // GeoJSON Point for station location
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
  { collection: "aqis" } // Tên collection trong MongoDB
);

aqisSchema.index({ location: "2dsphere" }); // Chỉ mục không gian cho tìm kiếm gần nhất

const AQIS = mongoose.model("AQIS", aqisSchema);
module.exports = AQIS;
