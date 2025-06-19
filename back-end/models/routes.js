const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    // linkNo is the internal Mongoose field name, "LINK:NO" is the actual field name in MongoDB/CSV
    linkNo: {
      type: Number,
      required: true,
      unique: true,
      alias: "LINK:NO", // Alias for consistent access, matches source data
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
    // length is the internal Mongoose field, "LENGTH" is the actual field name
    length: {
      type: Number,
      alias: "LENGTH",
    },
    NUMLANES: {
      type: Number,
    },
    CAPPRT: {
      type: Number,
    },
    // volVehPrtAP maps to "VOLVEHPRT"
    volVehPrtAP: {
      type: Number,
      alias: "VOLVEHPRT",
    },
    // volPcuPrtAP maps to "VOLPCUPRT"
    volPcuPrtAP: {
      type: Number,
      alias: "VOLPCUPRT",
    },
    // volVehTsysMcAP maps to "VOLVEH_TSYS"
    volVehTsysMcAP: {
      type: Number,
      alias: "VOLVEH_TSYS",
    },
    LENGTHDIR: {
      type: String,
      trim: true,
    },
    FROMNODEORIENTATION: {
      type: String,
      trim: true,
    },
    // v0Prt maps to "V0PRT"
    v0Prt: {
      type: Number,
      alias: "V0PRT",
    },
    // These VCUR_PRTSYS fields map directly to their aliased names
    vCurPrtSysBike: {
      type: Number,
      alias: "VCUR_PRTSYS_BIKE",
    },
    vCurPrtSysCar: {
      type: Number,
      alias: "VCUR_PRTSYS_CAR",
    },
    vCurPrtSysCo: {
      type: Number,
      alias: "VCUR_PRTSYS_CO",
    },
    vCurPrtSysHgv: {
      type: Number,
      alias: "VCUR_PRTSYS_HGV",
    },
    vCurPrtSysMc: {
      type: Number,
      alias: "VCUR_PRTSYS_MC",
    },
    // These IMP_PRTSYS fields retain their exact (special character) aliases
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
    // volCapRatioPrtAP maps to "VOLCAPRATIOPRT"
    volCapRatioPrtAP: {
      type: Number,
      alias: "VOLCAPRATIOPRT",
    },
    // GeoJSON 'geometry' field for storing LineString data
    geometry: {
      type: {
        type: String,
        enum: ["LineString"], // Assuming only LineString for routes
        required: true,
      },
      coordinates: {
        type: [[Number]], // Array of [longitude, latitude] pairs
        required: true,
      },
    },

    pollutionFactor: {
      type: Number,
      default: 0.1, // Default value, can be overridden or calculated
    },
  },
  { collection: "LINKS" } // Ensure the collection name is correct
);

// Create a 2dsphere index on the 'geometry' field for geospatial queries
routeSchema.index({ geometry: "2dsphere" });

const Route = mongoose.model("Route", routeSchema);

module.exports = Route;
