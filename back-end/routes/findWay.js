const express = require("express");
const router = express.Router();
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config({ path: "../secrets.env" });

const {
  getSimulatedAqisForUser,
  getSimulatedTrafficImpactsForUser,
} = require("./simulate");
const { verifyToken } = require("../utils/auth");
const { WayFinder, getBestRoute } = require("../utils/wayFinder");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";

async function fetchAllAqisRecords(userId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/aqis`);
    let aqisData = response.data;

    const simulatedAqiConfig = await getSimulatedAqisForUser(userId);
    if (simulatedAqiConfig && simulatedAqiConfig.length > 0) {
      simulatedAqiConfig.forEach((config) => {
        const simulatedRecord = {
          stationId: config.stationId,
          stationName:
            config.simulation_name ||
            `Simulated AQI (${config._id.substring(0, 8)}...)`,
          aqi: config.pm25 * 2,
          pm25: config.pm25,
          pm10: config.pm10,
          co: 0,
          no2: 0,
          so2: 0,
          o3: 0,
          time: new Date(),
          location: {
            type: "Point",
            coordinates: [config.lon, config.lat],
          },
          radiusKm: config.radiusKm,
          isSimulated: true,
          simulationId: config._id,
        };
        aqisData.unshift(simulatedRecord);
      });
      console.log(
        `Total AQI records after adding ${simulatedAqiConfig.length} user simulations: ${aqisData.length}`
      );
    }
    return aqisData;
  } catch (error) {
    console.error(
      "Error fetching all AQIS records (real + simulated):",
      error.response?.data || error.message
    );
    return [];
  }
}

router.post("/", verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const {
      startLon,
      startLat,
      endLon,
      endLat,
      mode,
      criteria = "optimal",
      maxRoutes = 5,
    } = req.body;

    if (!startLon || !startLat || !endLon || !endLat || !mode) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        required: ["startLon", "startLat", "endLon", "endLat", "mode"],
      });
    }

    if (
      isNaN(parseFloat(startLon)) ||
      isNaN(parseFloat(startLat)) ||
      isNaN(parseFloat(endLon)) ||
      isNaN(parseFloat(endLat)) ||
      isNaN(parseInt(maxRoutes)) ||
      parseInt(maxRoutes) <= 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid numeric parameters. Lon/Lat must be numbers, maxRoutes must be a positive integer.",
      });
    }

    const supportedModes = ["cycling", "driving", "walking", "motorcycle"];
    if (!supportedModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid mode: '${mode}'. Supported modes are: ${supportedModes.join(
          ", "
        )}`,
      });
    }

    const supportedCriteria = [
      "optimal",
      "shortest",
      "fastest",
      "least_pollution",
      "healthiest",
      "emission",
    ];
    if (!supportedCriteria.includes(criteria)) {
      return res.status(400).json({
        success: false,
        error: `Invalid criteria: '${criteria}'. Supported criteria are: ${supportedCriteria.join(
          ", "
        )}`,
      });
    }

    const [
      startNode,
      endNode,
      coordinatesData,
      routesData,
      aqisData,
      simulatedTrafficImpacts,
    ] = await Promise.all([
      findNearestNode(startLon, startLat),
      findNearestNode(endLon, endLat),
      fetchAllCoordinates(),
      fetchAllRoutes(),
      fetchAllAqisRecords(userId),
      getSimulatedTrafficImpactsForUser(userId),
    ]);

    if (!startNode || !endNode) {
      return res.status(400).json({
        success: false,
        error:
          "Cannot find nearest nodes for start/end points. Ensure coordinates are within the network.",
      });
    }

    const coordinatesMap = buildCoordinatesMap(coordinatesData);
    const validNodes = new Set(coordinatesMap.keys());
    const graph = buildGraph(
      routesData,
      mode,
      simulatedTrafficImpacts,
      validNodes
    );

    const wayFinder = new WayFinder(
      graph,
      coordinatesMap,
      mode,
      aqisData,
      criteria === "healthiest" ? 1 : maxRoutes,
      simulatedTrafficImpacts
    );

    const foundRoutes = wayFinder.findAllRoutes(
      startNode.node_id,
      endNode.node_id,
      criteria
    );

    if (foundRoutes.length === 0) {
      return res.status(404).json({
        success: false,
        error:
          "No suitable route found between the specified points with current criteria.",
      });
    }

    const routesToProcess =
      criteria === "healthiest" ? [foundRoutes[0]] : foundRoutes;

    const response = {
      success: true,
      startNode: startNode.node_id,
      endNode: endNode.node_id,
      routes: routesToProcess.map((route, index) => {
        const processedSegments = route.segments.map((segment) => {
          // Đảm bảo geometry và coordinates luôn có giá trị mặc định
          const geometry = segment.geometry || {
            type: "LineString",
            coordinates: [],
          };
          if (!Array.isArray(geometry.coordinates)) {
            geometry.coordinates = [];
          }
          return {
            fromNode: segment.FROMNODENO,
            toNode: segment.TONODENO,
            distance: segment.LENGTH || 0,
            time: segment.TRAVELTIME || 0,
            recommendedMode: segment.recommendedMode || mode,
            healthScore: segment.healthScore || 0,
            aqiImpact: segment.aqiImpact || { aqi: 0, pm25: 0, pm10: 0 },
            geometry: geometry,
            isSimulatedTraffic: segment.isSimulatedTraffic || false,
            isSimulatedAqi: segment.isSimulatedAqi || false,
            simulationId: segment.simulationId || null,
          };
        });

        return {
          id: `route_${index + 1}`,
          path: route.path,
          segments: processedSegments,
          metrics: {
            distance: route.metrics.distance || 0,
            time: route.metrics.time || 0,
            pollution: route.metrics.pollution || 0,
            emission: route.metrics.emission || 0,
            health: route.metrics.health || 0,
          },
          geometry: route.geometry || { type: "LineString", coordinates: [] },
          segmentFeatures: route.segmentFeatures || [],
          properties: {
            name: `Route ${index + 1}`,
            distance: parseFloat((route.metrics.distance || 0).toFixed(2)),
            time: parseFloat((route.metrics.time || 0).toFixed(2)),
            pollution: parseFloat((route.metrics.pollution || 0).toFixed(2)),
            emission: parseFloat((route.metrics.emission || 0).toFixed(2)),
            health: parseFloat((route.metrics.health || 0).toFixed(2)),
            recommendedModes: processedSegments.map(
              (s) => s.recommendedMode || mode
            ),
          },
        };
      }),
      bestRoute: getBestRoute(routesToProcess, criteria),
    };

    res.json(response);
  } catch (error) {
    console.error(
      "Route finding error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: "Server error during route finding. Please try again.",
      details: error.message,
    });
  }
});

async function findNearestNode(lon, lat) {
  try {
    const response = await axios.get(`${API_BASE_URL}/coordinates/nearby`, {
      params: { lon, lat, limit: 1 },
    });
    return response.data?.[0] || null;
  } catch (error) {
    console.error(
      "Error finding nearest node:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function fetchAllCoordinates() {
  try {
    const response = await axios.get(`${API_BASE_URL}/coordinates`);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching coordinates:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function fetchAllRoutes() {
  try {
    const response = await axios.get(`${API_BASE_URL}/routes`);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching routes:",
      error.response?.data || error.message
    );
    throw error;
  }
}

function buildCoordinatesMap(coordinates) {
  const map = new Map();
  coordinates.forEach((coord) => {
    map.set(coord.node_id, {
      lon: coord.location.coordinates[0],
      lat: coord.location.coordinates[1],
    });
  });
  return map;
}

function buildGraph(routes, mode, simulatedTrafficImpacts, validNodes) {
  const graph = {};
  const simulatedSegments = new Set();

  simulatedTrafficImpacts.forEach((impact, segmentKey) => {
    if (
      !impact.isBlocked &&
      validNodes.has(String(impact.fromNode)) &&
      validNodes.has(String(impact.toNode))
    ) {
      const [fromNode, toNode] = segmentKey.split("-").map(Number);
      if (!graph[fromNode]) graph[fromNode] = [];
      if (!graph[toNode]) graph[toNode] = [];

      const routeData = {
        FROMNODENO: fromNode,
        TONODENO: toNode,
        LENGTH: 1,
        SPEED: null,
        VC: impact.VC,
        TSYSSET: mode,
        geometry: {
          type: "LineString",
          coordinates: [
            [
              validNodes.get(String(fromNode)).lon,
              validNodes.get(String(fromNode)).lat,
            ],
            [
              validNodes.get(String(toNode)).lon,
              validNodes.get(String(toNode)).lat,
            ],
          ],
        },
        isSimulated: true,
        simulationId: impact._id,
      };

      graph[fromNode].push({ neighbor: toNode, routeData });
      const reverseRoute = {
        ...routeData,
        FROMNODENO: toNode,
        TONODENO: fromNode,
        geometry: {
          type: "LineString",
          coordinates: [...routeData.geometry.coordinates].reverse(),
        },
      };
      graph[toNode].push({ neighbor: fromNode, routeData: reverseRoute });
      simulatedSegments.add(segmentKey);
      simulatedSegments.add(`${toNode}-${fromNode}`);
    }
  });

  routes.forEach((route) => {
    const fromNode = route.FROMNODENO;
    const toNode = route.TONODENO;
    const segmentKey = `${fromNode}-${toNode}`;
    const reverseSegmentKey = `${toNode}-${fromNode}`;

    if (
      simulatedTrafficImpacts.has(segmentKey) &&
      simulatedTrafficImpacts.get(segmentKey).isBlocked
    ) {
      return;
    }

    if (!graph[fromNode]) graph[fromNode] = [];
    if (!graph[toNode]) graph[toNode] = [];

    const allowedModes =
      route.TSYSSET?.split(",").map((m) => m.trim().toLowerCase()) || [];

    let modeAllowed = false;
    switch (mode) {
      case "cycling":
        modeAllowed = allowedModes.includes("bike");
        break;
      case "driving":
        modeAllowed = allowedModes.includes("car");
        break;
      case "walking":
        modeAllowed = allowedModes.includes("w");
        break;
      case "motorcycle":
        modeAllowed = allowedModes.includes("mc");
        break;
      default:
        modeAllowed = !route.TSYSSET || route.TSYSSET.trim() === "";
        break;
    }

    if (modeAllowed) {
      graph[fromNode].push({ neighbor: toNode, routeData: route });
      const reverseRoute = {
        ...route,
        FROMNODENO: toNode,
        TONODENO: fromNode,
        geometry: route.geometry
          ? {
              ...route.geometry,
              coordinates: [...route.geometry.coordinates].reverse(),
            }
          : null,
      };
      graph[toNode].push({ neighbor: fromNode, routeData: reverseRoute });
    }
  });

  return graph;
}

module.exports = router;
