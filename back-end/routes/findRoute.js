// const express = require("express");
// const router = express.Router();
// const axios = require("axios");
// const RouteFinder = require("../utils/routeFinder");
// const dotenv = require("dotenv");
// dotenv.config({ path: "../secrets.env" });

// const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";

// router.post("/", async (req, res) => {
//   try {
//     const {
//       startLon,
//       startLat,
//       endLon,
//       endLat,
//       mode,
//       criteria = "optimal",
//     } = req.body;

//     if (!startLon || !startLat || !endLon || !endLat || !mode) {
//       return res.status(400).json({
//         success: false,
//         error: "Missing required parameters",
//         required: ["startLon", "startLat", "endLon", "endLat", "mode"],
//       });
//     }

//     const [startNode, endNode] = await Promise.all([
//       findNearestNode(startLon, startLat),
//       findNearestNode(endLon, endLat),
//     ]);

//     if (!startNode || !endNode) {
//       return res.status(400).json({
//         success: false,
//         error: "Cannot find nearest nodes for start/end points",
//       });
//     }

//     const [coordinatesData, routesData] = await Promise.all([
//       fetchAllCoordinates(),
//       fetchAllRoutes(),
//     ]);

//     const coordinatesMap = buildCoordinatesMap(coordinatesData);
//     const graph = buildGraph(routesData, mode);

//     const routeFinder = new RouteFinder(graph, coordinatesMap, mode);
//     routeFinder.maxRoutes = 5;
//     const foundRoutes = routeFinder.findAllRoutes(
//       startNode.node_id,
//       endNode.node_id,
//       criteria
//     );

//     if (foundRoutes.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: "No suitable route found",
//       });
//     }

//     const response = {
//       success: true,
//       startNode: startNode.node_id,
//       endNode: endNode.node_id,
//       routes: foundRoutes.map((route, index) => ({
//         id: `route_${index + 1}`,
//         path: route.path,
//         segments: route.segments,
//         metrics: route.metrics,
//         criteriaScores: route.criteriaScores,
//         geometry: route.geometry,
//         segmentFeatures: route.segmentFeatures,
//         properties: {
//           name: `Route ${index + 1}`,
//           distance: route.metrics.distance,
//           time: route.metrics.time,
//           pollution: route.metrics.avgPollution,
//           emission: route.metrics.avgEmission,
//           health: route.metrics.health,
//         },
//       })),
//       bestRoute: getBestRoute(foundRoutes, criteria),
//     };

//     res.json(response);
//   } catch (error) {
//     console.error("Route finding error:", error);
//     res.status(500).json({
//       success: false,
//       error: "Server error during route finding",
//       details: error.message,
//     });
//   }
// });

// async function findNearestNode(lon, lat) {
//   try {
//     const response = await axios.get(`${API_BASE_URL}/coordinates/nearby`, {
//       params: { lon, lat, limit: 1 },
//     });
//     return response.data?.[0] || null;
//   } catch (error) {
//     console.error("Error finding nearest node:", error);
//     throw error;
//   }
// }

// async function fetchAllCoordinates() {
//   try {
//     const response = await axios.get(`${API_BASE_URL}/coordinates`);
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching coordinates:", error);
//     throw error;
//   }
// }

// async function fetchAllRoutes() {
//   try {
//     const response = await axios.get(`${API_BASE_URL}/routes`);
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching routes:", error);
//     throw error;
//   }
// }

// function buildCoordinatesMap(coordinates) {
//   const map = new Map();
//   coordinates.forEach((coord) => {
//     map.set(coord.node_id, {
//       lon: coord.location.coordinates[0],
//       lat: coord.location.coordinates[1],
//     });
//   });
//   return map;
// }

// function buildGraph(routes, mode) {
//   const graph = {};

//   routes.forEach((route) => {
//     const fromNode = route.FROMNODENO;
//     const toNode = route.TONODENO;

//     if (!graph[fromNode]) graph[fromNode] = [];
//     if (!graph[toNode]) graph[toNode] = [];

//     const allowedModes =
//       route.TSYSSET?.split(",").map((m) => m.trim().toLowerCase()) || [];

//     let modeAllowed = false;
//     switch (mode) {
//       case "cycling":
//         modeAllowed = allowedModes.includes("bike");
//         break;
//       case "driving":
//         modeAllowed = allowedModes.includes("car");
//         break;
//       case "walking":
//         modeAllowed = allowedModes.includes("w");
//         break;
//       case "motorcycle":
//         modeAllowed = allowedModes.includes("mc");
//         break;
//       default:
//         modeAllowed = !route.TSYSSET || route.TSYSSET.trim() === "";
//     }

//     if (modeAllowed) {
//       graph[fromNode].push({ neighbor: toNode, routeData: route });
//       const reverseRoute = { ...route };
//       reverseRoute.FROMNODENO = toNode;
//       reverseRoute.TONODENO = fromNode;
//       if (reverseRoute.geometry?.coordinates) {
//         reverseRoute.geometry.coordinates = [
//           ...reverseRoute.geometry.coordinates,
//         ].reverse();
//       }
//       graph[toNode].push({ neighbor: fromNode, routeData: reverseRoute });
//     }
//   });

//   return graph;
// }

// function getBestRoute(routes, criteria) {
//   if (!routes.length) return null;
//   const bestRoute = [...routes].sort(
//     (a, b) =>
//       (b.criteriaScores[criteria] || 0) - (a.criteriaScores[criteria] || 0)
//   )[0];
//   return {
//     id: bestRoute.id,
//     score: bestRoute.criteriaScores[criteria],
//     metrics: bestRoute.metrics,
//   };
// }

// module.exports = router;
