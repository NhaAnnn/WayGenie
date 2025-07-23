// models/routes.js
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

    LENGTH: {
      type: Number,
      // alias: "LENGTH",
    },
    NUMLANES: {
      type: Number,
    },
    CAPPRT: {
      type: Number,
    },

    VOLVEHPRT: {
      type: Number,
      // alias: "VOLVEHPRT", // Mongoose will map 'volVehPrtAP' to 'VOLVEHPRT' in DB
    },

    VOLPCUPRT: {
      type: Number,
      // alias: "VOLPCUPRT", // Mongoose will map 'volPcuPrtAP' to 'VOLPCUPRT' in DB
    },
    // "VOLVEH_TSYS" is the actual field name in MongoDB.
    VOLVEH_TSYS: {
      type: Number,
      // alias: "VOLVEH_TSYS", // Mongoose will map 'volVehTsysMcAP' to 'VOLVEH_TSYS' in DB
    },
    LENGTHDIR: {
      type: String,
      trim: true,
    },
    FROMNODEORIENTATION: {
      type: String,
      trim: true,
    },
    // "V0PRT" is the actual field name in MongoDB.
    V0PRT: {
      type: Number,
      // alias: "V0PRT", // Mongoose will map 'v0Prt' to 'V0PRT' in DB
    },

    VCUR_PRTSYS_BIKE: {
      type: Number,
      // alias: "VCUR_PRTSYS_BIKE",
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
    // Mongoose supports aliases for fields with special characters.
    impPrtSysBikeAH: { type: Number, alias: "IMP_PRTSYS_BIKE_AH" },
    impPrtSysBikeAP: { type: Number, alias: "IMP_PRTSYS_BIKE_AP" },
    impPrtSysCarAH: { type: Number, alias: "IMP_PRTSYS_CAR_AH" },
    impPrtSysCarAP: { type: Number, alias: "IMP_PRTSYS_CAR_AP" },
    impPrtSysCoAH: { type: Number, alias: "IMP_PRTSYS_CO_AH" },
    impPrtSysCoAP: { type: Number, alias: "IMP_PRTSYS_CO_AP" },
    impPrtSysHgvAH: { type: Number, alias: "IMP_PRTSYS_HGV_AH" },
    impPrtSysHgvAP: { type: Number, alias: "IMP_PRTSYS_HGV_AP" },
    impPrtSysMcAH: { type: Number, alias: "IMP_PRTSYS_MC_AH" },
    impPrtSysMcAP: { type: Number, alias: "IMP_PRTSYS_MC_AP" },
    VC: {
      type: Number,
    },
    // "VOLCAPRATIOPRT" is the actual field name in MongoDB.
    volCapRatioPrtAP: {
      type: Number,
      alias: "VOLCAPRATIOPRT", // Mongoose will map 'volCapRatioPrtAP' to 'VOLCAPRATIOPRT' in DB
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
    // This field seems to be custom for your application logic
  },
  { collection: "LINKS" } // Ensure the collection name is correct
);

// Create a 2dsphere index on the 'geometry' field for geospatial queries
routeSchema.index({ geometry: "2dsphere" });

const Route = mongoose.model("Route", routeSchema);

module.exports = Route;
