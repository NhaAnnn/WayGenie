// updatePollutionData.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from secrets.env file.
dotenv.config({ path: path.resolve(__dirname, "./secrets.env") });

// Import Mongoose Models. Ensure paths to model files are correct.
const Route = require("./models/routes");
const Coordinate = require("./models/coordinates");

// Get MONGODB_URI from environment variables.
const MONGODB_URI = process.env.MONGODB_URI;

console.log(
  "Starting pollution data update script (ESTIMATED from traffic data)..."
);

/**
 * Main (async) function to update pollution data for all routes in MongoDB.
 * This function will ESTIMATE 'pollutionFactor' based on existing traffic fields (VOLCAPRATIOPRT(AP), VOLVEHPRT(AP), CAPPRT).
 *
 * This version uses an optimized non-linear scaling for pollutionFactor to create more diversity and accuracy,
 * especially emphasizing congestion and capping at a reasonable maximum.
 */
async function updatePollutionDataForRoutes() {
  try {
    // 1. Connect to MongoDB.
    await mongoose.connect(MONGODB_URI);
    console.log("Script: MongoDB connected successfully!");

    console.log(
      "Script: Not loading pollution data from external API. Using internal estimation."
    );

    // 2. Load all routes from MongoDB.
    console.log("Script: Loading all routes from MongoDB...");
    const allRoutes = await Route.find({}).lean(); // Keep .lean() for performance
    console.log(`Script: Loaded ${allRoutes.length} routes.`);

    let updatedRoutesCount = 0; // Counter for updated routes.

    // Iterate through each route to estimate and update 'pollutionFactor'.
    for (const route of allRoutes) {
      let baseFactor = 0; // Initial base factor for calculation

      // --- Logic for determining baseFactor from traffic data ---
      // Prioritize using VOLCAPRATIOPRT(AP) if available.
      if (
        route["VOLCAPRATIOPRT(AP)"] != null &&
        route["VOLCAPRATIOPRT(AP)"] > 0
      ) {
        baseFactor = route["VOLCAPRATIOPRT(AP)"];
      }
      // If VOLCAPRATIOPRT(AP) is not available, use VOLVEHPRT(AP) and CAPPRT.
      else if (
        route["VOLVEHPRT(AP)"] != null &&
        route.CAPPRT != null &&
        route.CAPPRT > 0
      ) {
        baseFactor = route["VOLVEHPRT(AP)"] / route.CAPPRT;
      } else {
        baseFactor = 0; // If no valid data, set baseFactor to 0
      }

      let estimatedPollutionFactor;

      // --- NEW: Optimized Non-linear scaling for estimatedPollutionFactor ---
      // This piecewise function aims to provide better granularity at lower traffic
      // and a steeper increase at higher congestion.
      if (baseFactor <= 0.5) {
        // Very light traffic, minimal pollution. Scales from 0.01 to approx 0.26.
        estimatedPollutionFactor = 0.01 + baseFactor * 0.5;
      } else if (baseFactor <= 1.0) {
        // Light to moderate traffic, pollution increases gently. Scales from approx 0.26 to 1.01.
        estimatedPollutionFactor = 0.26 + (baseFactor - 0.5) * 1.5;
      } else if (baseFactor <= 1.5) {
        // Congestion starts building up (V/C > 1), pollution increases faster. Scales from approx 1.01 to 2.51.
        estimatedPollutionFactor = 1.01 + (baseFactor - 1.0) * 3.0;
      } else {
        // Heavy congestion to gridlock (V/C > 1.5), pollution skyrockets.
        // Use an aggressive power function to penalize severe congestion heavily.
        const excessFactor = baseFactor - 1.5;
        estimatedPollutionFactor = 2.51 + Math.pow(excessFactor, 2.5) * 5;
      }

      // Apply a global maximum ceiling for pollutionFactor to prevent absurdly high values.
      // This helps keep the scale practical for display and routing algorithms.
      const GLOBAL_MAX_POLLUTION_FACTOR = 15.0; // This value aligns with the MapWrapper's visual cap.
      const finalEstimatedPollutionFactor = Math.min(
        Math.max(estimatedPollutionFactor, 0.01), // Ensure a minimum value of 0.01
        GLOBAL_MAX_POLLUTION_FACTOR // Apply the global maximum cap
      );

      // 3. Update 'pollutionFactor' field in MongoDB.
      await Route.updateOne(
        { _id: route._id }, // Find route by its MongoDB ID.
        { $set: { pollutionFactor: finalEstimatedPollutionFactor } } // Update pollutionFactor field.
      );
      updatedRoutesCount++;
      // Optional: console.log for debugging specific routes
      // console.log(`Updated Route ID: ${route._id} (LINK:NO: ${route['LINK:NO']}) with baseFactor: ${baseFactor.toFixed(2)}, final pollutionFactor: ${finalEstimatedPollutionFactor.toFixed(2)}`);
    }
    console.log(
      `\nScript: Updated ${updatedRoutesCount} routes with estimated pollution data.`
    );
  } catch (error) {
    console.error("Script: Lỗi khi cập nhật dữ liệu ô nhiễm ước tính:", error);
  } finally {
    // Ensure MongoDB connection is closed after the script completes.
    await mongoose.disconnect();
    console.log("Script: Đã đóng kết nối MongoDB.");
  }
}

// Call the main function to start the data update process when the script is run.
updatePollutionDataForRoutes();
