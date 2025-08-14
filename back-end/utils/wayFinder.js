const turf = require("@turf/turf");

function getBestRoute(routes, criteria) {
  if (!routes.length) return null;
  const bestRoute = [...routes].sort((a, b) => {
    switch (criteria) {
      case "optimal":
        return (
          a.metrics.distance +
          a.metrics.time +
          a.metrics.pollution +
          a.metrics.emission +
          a.metrics.health -
          (b.metrics.distance +
            b.metrics.time +
            b.metrics.pollution +
            b.metrics.emission +
            b.metrics.health)
        );
      case "shortest":
        return a.metrics.distance - b.metrics.distance;
      case "fastest":
        return a.metrics.time - b.metrics.time;
      case "least_pollution":
        return a.metrics.pollution - b.metrics.pollution;
      case "healthiest":
        return b.metrics.health - a.metrics.health;
      case "emission":
        return a.metrics.emission - b.metrics.emission;
      default:
        return a.metrics.distance - b.metrics.distance;
    }
  })[0];
  return {
    id: bestRoute.id,
    metrics: {
      distance: parseFloat(bestRoute.metrics.distance.toFixed(2)),
      time: parseFloat(bestRoute.metrics.time.toFixed(2)),
      pollution: parseFloat(bestRoute.metrics.pollution.toFixed(2)),
      emission: parseFloat(bestRoute.metrics.emission.toFixed(2)),
      health: parseFloat(bestRoute.metrics.health.toFixed(2)),
    },
    recommendedModes: bestRoute.segments.map((s) => s.recommendedMode || null),
    geometry: bestRoute.geometry,
    segmentFeatures: bestRoute.segmentFeatures,
  };
}

class BinaryHeap {
  constructor(compareFn = (a, b) => a.fScore - b.fScore) {
    this.elements = [];
    this.compare = compareFn;
  }
  enqueue(element) {
    this.elements.push(element);
    this._bubbleUp(this.elements.length - 1);
  }
  dequeue() {
    if (this.elements.length === 0) return null;
    const root = this.elements[0];
    const last = this.elements.pop();
    if (this.elements.length > 0) {
      this.elements[0] = last;
      this._sinkDown(0);
    }
    return root;
  }
  size() {
    return this.elements.length;
  }
  _bubbleUp(index) {
    const element = this.elements[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.elements[parentIndex];
      if (this.compare(element, parent) < 0) {
        this.elements[parentIndex] = element;
        this.elements[index] = parent;
        index = parentIndex;
      } else {
        break;
      }
    }
  }
  _sinkDown(index) {
    const length = this.elements.length;
    const element = this.elements[index];
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let swapIndex = null;
      if (leftChildIndex < length) {
        const leftChild = this.elements[leftChildIndex];
        if (this.compare(leftChild, element) < 0) {
          swapIndex = leftChildIndex;
        }
      }
      if (rightChildIndex < length) {
        const rightChild = this.elements[rightChildIndex];
        if (
          (swapIndex === null && this.compare(rightChild, element) < 0) ||
          (swapIndex !== null &&
            this.compare(rightChild, this.elements[swapIndex]) < 0)
        ) {
          swapIndex = rightChildIndex;
        }
      }
      if (swapIndex === null) break;
      this.elements[index] = this.elements[swapIndex];
      this.elements[swapIndex] = element;
      index = swapIndex;
    }
  }
}

class WayFinder {
  constructor(
    graph,
    coordinatesMap,
    mode,
    aqisData = [],
    maxRoutes = 3,
    simulatedTrafficImpacts = new Map()
  ) {
    this.graph = graph;
    this.coordinatesMap = coordinatesMap;
    this.mode = mode;
    this.aqisData = aqisData;
    this.maxRoutes = maxRoutes;
    this.aqisMap = this.buildAqisMap(aqisData);
    this.allowedTransportModes = [
      "walking",
      "cycling",
      "motorcycle",
      "driving",
    ];
    this.simulatedTrafficImpacts = simulatedTrafficImpacts;
    this.segmentCostCache = new Map();
  }

  buildAqisMap(aqisRecords) {
    const map = new Map();
    aqisRecords.forEach((record) => {
      map.set(record.stationId, record);
    });
    return map;
  }

  _heuristic(node1Id, node2Id) {
    const coord1 = this.coordinatesMap.get(node1Id);
    const coord2 = this.coordinatesMap.get(node2Id);
    if (!coord1 || !coord2) return Infinity;
    return turf.distance(
      turf.point([coord1.lon, coord1.lat]),
      turf.point([coord2.lon, coord2.lat]),
      { units: "kilometers" }
    );
  }

  calculateTime(
    distance,
    segmentMode = null,
    segmentSpeedFromData = null,
    fromNodeId = null,
    toNodeId = null,
    vc = null
  ) {
    let multiplier = 1;
    if (fromNodeId && toNodeId) {
      const segmentKey = `${fromNodeId}-${toNodeId}`;
      const reverseSegmentKey = `${toNodeId}-${fromNodeId}`;
      const trafficImpact =
        this.simulatedTrafficImpacts.get(segmentKey) ||
        this.simulatedTrafficImpacts.get(reverseSegmentKey);
      if (trafficImpact) {
        if (trafficImpact.isBlocked) return Infinity;
        multiplier = trafficImpact.travelTimeMultiplier || 1;
      } else if (vc !== null && vc !== undefined) {
        multiplier = vc <= 0.6 ? 1 : vc <= 0.8 ? 1.2 : 1.5;
      }
    }
    const baseSpeeds = {
      walking: 5,
      cycling: 20,
      motorcycle: 50,
      driving: 40,
    };
    const actualMode = segmentMode || this.mode;
    const speed =
      segmentSpeedFromData && segmentSpeedFromData > 0
        ? segmentSpeedFromData
        : baseSpeeds[actualMode] || 20;
    return (distance / speed) * 60 * multiplier;
  }

  _getAqisImpactForSegment(fromNodeId, toNodeId, routeGeometry) {
    if (
      !routeGeometry?.coordinates?.length ||
      !Array.isArray(routeGeometry.coordinates)
    ) {
      return {
        aqi: 0,
        pm25: 0,
        pm10: 0,
        isSimulatedAqi: false,
        simulatedAqiIds: [],
      };
    }
    const validCoordinates = routeGeometry.coordinates.filter(
      (coord) =>
        Array.isArray(coord) &&
        coord.length === 2 &&
        !isNaN(coord[0]) &&
        !isNaN(coord[1])
    );
    if (validCoordinates.length < 2) {
      return {
        aqi: 0,
        pm25: 0,
        pm10: 0,
        isSimulatedAqi: false,
        simulatedAqiIds: [],
      };
    }
    const line = turf.lineString(validCoordinates);
    let totalAqi = 0,
      totalPm25 = 0,
      totalPm10 = 0,
      totalWeight = 0;
    const simulatedAqiIds = new Set();
    let aqiCount = 0;
    this.aqisData.forEach((aqisRecord) => {
      if (
        aqisRecord?.location?.coordinates &&
        Array.isArray(aqisRecord.location.coordinates) &&
        aqisRecord.location.coordinates.length === 2 &&
        !isNaN(aqisRecord.location.coordinates[0]) &&
        !isNaN(aqisRecord.location.coordinates[1])
      ) {
        const point = turf.point(aqisRecord.location.coordinates);
        const distance = turf.pointToLineDistance(point, line, {
          units: "kilometers",
        });
        const maxRadius = aqisRecord.radiusKm || 15;
        if (distance < maxRadius) {
          const proximityFactor = 1 - distance / maxRadius;
          const weight = 200 * Math.pow(proximityFactor, 1000);
          const cappedWeight = Math.min(weight, 200);
          totalAqi += (aqisRecord.aqi || 0) * cappedWeight;
          totalPm25 += (aqisRecord.pm25 || 0) * cappedWeight;
          totalPm10 += (aqisRecord.pm10 || 0) * cappedWeight;
          totalWeight += cappedWeight;
          aqiCount++;
          if (aqisRecord.isSimulated && aqisRecord.simulationId) {
            simulatedAqiIds.add(aqisRecord.simulationId);
          }
        }
      }
    });
    return totalWeight > 0
      ? {
          aqi: Number((totalAqi / totalWeight).toFixed(2)),
          pm25: Number((totalPm25 / totalWeight).toFixed(2)),
          pm10: Number((totalPm10 / totalWeight).toFixed(2)),
          isSimulatedAqi: simulatedAqiIds.size > 0,
          simulatedAqiIds: Array.from(simulatedAqiIds),
          aqiCount,
        }
      : {
          aqi: 0,
          pm25: 0,
          pm10: 0,
          isSimulatedAqi: false,
          simulatedAqiIds: [],
          aqiCount: 0,
        };
  }

  estimateEmission(mode, distance) {
    const emissionFactors = {
      cycling: 0,
      walking: 0,
      motorcycle: 120,
      driving: 200,
    };
    return (emissionFactors[mode] || 0) * distance;
  }

  _calculateSegmentCost(routeData, criteria) {
    const cacheKey = `${routeData.FROMNODENO}-${routeData.TONODENO}-${criteria}`;
    if (this.segmentCostCache.has(cacheKey)) {
      return this.segmentCostCache.get(cacheKey);
    }
    const distance = routeData.LENGTH || 0;
    const time = this.calculateTime(
      distance,
      null,
      routeData.SPEED,
      routeData.FROMNODENO,
      routeData.TONODENO,
      routeData.VC
    );
    const aqisImpact = this._getAqisImpactForSegment(
      routeData.FROMNODENO,
      routeData.TONODENO,
      routeData.geometry
    );
    const emission = this.estimateEmission(this.mode, distance);
    const healthCost = this._calculateModeHealthScore(
      this.mode,
      distance,
      aqisImpact.aqi
    );
    let cost = 0;
    switch (criteria) {
      case "optimal":
        cost =
          distance + time + aqisImpact.aqi * 2 + emission - healthCost * 0.1;
        break;
      case "shortest":
        cost = distance;
        break;
      case "fastest":
        cost = time;
        break;
      case "least_pollution":
        cost = aqisImpact.aqi * 5 + distance * 1;
        break;
      case "healthiest":
        cost = -healthCost + aqisImpact.aqi * 0.5;
        break;
      case "emission":
        cost = emission;
        break;
      default:
        cost = distance + time;
    }
    const result = {
      cost,
      metrics: {
        distance,
        time,
        pollution: aqisImpact.aqi,
        emission,
        health: healthCost,
      },
    };
    this.segmentCostCache.set(cacheKey, result);
    return result;
  }

  _calculateModeHealthScore(mode, distance, aqi) {
    let score =
      { walking: 100, cycling: 80, motorcycle: 0, driving: 0 }[mode] || 0;
    const distancePenalties = {
      walking: Math.max(0, (distance - 1.0) * 10),
      cycling: Math.max(0, (distance - 5.0) * 3),
      motorcycle: Math.max(0, (distance - 15) * 0.2),
      driving: Math.max(0, (distance - 20) * 0.1),
    };
    score -= distancePenalties[mode] || 0;
    const aqiPenalties = {
      walking: 0.5,
      cycling: 0.4,
      motorcycle: 1,
      driving: 0.8,
    };
    score -= aqi * (aqiPenalties[mode] || 0);
    return score;
  }

  findAllRoutes(startNodeId, endNodeId, criteria) {
    const routes = [];
    const foundRouteKeys = new Set();
    const maxRoutes = 3;
    const minRouteDifference = 0.3;

    const firstRoute = this._findShortestPath(
      startNodeId,
      endNodeId,
      criteria,
      new Set()
    );
    if (!firstRoute) return [];

    routes.push(firstRoute);
    foundRouteKeys.add(JSON.stringify(firstRoute.path));

    const potentialAlternatives = [];

    for (let i = 0; i < firstRoute.path.length - 1; i++) {
      const spurNode = firstRoute.path[i];
      const nextNode = firstRoute.path[i + 1];
      const bannedEdges = new Set([`${spurNode}-${nextNode}`]);
      const newRoute = this._findShortestPath(
        startNodeId,
        endNodeId,
        criteria,
        bannedEdges
      );
      if (newRoute) {
        const routeKey = JSON.stringify(newRoute.path);
        if (!foundRouteKeys.has(routeKey)) {
          let maxOverlap = 0;
          routes.forEach((existingRoute) => {
            const existingSegments = new Set(
              existingRoute.segments.map((s) => `${s.FROMNODENO}-${s.TONODENO}`)
            );
            const newSegmentsSet = new Set(
              newRoute.segments.map((s) => `${s.FROMNODENO}-${s.TONODENO}`)
            );
            const overlap =
              [...newSegmentsSet].filter((s) => existingSegments.has(s))
                .length / newSegmentsSet.size;
            maxOverlap = Math.max(maxOverlap, overlap);
          });
          if (maxOverlap <= 1 - minRouteDifference) {
            potentialAlternatives.push(newRoute);
            foundRouteKeys.add(routeKey);
          }
        }
      }
    }

    // Sắp xếp potentialAlternatives theo distance trước khi thêm vào routes
    potentialAlternatives.sort(
      (a, b) => a.metrics.distance - b.metrics.distance
    );

    for (
      let k = 0;
      k < potentialAlternatives.length && routes.length < maxRoutes;
      k++
    ) {
      routes.push(potentialAlternatives[k]);
    }

    // Sắp xếp lại toàn bộ routes theo cost
    routes.sort((a, b) => {
      const costA = this._calculateSegmentCost(
        {
          FROMNODENO: a.path[0],
          TONODENO: a.path[a.path.length - 1],
          LENGTH: a.metrics.distance,
        },
        criteria
      ).cost;
      const costB = this._calculateSegmentCost(
        {
          FROMNODENO: b.path[0],
          TONODENO: b.path[b.path.length - 1],
          LENGTH: b.metrics.distance,
        },
        criteria
      ).cost;
      return costA - costB;
    });

    return routes.map((route, index) => {
      let finalSegments = route.segments.map((s) => ({
        ...s,
        time: this.calculateTime(
          s.LENGTH,
          null,
          s.SPEED,
          s.FROMNODENO,
          s.TONODENO,
          s.VC
        ),
      }));
      // Sử dụng suggestTransportForSegments khi criteria là healthiest
      if (criteria === "healthiest") {
        finalSegments = this.suggestTransportForSegments(finalSegments);
      }
      return {
        id: `route_${index + 1}`,
        path: route.path,
        segments: finalSegments,
        metrics: {
          distance: parseFloat(route.metrics.distance.toFixed(2)),
          time: parseFloat(route.metrics.time.toFixed(2)),
          pollution: parseFloat(route.metrics.pollution.toFixed(2)),
          emission: parseFloat(route.metrics.emission.toFixed(2)),
          health: parseFloat(
            finalSegments
              .reduce(
                (sum, segment) => sum + (segment.healthScore || 0),
                route.metrics.health
              )
              .toFixed(2)
          ),
        },
        geometry: route.geometry,
        segmentFeatures: route.segmentFeatures,
        properties: {
          recommendedModes:
            criteria === "healthiest"
              ? finalSegments.map((s) => s.recommendedMode || null)
              : [],
        },
      };
    });
  }

  suggestTransportForSegments(segments) {
    if (!segments.length) return [];
    const totalLength = segments.reduce((sum, s) => sum + (s.LENGTH || 0), 0);
    const walkingTarget = Math.min(totalLength, 2.0);
    let walkingLength = 0;
    const finalSegments = [];
    let currentSegment = null;
    const modePriority = ["walking", "cycling", "motorcycle", "driving"];
    const distanceThresholds = {
      walking: 1.0,
      cycling: 10.0,
      motorcycle: 30.0,
      driving: Infinity,
    };

    const determineMode = (length, aqiImpact, usedModes) => {
      const aqi = aqiImpact.aqi || 0;
      for (const mode of modePriority) {
        if (
          !usedModes.includes(mode) &&
          length <= distanceThresholds[mode] &&
          (mode !== "walking" || walkingLength + length <= walkingTarget) &&
          !(aqi > 100 && (mode === "walking" || mode === "cycling"))
        ) {
          return mode;
        }
      }
      return modePriority.find((m) => !usedModes.includes(m)) || this.mode;
    };

    let accumulatedLength = 0;
    const targetSegments = 4;
    const lengthPerSegment = totalLength / targetSegments;

    segments.forEach((s, index) => {
      const segmentLength = s.LENGTH || 0;
      const segmentAqiImpact = this._getAqisImpactForSegment(
        s.FROMNODENO,
        s.TONODENO,
        s.geometry
      );

      if (!currentSegment || accumulatedLength >= lengthPerSegment) {
        if (currentSegment) {
          finalSegments.push(currentSegment);
        }
        currentSegment = {
          FROMNODENO: s.FROMNODENO,
          TONODENO: s.TONODENO,
          LENGTH: 0,
          TRAVELTIME: 0,
          aqiImpact: {
            aqi: 0,
            pm25: 0,
            pm10: 0,
            isSimulatedAqi: false,
            simulatedAqiIds: [],
          },
          healthScore: 0,
          geometry: { type: "LineString", coordinates: [] },
          subSegments: [],
        };
        accumulatedLength = 0;
      }

      let segmentCoords = s.geometry.coordinates.slice();

      if (currentSegment.geometry.coordinates.length > 0) {
        const lastCoord =
          currentSegment.geometry.coordinates[
            currentSegment.geometry.coordinates.length - 1
          ];
        const distToFirst = turf.distance(
          turf.point(lastCoord),
          turf.point(segmentCoords[0]),
          { units: "meters" }
        );
        const distToLast = turf.distance(
          turf.point(lastCoord),
          turf.point(segmentCoords[segmentCoords.length - 1]),
          { units: "meters" }
        );
        if (distToLast < distToFirst) {
          segmentCoords = segmentCoords.reverse();
        }
      }

      currentSegment.TONODENO = s.TONODENO;
      currentSegment.LENGTH += segmentLength;
      currentSegment.aqiImpact.aqi =
        (currentSegment.aqiImpact.aqi * currentSegment.subSegments.length +
          segmentAqiImpact.aqi) /
        (currentSegment.subSegments.length + 1);
      currentSegment.aqiImpact.pm25 =
        (currentSegment.aqiImpact.pm25 * currentSegment.subSegments.length +
          segmentAqiImpact.pm25) /
        (currentSegment.subSegments.length + 1);
      currentSegment.aqiImpact.pm10 =
        (currentSegment.aqiImpact.pm10 * currentSegment.subSegments.length +
          segmentAqiImpact.pm10) /
        (currentSegment.subSegments.length + 1);
      currentSegment.aqiImpact.isSimulatedAqi =
        currentSegment.aqiImpact.isSimulatedAqi ||
        segmentAqiImpact.isSimulatedAqi;
      segmentAqiImpact.simulatedAqiIds.forEach((id) => {
        if (!currentSegment.aqiImpact.simulatedAqiIds.includes(id)) {
          currentSegment.aqiImpact.simulatedAqiIds.push(id);
        }
      });
      if (currentSegment.geometry.coordinates.length === 0) {
        currentSegment.geometry.coordinates.push(...segmentCoords);
      } else {
        currentSegment.geometry.coordinates.push(...segmentCoords.slice(1));
      }
      currentSegment.subSegments.push(s);
      accumulatedLength += segmentLength;
    });

    if (currentSegment) {
      finalSegments.push(currentSegment);
    }

    while (finalSegments.length < 4) {
      finalSegments.push({
        FROMNODENO:
          finalSegments.length > 0
            ? finalSegments[finalSegments.length - 1].TONODENO
            : segments[0].FROMNODENO,
        TONODENO:
          finalSegments.length > 0
            ? segments[segments.length - 1].TONODENO
            : segments[0].TONODENO,
        LENGTH: 0,
        TRAVELTIME: 0,
        aqiImpact: {
          aqi: 0,
          pm25: 0,
          pm10: 0,
          isSimulatedAqi: false,
          simulatedAqiIds: [],
        },
        healthScore: 0,
        geometry: { type: "LineString", coordinates: [] },
        subSegments: [],
      });
    }

    const usedModes = [];
    const resultSegments = finalSegments.map((segment) => {
      const recommendedMode = determineMode(
        segment.LENGTH,
        segment.aqiImpact,
        usedModes
      );
      usedModes.push(recommendedMode);
      if (recommendedMode === "walking") walkingLength += segment.LENGTH;

      const travelTime = this.calculateTime(
        segment.LENGTH,
        recommendedMode,
        null,
        segment.FROMNODENO,
        segment.TONODENO,
        null
      );
      const healthScore = this._calculateModeHealthScore(
        recommendedMode,
        segment.LENGTH,
        segment.aqiImpact.pm25
      );

      return {
        FROMNODENO: segment.FROMNODENO,
        TONODENO: segment.TONODENO,
        LENGTH: parseFloat(segment.LENGTH.toFixed(2)),
        TRAVELTIME: parseFloat(travelTime.toFixed(2)),
        recommendedMode,
        healthScore: parseFloat(healthScore.toFixed(2)),
        aqiImpact: {
          aqi: parseFloat(segment.aqiImpact.aqi.toFixed(2)),
          pm25: parseFloat(segment.aqiImpact.pm25.toFixed(2)),
          pm10: parseFloat(segment.aqiImpact.pm10.toFixed(2)),
          isSimulatedAqi: segment.aqiImpact.isSimulatedAqi,
          simulatedAqiIds: segment.aqiImpact.simulatedAqiIds,
        },
        geometry: segment.geometry,
        subSegments: segment.subSegments,
      };
    });

    if (!usedModes.includes("walking") && walkingLength < walkingTarget) {
      const eligibleSegment = resultSegments.find(
        (s) =>
          s.recommendedMode !== "walking" &&
          s.LENGTH <= 1.0 &&
          s.aqiImpact.aqi <= 100
      );
      if (eligibleSegment) {
        eligibleSegment.recommendedMode = "walking";
        eligibleSegment.TRAVELTIME = this.calculateTime(
          eligibleSegment.LENGTH,
          "walking",
          null,
          eligibleSegment.FROMNODENO,
          eligibleSegment.TONODENO,
          null
        );
        eligibleSegment.healthScore = this._calculateModeHealthScore(
          "walking",
          eligibleSegment.LENGTH,
          eligibleSegment.aqiImpact.pm25
        );
        const modeIndex = usedModes.indexOf(eligibleSegment.recommendedMode);
        if (modeIndex !== -1) usedModes[modeIndex] = "walking";
      }
    }

    return resultSegments.slice(0, 4);
  }

  _findShortestPath(startNodeId, endNodeId, criteria, usedEdges) {
    const openSet = new BinaryHeap();
    const gScore = new Map();
    const cameFrom = new Map();
    gScore.set(startNodeId, 0);
    openSet.enqueue({
      node: startNodeId,
      path: [startNodeId],
      gScore: 0,
      fScore: this._heuristic(startNodeId, endNodeId),
      metrics: { distance: 0, time: 0, pollution: 0, emission: 0, health: 0 },
      segments: [],
      geometry: { type: "LineString", coordinates: [] },
      segmentFeatures: [],
    });

    while (openSet.size() > 0) {
      const current = openSet.dequeue();
      const currentNodeId = current.node;
      if (current.gScore > (gScore.get(currentNodeId) || Infinity)) continue;
      if (currentNodeId === endNodeId) {
        return {
          path: current.path,
          segments: current.segments,
          metrics: current.metrics,
          geometry: current.geometry,
          segmentFeatures: current.segmentFeatures,
          tree: { gScore, cameFrom },
        };
      }
      const neighbors = this.graph[currentNodeId] || [];
      for (const { neighbor: neighborNodeId, routeData } of neighbors) {
        const edgeKey = `${currentNodeId}-${neighborNodeId}`;
        if (usedEdges.has(edgeKey)) continue;
        const reverseEdgeKey = `${neighborNodeId}-${currentNodeId}`;
        if (usedEdges.has(reverseEdgeKey)) continue;
        const trafficImpact =
          this.simulatedTrafficImpacts.get(edgeKey) ||
          this.simulatedTrafficImpacts.get(reverseEdgeKey);
        if (trafficImpact?.isBlocked) continue;

        const { cost: segmentCost, metrics } = this._calculateSegmentCost(
          routeData,
          criteria
        );
        const tentativeGScore = current.gScore + segmentCost;
        if (tentativeGScore < (gScore.get(neighborNodeId) || Infinity)) {
          gScore.set(neighborNodeId, tentativeGScore);
          cameFrom.set(neighborNodeId, { prev: currentNodeId, routeData });
          const newPath = [...current.path, neighborNodeId];
          const newSegments = [...current.segments, routeData];
          let newCoords = routeData.geometry?.coordinates?.slice() || [];
          if (current.geometry.coordinates.length > 0) {
            const lastCoord =
              current.geometry.coordinates[
                current.geometry.coordinates.length - 1
              ];
            const distToFirst = turf.distance(
              turf.point(lastCoord),
              turf.point(newCoords[0]),
              { units: "meters" }
            );
            const distToLast = turf.distance(
              turf.point(lastCoord),
              turf.point(newCoords[newCoords.length - 1]),
              { units: "meters" }
            );
            if (distToLast < distToFirst) {
              newCoords = newCoords.reverse();
            }
          }
          const newGeometryCoordinates = [
            ...current.geometry.coordinates,
            ...(current.geometry.coordinates.length > 0
              ? newCoords.slice(1)
              : newCoords),
          ];
          const newMetrics = {
            distance: current.metrics.distance + metrics.distance,
            time: current.metrics.time + metrics.time,
            pollution: current.metrics.pollution + metrics.pollution,
            emission: current.metrics.emission + metrics.emission,
            health: current.metrics.health + metrics.health,
          };
          const aqiImpactForFeature = this._getAqisImpactForSegment(
            routeData.FROMNODENO,
            routeData.TONODENO,
            routeData.geometry
          );
          openSet.enqueue({
            node: neighborNodeId,
            path: newPath,
            gScore: tentativeGScore,
            fScore:
              tentativeGScore + this._heuristic(neighborNodeId, endNodeId),
            metrics: newMetrics,
            segments: newSegments,
            geometry: {
              type: "LineString",
              coordinates: newGeometryCoordinates,
            },
            segmentFeatures: [
              ...current.segmentFeatures,
              {
                type: "Feature",
                geometry: { type: "LineString", coordinates: newCoords },
                properties: {
                  ...routeData,
                  metrics,
                  aqiImpact: aqiImpactForFeature,
                  isSimulatedTraffic: !!trafficImpact,
                  simulationId: trafficImpact?._id || null,
                  isSimulatedAqi: aqiImpactForFeature.isSimulatedAqi,
                  simulatedAqiIds: aqiImpactForFeature.simulatedAqiIds,
                },
              },
            ],
          });
        }
      }
    }
    return null;
  }
}

module.exports = { WayFinder, getBestRoute };
