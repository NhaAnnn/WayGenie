const express = require("express");
const router = express.Router();
const Route = require("../models/routes");
const Coordinate = require("../models/coordinates"); // Ensure this model exists and has a 'location' field with a 2dsphere index
const GraphService = require("../utils/GraphService"); // Import GraphService

// Simple middleware to log API access times
router.use((req, res, next) => {
  console.log(
    `[Routes API] ${req.method} ${
      req.originalUrl
    } at ${new Date().toISOString()}`
  );
  next();
});

// --- GET All Routes ---
// Supports optional filtering by TSYSSET (e.g., 'CAR' in "B2,BIKE,CAR,Co")
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.tsysset) {
      // Case-insensitive regex search for TSYSSET
      query.TSYSSET = { $regex: new RegExp(req.query.tsysset, "i") };
    }
    const routes = await Route.find(query);
    res.status(200).json(routes);
  } catch (error) {
    console.error("Error fetching all routes:", error);
    res.status(500).json({
      message: "Server error while fetching routes",
      error: error.message,
    });
  }
});

// --- GET Route by MongoDB _id ---
router.get("/:id", async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    res.status(200).json(route);
  } catch (error) {
    console.error(`Error fetching route by ID (${req.params.id}):`, error);
    res.status(500).json({
      message: "Server error while fetching route by ID",
      error: error.message,
    });
  }
});

// --- GET Route by LINK-NO (alias linkNo) ---
router.get("  ", async (req, res) => {
  try {
    // Use the actual MongoDB field name for querying with alias
    const route = await Route.findOne({
      "LINK:NO": parseInt(req.params.linkNo),
    });
    if (!route) {
      return res
        .status(404)
        .json({ message: "No route found with this LINK-NO" });
    }
    res.status(200).json(route);
  } catch (error) {
    console.error(
      `Error fetching route by LINK-NO (${req.params.linkNo}):`,
      error
    );
    res.status(500).json({
      message: "Server error while fetching route by LINK-NO",
      error: error.message,
    });
  }
});

// --- GET Routes by FROMNODENO and TONODENO ---
router.get("/by-nodes/:fromNode/:toNode", async (req, res) => {
  try {
    const fromNode = parseInt(req.params.fromNode);
    const toNode = parseInt(req.params.toNode);

    const routes = await Route.find({ FROMNODENO: fromNode, TONODENO: toNode });
    if (routes.length === 0) {
      return res
        .status(404)
        .json({ message: "No routes found between these nodes" });
    }
    res.status(200).json(routes);
  } catch (error) {
    console.error(
      `Error fetching routes by nodes (${fromNode} -> ${toNode}):`,
      error
    );
    res.status(500).json({
      message: "Server error while fetching routes by nodes",
      error: error.message,
    });
  }
});

// --- POST Create New Route ---
// Assumes incoming data directly matches the schema's field types (e.g., numbers for length, V0PRT)
router.post("/", async (req, res) => {
  const newRouteData = req.body;

  const newRoute = new Route(newRouteData);

  try {
    const savedRoute = await newRoute.save();
    res.status(201).json(savedRoute);
  } catch (error) {
    console.error("Error creating new route:", error);
    res.status(400).json({
      message: "Could not create new route",
      error: error.message,
    });
  }
});

router.post("/find-multi-criteria", async (req, res) => {
  const { startLon, startLat, endLon, endLat, criteriaWeights, mode } =
    req.body;

  if (
    !startLon ||
    !startLat ||
    !endLon ||
    !endLat ||
    !criteriaWeights ||
    !mode
  ) {
    return res.status(400).json({
      message:
        "Missing required information to find a multi-criteria route. Please provide startLon, startLat, endLon, endLat, criteriaWeights, and mode.",
    });
  }

  try {
    // 1. Find the nearest nodes to the Start/End coordinates using geospatial indexing
    // IMPORTANT: The 'Coordinate' model MUST have a 'location' field defined as GeoJSON Point
    // and a 2dsphere index on it for $nearSphere to work efficiently.
    const startCoordDoc = await Coordinate.findOne({
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [startLon, startLat], // [longitude, latitude]
          },
          $maxDistance: 1000, // Search within a 1km radius
        },
      },
    }).lean(); // .lean() returns a plain JavaScript object, faster for read-only operations

    const endCoordDoc = await Coordinate.findOne({
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [endLon, endLat],
          },
          $maxDistance: 1000, // Search within a 1km radius
        },
      },
    }).lean();

    if (!startCoordDoc || !endCoordDoc) {
      return res.status(404).json({
        message:
          "Could not find a nearby node for the start or end point. Try increasing maxDistance or checking coordinates.",
      });
    }

    const startNodeNo = startCoordDoc["NODE-NO"];
    const endNodeNo = endCoordDoc["NODE-NO"];

    console.log(
      `Finding route from NODE-NO ${startNodeNo} to NODE-NO ${endNodeNo} with criteria:`,
      criteriaWeights
    );

    // 2. Fetch all nodes and routes to build the graph
    // For very large datasets, consider optimizing this (e.g., fetching only relevant nearby data)
    const allCoordinates = await Coordinate.find({}).lean();
    const allRoutes = await Route.find({}).lean();

    // 3. Use GraphService to find the multi-criteria path
    const result = GraphService.findMultiCriteriaRoute(
      startNodeNo,
      endNodeNo,
      allCoordinates,
      allRoutes,
      criteriaWeights,
      mode // Travel mode (e.g., 'driving', 'cycling')
    );

    if (result && result.path.length > 0) {
      // Convert the path (array of node IDs) into GeoJSON LineString coordinates
      const routeCoordinates = result.path.map((nodeId) => {
        const coord = allCoordinates.find((c) => c["NODE-NO"] === nodeId);
        // Ensure XCOORD is longitude and YCOORD is latitude for GeoJSON
        return [coord.XCOORD, coord.YCOORD];
      });

      const geoJsonRoute = {
        type: "Feature",
        properties: {
          duration: result.totalDuration, // Total duration calculated by GraphService
          distance: result.totalDistance * 1000, // Total distance (km -> meters)
          cost: result.totalCost, // Total multi-criteria cost
          // Additional properties can be added here if needed for frontend display
        },
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates,
        },
      };

      // Return an array of GeoJSON features (even if it's just one route)
      res.status(200).json([geoJsonRoute]);
    } else {
      res.status(404).json({
        message:
          "No route found with the selected criteria. It might be unreachable or the criteria are too restrictive.",
      });
    }
  } catch (error) {
    console.error("Error finding multi-criteria route:", error);
    res.status(500).json({
      message: "Server error while finding multi-criteria route.",
      error: error.message,
    });
  }
});

module.exports = router;
