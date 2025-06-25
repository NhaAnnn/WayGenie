// models/routes.js
const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    // "LINK:NO" is the actual field name in MongoDB.
    // We'll use 'linkNo' as the convenient internal name in Mongoose.
    linkNo: {
      type: Number,
      required: true,
      unique: true,
      alias: "LINK:NO", // Mongoose will map 'linkNo' to 'LINK:NO' in DB
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
    // "LENGTH" is the actual field name in MongoDB.
    // Using 'lengthKm' in schema and setting alias to "LENGTH"
    lengthKm: {
      type: Number,
      alias: "LENGTH", // Mongoose will map 'lengthKm' to 'LENGTH' in DB
    },
    NUMLANES: {
      type: Number,
    },
    CAPPRT: {
      type: Number,
    },
    // "VOLVEHPRT" is the actual field name in MongoDB.
    volVehPrtAP: {
      type: Number,
      alias: "VOLVEHPRT", // Mongoose will map 'volVehPrtAP' to 'VOLVEHPRT' in DB
    },
    // "VOLPCUPRT" is the actual field name in MongoDB.
    volPcuPrtAP: {
      type: Number,
      alias: "VOLPCUPRT", // Mongoose will map 'volPcuPrtAP' to 'VOLPCUPRT' in DB
    },
    // "VOLVEH_TSYS" is the actual field name in MongoDB.
    volVehTsysMcAP: {
      type: Number,
      alias: "VOLVEH_TSYS", // Mongoose will map 'volVehTsysMcAP' to 'VOLVEH_TSYS' in DB
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
    v0Prt: {
      type: Number,
      alias: "V0PRT", // Mongoose will map 'v0Prt' to 'V0PRT' in DB
    },
    // These VCUR_PRTSYS fields map directly to their aliased names in MongoDB
    // Mongoose handles `VCUR_PRTSYS_BIKE` as both schema field and DB field if no alias
    // is set, but since you explicitly had alias, I'll keep it for clarity.
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
    // Mongoose supports aliases for fields with special characters.
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
