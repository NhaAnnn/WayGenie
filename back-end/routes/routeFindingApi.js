const express = require("express");
const router = express.Router();

const {
  findAlternativeRoutes,
  getOptimalRouteSuggestion,
} = require("../utils/pathfinding");
const Coordinate = require("../models/coordinates");
const Route = require("../models/routes");
const AQIS = require("../models/aqis");

function haversineDistance(coords1, coords2) {
  const R = 6371e3;
  const lat1 = (coords1[1] * Math.PI) / 180;
  const lat2 = (coords2[1] * Math.PI) / 180;
  const deltaLat = ((coords2[1] - coords1[1]) * Math.PI) / 180;
  const deltaLon = ((coords2[0] - coords1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.post("/", async (req, res) => {
  console.log("Backend: Nhận yêu cầu với body:", req.body);
  console.time("find-route-api-call");
  const { startLon, startLat, endLon, endLat, mode, criteriaWeights } =
    req.body;

  if (!startLon || !startLat || !endLon || !endLat || !mode) {
    console.error("Backend: Lỗi 400 - Thiếu thông tin bắt buộc.");
    return res.status(400).json({
      msg: "Vui lòng cung cấp tọa độ bắt đầu, tọa độ kết thúc và chế độ di chuyển.",
    });
  }

  console.log(
    `Backend: Yêu cầu tìm đường từ [${startLon}, ${startLat}] đến [${endLon}, ${endLat}] cho chế độ ${mode}...`
  );

  try {
    console.time("find-nearest-nodes");
    const startCoordDoc = await Coordinate.findOne({
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [startLon, startLat],
          },
          $maxDistance: 1000,
        },
      },
    }).lean();

    const endCoordDoc = await Coordinate.findOne({
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [endLon, endLat],
          },
          $maxDistance: 1000,
        },
      },
    }).lean();
    console.timeEnd("find-nearest-nodes");

    if (!startCoordDoc || !endCoordDoc) {
      console.warn(
        `Backend: Không tìm thấy nút gần cho điểm bắt đầu ([${startLon}, ${startLat}]) hoặc điểm kết thúc ([${endLon}, ${endLat}]).`
      );
      return res.status(404).json({
        msg: "Không tìm thấy nút gần đó cho điểm bắt đầu hoặc điểm kết thúc.",
      });
    }

    const startNodeNo = startCoordDoc.node_id;
    const endNodeNo = endCoordDoc.node_id;

    console.time("fetch-graph-data");
    const BOUNDARY_BUFFER_KM = 10;
    const toRadians = (deg) => deg * (Math.PI / 180);
    const R = 6371;
    const latDiff = (BOUNDARY_BUFFER_KM / R) * (180 / Math.PI);
    const lonDiff =
      (BOUNDARY_BUFFER_KM / (R * Math.cos(toRadians(startLat)))) *
      (180 / Math.PI);

    const bounds = {
      minLon: Math.min(startLon, endLon) - lonDiff,
      maxLon: Math.max(startLon, endLon) + lonDiff,
      minLat: Math.min(startLat, endLat) - latDiff,
      maxLat: Math.max(startLat, endLat) + latDiff,
    };

    const allCoordinates = await Coordinate.find({
      location: {
        $geoWithin: {
          $box: [
            [bounds.minLon, bounds.minLat],
            [bounds.maxLon, bounds.maxLat],
          ],
        },
      },
    }).lean();

    const allRoutes = await Route.find({
      $or: [
        { FROMNODENO: { $in: allCoordinates.map((c) => c.node_id) } },
        { TONODENO: { $in: allCoordinates.map((c) => c.node_id) } },
      ],
    }).lean();

    const allAqisData = await AQIS.find({
      location: {
        $geoWithin: {
          $box: [
            [bounds.minLon, bounds.minLat],
            [bounds.maxLon, bounds.maxLat],
          ],
        },
      },
    }).lean();
    console.timeEnd("fetch-graph-data");

    const POLLUTION_INFLUENCE_RADIUS_METERS = 5000;
    const IDW_POWER = 2;
    const MAX_AQI = 500;

    console.time("process-pollution-data");
    const nodePollutionMap = new Map();

    const aqisStationsProcessed = allAqisData.map((aqis) => {
      let pollutionValue = aqis.aqi || aqis.pm25 || 0;
      pollutionValue = Math.min(pollutionValue, MAX_AQI);
      return {
        coordinates: aqis.location.coordinates,
        pollutionValue,
      };
    });

    for (const node of allCoordinates) {
      const nodeCoords = node.location.coordinates;
      const nearbyAqis = await AQIS.find({
        location: {
          $nearSphere: {
            $geometry: {
              type: "Point",
              coordinates: nodeCoords,
            },
            $maxDistance: POLLUTION_INFLUENCE_RADIUS_METERS,
          },
        },
      }).lean();

      let totalWeightedPollution = 0;
      let totalWeight = 0;

      nearbyAqis.forEach((aqis) => {
        const dist = haversineDistance(nodeCoords, aqis.location.coordinates);
        const weight = 1 / Math.pow(dist + 1, IDW_POWER);
        const pollutionValue = aqis.aqi || aqis.pm25 || 0;
        totalWeightedPollution += pollutionValue * weight;
        totalWeight += weight;
      });

      const interpolatedPollution =
        totalWeight > 0 ? totalWeightedPollution / totalWeight : 0.05;
      nodePollutionMap.set(node.node_id, interpolatedPollution);
    }

    const routesWithPollution = allRoutes.map((route) => {
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

      return { ...route, pollutionFactor: averagePollution };
    });
    console.timeEnd("process-pollution-data");

    console.time("pathfinding-algorithm");
    const alternativeRoutes = findAlternativeRoutes(
      startNodeNo,
      endNodeNo,
      allCoordinates,
      routesWithPollution,
      mode
    );
    console.timeEnd("pathfinding-algorithm");

    if (alternativeRoutes.length === 0) {
      console.warn(
        `Backend: Không tìm thấy tuyến đường nào giữa ${startNodeNo} và ${endNodeNo} cho chế độ ${mode}.`
      );
      return res.status(404).json({ msg: "Không tìm thấy tuyến đường nào." });
    }

    const optimalRoute = getOptimalRouteSuggestion(alternativeRoutes);
    if (!optimalRoute) {
      console.error(
        "Backend: Không tìm thấy tuyến đường tối ưu nào mặc dù có các tuyến đường thay thế."
      );
      return res
        .status(404)
        .json({ msg: "Không tìm thấy tuyến đường tối ưu nào." });
    }

    console.time("geojson-creation");
    const coordinatesMapForGeoJSON = new Map();
    allCoordinates.forEach((coord) => {
      coordinatesMapForGeoJSON.set(coord.node_id, {
        lon: coord.location.coordinates[0],
        lat: coord.location.coordinates[1],
      });
    });

    const createGeoJSONs = (routeDetails) => {
      const geoJSONs = [];
      if (routeDetails && routeDetails.length > 0) {
        routeDetails.forEach((routeData) => {
          const fromNodeCoords = coordinatesMapForGeoJSON.get(
            routeData.FROMNODENO
          );
          const toNodeCoords = coordinatesMapForGeoJSON.get(routeData.TONODENO);
          if (fromNodeCoords && toNodeCoords) {
            const currentRouteCoordinates = routeData.geometry?.coordinates || [
              [fromNodeCoords.lon, fromNodeCoords.lat],
              [toNodeCoords.lon, toNodeCoords.lat],
            ];
            geoJSONs.push({
              type: "Feature",
              properties: {
                linkId: routeData.linkNo,
                VC: routeData.VC,
                length: routeData.length,
                name: routeData.NAME,
                pollutionFactor: routeData.pollutionFactor,
              },
              geometry: {
                type: "LineString",
                coordinates: currentRouteCoordinates,
              },
            });
          }
        });
      }
      return geoJSONs;
    };

    const routeGeoJSONs = createGeoJSONs(optimalRoute.routeDetails);

    res.json({
      startNodeNo,
      endNodeNo,
      selectedRoute: {
        criteriaType: optimalRoute.criteriaType,
        totalCost: optimalRoute.totalCost,
        totalDuration: optimalRoute.totalDuration,
        totalDistance: optimalRoute.totalDistance,
        geoJSONs: routeGeoJSONs,
      },
      alternativeRoutes: alternativeRoutes.map((route) => ({
        criteriaType: route.criteriaType,
        totalCost: route.totalCost,
        totalDuration: route.totalDuration,
        totalDistance: route.totalDistance,
        geoJSONs: createGeoJSONs(route.routeDetails),
      })),
    });
  } catch (error) {
    console.error("Backend: Lỗi khi tìm tuyến đường:", error);
    res.status(500).json({ msg: "Đã xảy ra lỗi khi tìm tuyến đường." });
  } finally {
    console.timeEnd("find-route-api-call");
  }
});

module.exports = router;
