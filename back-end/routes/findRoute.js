const express = require("express");
const router = express.Router();
const {
  calculateMultipleRouteOptions,
  haversineDistance,
} = require("../utils/routeCalculator");
const Coordinate = require("../models/coordinates");
const Route = require("../models/routes");
const AQIS = require("../models/aqis");

// Constants
const VALID_MODES = ["driving", "walking", "cycling", "motorcycle"];
const BOUNDARY_BUFFER_KM = 8;
const EARTH_RADIUS_KM = 6371;
const MAX_NODE_DISTANCE_M = 10000;
const MIN_DISTANCE_BETWEEN_NODES_M = 10;

/**
 * Validates the request body parameters.
 * @param {Object} body - Request body containing start/end coordinates and mode.
 * @returns {Object} - Validation result with isValid and message.
 */
function validateRequestBody({ startLon, startLat, endLon, endLat, mode }) {
  if (!startLon || !startLat || !endLon || !endLat || !mode) {
    return {
      isValid: false,
      message:
        "Missing required parameters: startLon, startLat, endLon, endLat, or mode.",
    };
  }
  if (!VALID_MODES.includes(mode)) {
    return {
      isValid: false,
      message: `Invalid mode. Valid modes: ${VALID_MODES.join(", ")}.`,
    };
  }
  return { isValid: true };
}

/**
 * Finds the nearest nodes to the given coordinates.
 * @param {number} lon - Longitude.
 * @param {number} lat - Latitude.
 * @returns {Object|null} - Nearest node document or null.
 */
async function findNearestNode(lon, lat) {
  return await Coordinate.findOne({
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lon, lat] },
        $maxDistance: MAX_NODE_DISTANCE_M,
      },
    },
  })
    .select("node_id location.coordinates")
    .lean();
}

/**
 * Calculates the bounding box for fetching coordinates and routes.
 * @param {number} startLon - Starting longitude.
 * @param {number} startLat - Starting latitude.
 * @param {number} endLon - Ending longitude.
 * @param {number} endLat - Ending latitude.
 * @returns {Object} - Bounding box coordinates.
 */
function calculateBoundingBox(startLon, startLat, endLon, endLat) {
  const toRadians = (deg) => deg * (Math.PI / 180);
  const latDiff = (BOUNDARY_BUFFER_KM / EARTH_RADIUS_KM) * (180 / Math.PI);
  const avgLatRad = toRadians((startLat + endLat) / 2);
  const lonDiff =
    (BOUNDARY_BUFFER_KM / (EARTH_RADIUS_KM * Math.cos(avgLatRad))) *
    (180 / Math.PI);

  return {
    minLon: Math.min(startLon, endLon) - lonDiff,
    maxLon: Math.max(startLon, endLon) + lonDiff,
    minLat: Math.min(startLat, endLat) - latDiff,
    maxLat: Math.max(startLat, endLat) + latDiff,
  };
}

/**
 * Fetches coordinates within the bounding box.
 * @param {Object} bounds - Bounding box coordinates.
 * @returns {Object[]} - List of coordinates.
 */
async function fetchCoordinates(bounds) {
  return await Coordinate.find({
    location: {
      $geoWithin: {
        $box: [
          [bounds.minLon, bounds.minLat],
          [bounds.maxLon, bounds.maxLat],
        ],
      },
    },
  })
    .select("node_id location.coordinates")
    .lean();
}

/**
 * Fetches routes connected to the given nodes.
 * @param {number[]} nodeIds - Array of node IDs.
 * @returns {Object[]} - List of routes.
 */
async function fetchRoutes(nodeIds) {
  return await Route.find({
    $or: [{ FROMNODENO: { $in: nodeIds } }, { TONODENO: { $in: nodeIds } }],
    "geometry.coordinates": { $exists: true, $ne: [] },
  })
    .select(
      "FROMNODENO TONODENO LENGTH VOLCAPRATIOPRT VOLVEHPRT CAPPRT TSYSSET VCUR_PRTSYS_BIKE VCUR_PRTSYS_CAR VCUR_PRTSYS_MC V0PRT NAME linkNo geometry"
    )
    .lean();
}

/**
 * Interpolates pollution data for nodes based on nearby AQIS stations.
 * @param {Object[]} coordinates - List of coordinates.
 * @param {Object[]} aqisStations - List of AQIS stations.
 * @returns {Map} - Map of node IDs to pollution values.
 */
function interpolatePollution(coordinates, aqisStations) {
  const nodePollutionMap = new Map();
  for (const node of coordinates) {
    const nodeCoords = node.location.coordinates;
    let totalWeightedPollution = 0;
    let totalWeight = 0;

    aqisStations.forEach((aqis) => {
      const stationCoords = aqis.location.coordinates;
      const dist = haversineDistance(nodeCoords, stationCoords);

      if (dist <= 5000) {
        const weight = 1 / Math.pow(dist + 1, 2);
        const pollutionValue = aqis.aqi || aqis.pm25 || 0;
        totalWeightedPollution += pollutionValue * weight;
        totalWeight += weight;
      }
    });

    const interpolatedPollution =
      totalWeight > 0 ? totalWeightedPollution / totalWeight : 0.05;
    nodePollutionMap.set(node.node_id, interpolatedPollution);
  }
  return nodePollutionMap;
}

/**
 * Adds pollution data to routes.
 * @param {Object[]} routes - List of routes.
 * @param {Map} nodePollutionMap - Map of node IDs to pollution values.
 * @returns {Object[]} - Routes with pollution data.
 */
function addPollutionToRoutes(routes, nodePollutionMap) {
  return routes.map((route) => {
    const fromNodePollution = nodePollutionMap.get(route.FROMNODENO);
    const toNodePollution = nodePollutionMap.get(route.TONODENO);
    let averagePollution = 0.05;

    if (fromNodePollution !== undefined && toNodePollution !== undefined) {
      averagePollution = (fromNodePollution + toNodePollution) / 2;
    } else if (fromNodePollution !== undefined) {
      averagePollution = fromNodePollution;
    } else if (toNodePollution !== undefined) {
      averagePollution = toNodePollution;
    }
    averagePollution = Math.max(0.01, averagePollution);

    const isGreenPath =
      route.VOLCAPRATIOPRT < 0.5 && averagePollution < 0.1 * 500;

    return { ...route, pollutionFactor: averagePollution, isGreenPath };
  });
}

/**
 * Formats a route for the API response.
 * @param {Object} route - Route object from pathfinding.
 * @returns {Object} - Formatted route object.
 */
function formatRoute(route) {
  return {
    id: route.id,
    totalCost: route.totalCost,
    totalDuration: Math.round(route.totalDuration / 60), // Convert to minutes
    totalDistance: route.totalDistance,
    geometry: {
      type: "FeatureCollection",
      features: route.segments.map((segment) => ({
        type: "Feature",
        properties: {
          id: segment.properties.id,
          FROMNODENO: segment.properties.FROMNODENO,
          TONODENO: segment.properties.TONODENO,
          NAME: segment.properties.NAME,
          metrics: segment.properties.metrics,
        },
        geometry: segment.geometry,
      })),
    },
    metrics: route.metrics,
    criteriaCosts: route.criteriaCosts,
    suggestedVehicleType: route.suggestedVehicleType,
    name: route.name || `Tuyến đường ${route.id}`,
    segments: route.segments.map((segment) => ({
      type: "Feature",
      properties: {
        id: segment.properties.id,
        FROMNODENO: segment.properties.FROMNODENO,
        TONODENO: segment.properties.TONODENO,
        NAME: segment.properties.NAME,
        metrics: segment.properties.metrics,
      },
      geometry: segment.geometry,
    })),
  };
}

router.post("/", async (req, res) => {
  console.time("find-route-api-call");

  try {
    // Validate request body
    const validation = validateRequestBody(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ msg: validation.message });
    }

    const { startLon, startLat, endLon, endLat, mode, selectedCriterionId } =
      req.body;

    // Find nearest nodes
    console.time("find-nearest-nodes");
    const [startCoordDoc, endCoordDoc] = await Promise.all([
      findNearestNode(startLon, startLat),
      findNearestNode(endLon, endLat),
    ]);
    console.timeEnd("find-nearest-nodes");

    if (!startCoordDoc || !endCoordDoc) {
      return res.status(404).json({
        msg: "Không tìm thấy nút gần đó cho điểm bắt đầu hoặc điểm kết thúc.",
      });
    }

    const startNodeNo = startCoordDoc.node_id;
    const endNodeNo = endCoordDoc.node_id;

    // Check if nodes are too close
    const distanceBetweenNodes = haversineDistance(
      startCoordDoc.location.coordinates,
      endCoordDoc.location.coordinates
    );
    if (distanceBetweenNodes < MIN_DISTANCE_BETWEEN_NODES_M) {
      return res.status(400).json({
        msg: "Điểm đi và điểm đến quá gần nhau hoặc trùng nhau.",
      });
    }

    // Calculate bounding box and fetch data
    console.time("fetch-graph-data");
    const bounds = calculateBoundingBox(startLon, startLat, endLon, endLat);
    const [allCoordinates, allRoutes, nearbyAqisStations] = await Promise.all([
      fetchCoordinates(bounds),
      fetchRoutes(allCoordinates.map((c) => c.node_id)),
      AQIS.find({
        location: {
          $geoWithin: {
            $box: [
              [bounds.minLon - bounds.lonDiff, bounds.minLat - bounds.latDiff],
              [bounds.maxLon + bounds.lonDiff, bounds.maxLat + bounds.latDiff],
            ],
          },
        },
      })
        .select("location.coordinates aqi pm25")
        .lean(),
    ]);
    console.timeEnd("fetch-graph-data");

    // Process pollution data
    console.time("process-pollution-data");
    const nodePollutionMap = interpolatePollution(
      allCoordinates,
      nearbyAqisStations
    );
    const routesWithPollution = addPollutionToRoutes(
      allRoutes,
      nodePollutionMap
    );
    console.timeEnd("process-pollution-data");

    // Run pathfinding algorithm
    console.time("pathfinding-algorithm");
    const { selectedRoute, allRoutesWithMetrics } =
      calculateMultipleRouteOptions(
        startNodeNo,
        endNodeNo,
        allCoordinates,
        routesWithPollution,
        mode,
        4,
        selectedCriterionId || "optimal"
      );
    console.timeEnd("pathfinding-algorithm");

    if (allRoutesWithMetrics.length === 0 || !selectedRoute) {
      return res.status(404).json({ msg: "Không tìm thấy tuyến đường nào." });
    }

    // Format response
    console.time("response-structuring");
    const formattedAllRoutes = allRoutesWithMetrics.map(formatRoute);
    const formattedSelectedRoute = formatRoute(selectedRoute);
    console.timeEnd("response-structuring");

    res.json({
      startNodeNo,
      endNodeNo,
      startNodeCoords: startCoordDoc.location.coordinates,
      endNodeCoords: endCoordDoc.location.coordinates,
      selectedRoute: formattedSelectedRoute,
      allRoutes: formattedAllRoutes,
    });
  } catch (error) {
    console.error("Error during route finding:", error);
    res.status(500).json({ msg: "Đã xảy ra lỗi khi tìm tuyến đường." });
  } finally {
    console.timeEnd("find-route-api-call");
  }
});

module.exports = router;
