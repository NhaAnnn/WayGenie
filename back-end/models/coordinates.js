const mongoose = require("mongoose");

const coordinateSchema = new mongoose.Schema(
  {
    node_id: {
      // Matches the field name in your screenshot
      type: Number,
      required: true,
      unique: true,
    },
    // The 'location' field directly holds the GeoJSON Point data
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        // [longitude, latitude] - Matches the order in your screenshot
        type: [Number],
        required: true,
      },
    },
    osm_node_id: {
      // Matches the field name in your screenshot
      type: Number,
    },
    volrpt: {
      // Matches the field name in your screenshot
      type: Number,
    },
    // If there are other fields in your actual NODES documents not shown in the snippet, add them here
  },
  { collection: "NODES" } // Specify the collection name
);

// Create a 2dsphere index for geospatial queries
coordinateSchema.index({ location: "2dsphere" });

// No pre-save middleware needed if 'location' is already stored correctly in MongoDB
// as the frontend/backend will fetch the 'location' field directly.

const Coordinate = mongoose.model("Coordinate", coordinateSchema);

module.exports = Coordinate; // This exports the Mongoose model for your backend
