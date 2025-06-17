// models/Route.js
const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    linkNo: {
      type: Number,
      required: true,
      unique: true,
      alias: "LINK:NO",
    },
    FROMNODENO: {
      type: Number,
      required: true,
    },
    TONODENO: {
      type: Number,
      required: true,
    },
    NAME: {
      type: String,
      trim: true,
    },
    TSYSSET: {
      type: String,
      trim: true,
    },
    lengthKm: {
      type: Number,
      alias: "LENGTH",
      set: (v) => parseFloat(v.replace("km", "")),
    },
    NUMLANES: {
      type: Number,
    },
    CAPPRT: {
      type: Number,
    },
    volVehPrtAP: {
      type: Number,
      alias: "VOLVEHPRT(AP)",
    },
    volPcuPrtAP: {
      type: Number,
      alias: "VOLPCUPRT(AP)",
    },
    volVehTsysMcAP: {
      type: Number,
      alias: "VOLVEH_TSYS(MC,AP)",
    },
    LENGTHDIR: {
      type: String,
      trim: true,
    },
    FROMNODEORIENTATION: {
      type: String,
      trim: true,
    },
    v0PrtKmH: {
      type: Number,
      alias: "V0PRT",
      set: (v) => parseFloat(v.replace("km/h", "")),
    },
    vCurPrtSysBike: {
      type: Number,
      alias: "VCUR_PRTSYS(BIKE)",
      set: (v) => parseFloat(v.replace("km/h", "")),
    },
    vCurPrtSysCar: {
      type: Number,
      alias: "VCUR_PRTSYS(CAR)",
      set: (v) => parseFloat(v.replace("km/h", "")),
    },
    vCurPrtSysCo: {
      type: Number,
      alias: "VCUR_PRTSYS(CO)",
      set: (v) => parseFloat(v.replace("km/h", "")),
    },
    vCurPrtSysHgv: {
      type: Number,
      alias: "VCUR_PRTSYS(HGV)",
      set: (v) => parseFloat(v.replace("km/h", "")),
    },
    vCurPrtSysMc: {
      type: Number,
      alias: "VCUR_PRTSYS(MC)",
      set: (v) => parseFloat(v.replace("km/h", "")),
    },
    impPrtSysBikeAH: { type: Number, alias: "IMP_PRTSYS(BIKE,AH)" },
    impPrtSysBikeAP: { type: Number, alias: "IMP_PRTSYS(BIKE,AP)" },
    impPrtSysCarAH: { type: Number, alias: "IMP_PRTSYS(CAR,AH)" },
    impPrtSysCarAP: { type: Number, alias: "IMP_PRTSYS(CAR,AP)" },
    impPrtSysCoAH: { type: Number, alias: "IMP_PRTSYS(CO,AH)" },
    impPrtSysCoAP: { type: Number, alias: "IMP_PRTSYS(CO,AP)" },
    impPrtSysHgvAH: { type: Number, alias: "IMP_PRTSYS(HGV,AH)" },
    impPrtSysHgvAP: { type: Number, alias: "IMP_PRTSYS(HGV,AP)" },
    impPrtSysMcAH: { type: Number, alias: "IMP_PRTSYS(MC,AH)" },
    impPrtSysMcAP: { type: Number, alias: "IMP_PRTSYS(MC,AP)" },
    VC: {
      type: Number,
    },
    volCapRatioPrtAP: {
      type: Number,
      alias: "VOLCAPRATIOPRT(AP)",
    },
    // --- THÊM CÁC TRƯỜNG MỚI CHO TIÊU CHÍ ĐA ĐIỂM ---
    trafficImpactFactor: {
      // Yếu tố tác động giao thông (ví dụ: dựa trên VC hoặc VOLVEHPRT/CAPPRT)
      type: Number,
      default: 0.1, // Giá trị mặc định, có thể được tính toán hoặc cập nhật sau
    },
    pollutionFactor: {
      // Yếu tố tác động ô nhiễm (giả định)
      type: Number,
      default: 0.1, // Giá trị mặc định, cần dữ liệu thực tế
    },
  },
  { collection: "ROUTE" }
);

const Route = mongoose.model("Route", routeSchema);

module.exports = Route;
