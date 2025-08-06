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
      "driving",
      "motorcycle",
    ];
    this.simulatedTrafficImpacts = simulatedTrafficImpacts;
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
    if (!coord1 || !coord2) {
      console.warn(
        `Missing coordinates for heuristic: ${node1Id} or ${node2Id}`
      );
      return Infinity;
    }
    const dx = coord1.lon - coord2.lon;
    const dy = coord1.lat - coord2.lat;
    return Math.sqrt(dx * dx + dy * dy);
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
        if (trafficImpact.isBlocked) {
          return Infinity;
        }
        multiplier = trafficImpact.travelTimeMultiplier || 1;
      } else if (vc !== null && vc !== undefined) {
        multiplier = vc <= 0.6 ? 1 : vc <= 0.8 ? 1.2 : 1.5;
      }
    }
    if (
      segmentSpeedFromData !== null &&
      segmentSpeedFromData !== undefined &&
      segmentSpeedFromData > 0
    ) {
      return (distance / segmentSpeedFromData) * 60 * multiplier;
    }
    const baseSpeeds = {
      walking: 5,
      cycling: 20,
      driving: 40,
      motorcycle: 50,
    };
    const actualMode = segmentMode || this.mode;
    const baseSpeed = baseSpeeds[actualMode];
    if (baseSpeed === undefined || baseSpeed <= 0) {
      console.warn(
        `Undefined or invalid base speed for mode: ${actualMode}. Using default 20 km/h.`
      );
      return (distance / 20) * 60 * multiplier;
    }
    return (distance / baseSpeed) * 60 * multiplier;
  }

  _getAqisImpactForSegment(fromNodeId, toNodeId, routeGeometry) {
    if (
      !routeGeometry ||
      !routeGeometry.coordinates ||
      routeGeometry.coordinates.length < 2
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
        typeof coord[0] === "number" &&
        !isNaN(coord[0]) &&
        typeof coord[1] === "number" &&
        !isNaN(coord[1])
    );
    if (validCoordinates.length < 2) {
      console.warn(
        "Invalid route geometry coordinates for AQIS impact calculation."
      );
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
      totalPm10 = 0;
    let count = 0;
    let isSimulatedAqi = false;
    const simulatedAqiIds = new Set();
    this.aqisData.forEach((aqisRecord) => {
      if (
        aqisRecord.location &&
        Array.isArray(aqisRecord.location.coordinates) &&
        aqisRecord.location.coordinates.length === 2 &&
        typeof aqisRecord.location.coordinates[0] === "number" &&
        !isNaN(aqisRecord.location.coordinates[0]) &&
        typeof aqisRecord.location.coordinates[1] === "number" &&
        !isNaN(aqisRecord.location.coordinates[1])
      ) {
        const point = turf.point(aqisRecord.location.coordinates);
        const distance = turf.pointToLineDistance(point, line, {
          units: "kilometers",
        });
        const effectiveRadius = aqisRecord.radiusKm || 50;
        if (distance < effectiveRadius) {
          totalAqi += aqisRecord.aqi || 0;
          totalPm25 += aqisRecord.pm25 || 0;
          totalPm10 += aqisRecord.pm10 || 0;
          count++;
          if (aqisRecord.isSimulated) {
            isSimulatedAqi = true;
            if (aqisRecord.simulationId) {
              simulatedAqiIds.add(aqisRecord.simulationId);
            }
          }
        }
      } else {
        console.warn(
          "Skipping invalid AQIS record due to malformed coordinates:",
          aqisRecord
        );
      }
    });
    return count > 0
      ? {
          aqi: totalAqi / count,
          pm25: totalPm25 / count,
          pm10: totalPm10 / count,
          isSimulatedAqi,
          simulatedAqiIds: Array.from(simulatedAqiIds),
        }
      : {
          aqi: 0,
          pm25: 0,
          pm10: 0,
          isSimulatedAqi: false,
          simulatedAqiIds: [],
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
    const weights = {
      distance: 1,
      time: 1,
      pollution: 2,
      emission: 1,
      health: 3,
    };
    let cost = 0,
      pollutionCost = 0,
      healthCost = 0;
    switch (criteria) {
      case "optimal":
        pollutionCost = aqisImpact.aqi * weights.pollution;
        healthCost = this._calculateModeHealthScore(
          this.mode,
          distance,
          aqisImpact.aqi
        );
        cost =
          distance * weights.distance +
          time * weights.time +
          pollutionCost +
          emission * weights.emission -
          healthCost * 0.1;
        break;
      case "shortest":
        cost = distance;
        break;
      case "fastest":
        cost = time;
        break;
      case "least_pollution":
        pollutionCost = aqisImpact.aqi * 10;
        cost = pollutionCost + distance * 0.05;
        break;
      case "healthiest":
        healthCost = this._calculateModeHealthScore(
          this.mode,
          distance,
          aqisImpact.aqi
        );
        cost = -healthCost;
        cost += aqisImpact.aqi * 0.5;
        break;
      case "emission":
        cost = emission;
        break;
      default:
        cost = distance * weights.distance + time * weights.time;
        break;
    }
    return {
      cost,
      metrics: {
        distance,
        time,
        pollution: aqisImpact.aqi,
        emission,
        health: healthCost,
      },
    };
  }

  _calculateModeHealthScore(mode, distance, aqi) {
    let score = 0;
    switch (mode) {
      case "walking":
        score += 100;
        break;
      case "cycling":
        score += 80;
        break;
      case "motorcycle":
        score += 0;
        break;
      case "driving":
        score += 0;
        break;
    }
    switch (mode) {
      case "walking":
        score -= Math.max(0, (distance - 1.0) * 10);
        break;
      case "cycling":
        score -= Math.max(0, (distance - 5.0) * 3);
        break;
      case "motorcycle":
        score -= Math.max(0, (distance - 15) * 0.2);
        break;
      case "driving":
        score -= Math.max(0, (distance - 20) * 0.1);
        break;
    }
    if (aqi > 0) {
      switch (mode) {
        case "walking":
          score -= aqi * 0.5;
          break;
        case "cycling":
          score -= aqi * 0.4;
          break;
        case "motorcycle":
          score -= aqi * 1;
          break;
        case "driving":
          score -= aqi * 0.8;
          break;
      }
    }
    return score;
  }

  findAllRoutes(startNodeId, endNodeId, criteria) {
    // 1. Chuẩn bị dữ liệu ban đầu
    const originalGraph = JSON.parse(JSON.stringify(this.graph));
    const A = [];
    const B = new PriorityQueue();
    const foundRouteKeys = new Set();
    const segmentUsage = new Map();
    const maxAttempts = 50;
    const diversityPenaltyBase = 50;
    const minRouteDifference = 0.6;

    // 2. Tìm tuyến đầu tiên
    const firstRoute = this._findShortestPath(
      startNodeId,
      endNodeId,
      criteria,
      new Set()
    );
    if (!firstRoute) return [];

    A.push(firstRoute);
    foundRouteKeys.add(JSON.stringify(firstRoute.path));
    firstRoute.segments.forEach((seg) => {
      const key = `${seg.FROMNODENO}-${seg.TONODENO}`;
      segmentUsage.set(key, (segmentUsage.get(key) || 0) + 1);
    });

    // 3. Tìm các tuyến tiếp theo
    for (let k = 1; k < this.maxRoutes; k++) {
      const prevRoute = A[k - 1];
      if (!prevRoute) break;

      let attempts = 0;
      for (
        let i = 0;
        i < prevRoute.path.length - 1 && attempts < maxAttempts;
        i++, attempts++
      ) {
        // 3.1. Chuẩn bị spur path
        const spurNode = prevRoute.path[i];
        const rootPath = prevRoute.path.slice(0, i + 1);

        // 3.2. Tạo đồ thị tạm thời
        const modifiedGraph = JSON.parse(JSON.stringify(this.graph));
        for (let j = 0; j < i; j++) {
          const node = prevRoute.path[j];
          if (modifiedGraph[node]) {
            modifiedGraph[node] = modifiedGraph[node].filter(
              (n) => n.neighbor !== prevRoute.path[j + 1]
            );
          }
        }
        this.graph = modifiedGraph;

        // 3.3. Tìm spur path
        const blockedEdges = new Set();
        for (let p = 0; p < k; p++) {
          const otherPath = A[p];
          if (otherPath.path.slice(0, i + 1).join("-") === rootPath.join("-")) {
            blockedEdges.add(`${otherPath.path[i]}-${otherPath.path[i + 1]}`);
          }
        }

        const spurPath = this._findShortestPath(
          spurNode,
          endNodeId,
          criteria,
          blockedEdges
        );
        this.graph = originalGraph;

        if (spurPath) {
          // 3.4. Kết hợp root path và spur path
          const rootSegments = prevRoute.segments.slice(0, i);
          let rootGeometryCoords = [];
          if (i > 0) {
            rootGeometryCoords = prevRoute.segments
              .slice(0, i)
              .flatMap((seg, idx) =>
                idx === 0
                  ? seg.geometry.coordinates
                  : seg.geometry.coordinates.slice(1)
              );
          }
          const rootSegmentFeatures = prevRoute.segmentFeatures.slice(0, i);

          let rootMetrics = {
            distance: 0,
            time: 0,
            pollution: 0,
            emission: 0,
            health: 0,
          };
          rootSegments.forEach((seg) => {
            const { metrics } = this._calculateSegmentCost(seg, criteria);
            rootMetrics.distance += metrics.distance;
            rootMetrics.time += metrics.time;
            rootMetrics.pollution += metrics.pollution;
            rootMetrics.emission += metrics.emission;
            rootMetrics.health += metrics.health;
          });

          const newPath = [...rootPath.slice(0, -1), ...spurPath.path];
          const newSegments = [...rootSegments, ...spurPath.segments];
          const newGeometry = turf.lineString([
            ...rootGeometryCoords,
            ...spurPath.geometry.coordinates,
          ]);
          const newSegmentFeatures = [
            ...rootSegmentFeatures,
            ...spurPath.segmentFeatures,
          ];

          const newMetrics = {
            distance: rootMetrics.distance + spurPath.metrics.distance,
            time: rootMetrics.time + spurPath.metrics.time,
            pollution: rootMetrics.pollution + spurPath.metrics.pollution,
            emission: rootMetrics.emission + spurPath.metrics.emission,
            health: rootMetrics.health + spurPath.metrics.health,
          };

          // 3.5. Kiểm tra độ đa dạng
          const routeKey = JSON.stringify(newPath);
          if (!foundRouteKeys.has(routeKey)) {
            const newSegmentsSet = new Set(
              newSegments.map((s) => `${s.FROMNODENO}-${s.TONODENO}`)
            );

            let maxOverlap = 0;
            A.forEach((existingRoute) => {
              const existingSegments = new Set(
                existingRoute.segments.map(
                  (s) => `${s.FROMNODENO}-${s.TONODENO}`
                )
              );
              const overlap =
                [...newSegmentsSet].filter((s) => existingSegments.has(s))
                  .length / newSegmentsSet.size;
              maxOverlap = Math.max(maxOverlap, overlap);
            });

            if (maxOverlap <= 1 - minRouteDifference) {
              // 3.6. Tính toán chi phí đã điều chỉnh
              let overlapPenalty = 0;
              newSegments.forEach((seg) => {
                const segKey = `${seg.FROMNODENO}-${seg.TONODENO}`;
                const frequency = segmentUsage.get(segKey) || 0;
                overlapPenalty += diversityPenaltyBase * (1 + frequency);
              });

              const adjustedCost =
                criteria === "healthiest"
                  ? -newMetrics.health + overlapPenalty
                  : newMetrics[criteria] + overlapPenalty;

              // 3.7. Thêm vào hàng đợi ưu tiên
              B.enqueue({
                path: newPath,
                segments: newSegments,
                metrics: newMetrics,
                geometry: newGeometry,
                segmentFeatures: newSegmentFeatures,
                gScore: adjustedCost,
              });
            }
          }
        }
      }

      if (B.size() === 0) break;

      // 4. Lấy tuyến tốt nhất tiếp theo
      const nextRoute = B.dequeue();
      A.push(nextRoute);
      foundRouteKeys.add(JSON.stringify(nextRoute.path));
      nextRoute.segments.forEach((seg) => {
        const key = `${seg.FROMNODENO}-${seg.TONODENO}`;
        segmentUsage.set(key, (segmentUsage.get(key) || 0) + 1);
      });
    }

    // 5. Xử lý kết quả cuối cùng
    return A.map((route, index) => {
      let finalSegments;
      let finalMetrics = route.metrics;

      if (criteria === "healthiest") {
        finalSegments = this.suggestTransportForSegments(route.segments);
        const totalHealthScore = finalSegments.reduce(
          (sum, segment) => sum + (segment.healthScore || 0),
          0
        );
        finalMetrics = { ...route.metrics, health: totalHealthScore };
      } else {
        finalSegments = route.segments.map((s) => ({
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
      }

      return {
        id: `route_${index + 1}`,
        path: route.path,
        segments: finalSegments,
        metrics: {
          distance: parseFloat(finalMetrics.distance.toFixed(2)),
          time: parseFloat(finalMetrics.time.toFixed(2)),
          pollution: parseFloat(finalMetrics.pollution.toFixed(2)),
          emission: parseFloat(finalMetrics.emission.toFixed(2)),
          health: parseFloat(finalMetrics.health.toFixed(2)),
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
    const originalSegmentCount = segments.length;
    console.log(
      `[suggestTransportForSegments] Starting with ${originalSegmentCount} original segments.`
    );
    if (originalSegmentCount === 0) {
      console.warn(
        "[suggestTransportForSegments] Input segments array is empty, returning empty array."
      );
      return [];
    }
    // Tính tổng chiều dài và mục tiêu đi bộ
    const totalLength = segments.reduce((sum, s) => sum + (s.LENGTH || 0), 0);
    const walkingTarget = Math.min(totalLength, 2.0); // 1/4 tổng chiều dài, tối đa 1 km
    let walkingLength = 0;
    const groupedSegmentsByLength = [];
    let currentGroup = null;
    // Ngưỡng khoảng cách
    const distanceThresholds = {
      walking: 1.0,
      cycling: 10.0,
      motorcycle: 30.0,
      driving: Infinity,
    };
    // Hàm xác định phương tiện, đảm bảo không lặp lại
    const determineModeByLength = (length, aqiImpact, usedModes) => {
      const aqi = aqiImpact.aqi || 0;
      const availableModes = this.allowedTransportModes.filter(
        (mode) => !usedModes.includes(mode)
      );
      if (
        length <= distanceThresholds.walking &&
        availableModes.includes("walking") &&
        walkingLength + length <= walkingTarget
      ) {
        return "walking";
      }
      if (aqi > 100 && availableModes.includes("driving")) {
        return "driving";
      }
      if (aqi > 100 && availableModes.includes("motorcycle")) {
        return "motorcycle";
      }
      if (
        length <= distanceThresholds.cycling &&
        availableModes.includes("cycling")
      ) {
        return "cycling";
      }
      if (
        length <= distanceThresholds.motorcycle &&
        availableModes.includes("motorcycle")
      ) {
        return "motorcycle";
      }
      return availableModes.includes("driving")
        ? "driving"
        : availableModes[0] || this.mode;
    };
    // Bước 1: Gộp segment dựa trên tọa độ
    segments.forEach((s) => {
      const segmentLength = s.LENGTH || 0;
      const segmentAqiImpact = this._getAqisImpactForSegment(
        s.FROMNODENO,
        s.TONODENO,
        s.geometry
      );
      if (!currentGroup) {
        currentGroup = {
          FROMNODENO: s.FROMNODENO,
          TONODENO: s.TONODENO,
          LENGTH: segmentLength,
          TRAVELTIME: 0,
          aqiImpact: { ...segmentAqiImpact },
          healthScore: 0,
          geometry: {
            type: "LineString",
            coordinates: [...s.geometry.coordinates],
          },
          subSegments: [s],
        };
      } else {
        const lastCoordOfPrevGroup =
          currentGroup.geometry.coordinates[
            currentGroup.geometry.coordinates.length - 1
          ];
        const firstCoordOfCurrentSegment = s.geometry.coordinates[0];
        const areCoordsClose =
          turf.distance(
            turf.point(lastCoordOfPrevGroup),
            turf.point(firstCoordOfCurrentSegment),
            { units: "meters" }
          ) < 20;
        if (!areCoordsClose) {
          if (currentGroup) {
            groupedSegmentsByLength.push(currentGroup);
          }
          currentGroup = {
            FROMNODENO: s.FROMNODENO,
            TONODENO: s.TONODENO,
            LENGTH: segmentLength,
            TRAVELTIME: 0,
            aqiImpact: { ...segmentAqiImpact },
            healthScore: 0,
            geometry: {
              type: "LineString",
              coordinates: [...s.geometry.coordinates],
            },
            subSegments: [s],
          };
        } else {
          currentGroup.TONODENO = s.TONODENO;
          currentGroup.LENGTH += segmentLength;
          currentGroup.aqiImpact.aqi =
            (currentGroup.aqiImpact.aqi * currentGroup.subSegments.length +
              segmentAqiImpact.aqi) /
            (currentGroup.subSegments.length + 1);
          currentGroup.aqiImpact.pm25 =
            (currentGroup.aqiImpact.pm25 * currentGroup.subSegments.length +
              segmentAqiImpact.pm25) /
            (currentGroup.subSegments.length + 1);
          currentGroup.aqiImpact.pm10 =
            (currentGroup.aqiImpact.pm10 * currentGroup.subSegments.length +
              segmentAqiImpact.pm10) /
            (currentGroup.subSegments.length + 1);
          currentGroup.aqiImpact.isSimulatedAqi =
            currentGroup.aqiImpact.isSimulatedAqi ||
            segmentAqiImpact.isSimulatedAqi;
          segmentAqiImpact.simulatedAqiIds.forEach((id) => {
            if (!currentGroup.aqiImpact.simulatedAqiIds.includes(id)) {
              currentGroup.aqiImpact.simulatedAqiIds.push(id);
            }
          });
          if (currentGroup.geometry.coordinates.length > 0) {
            currentGroup.geometry.coordinates.push(
              ...s.geometry.coordinates.slice(1)
            );
          } else {
            currentGroup.geometry.coordinates.push(...s.geometry.coordinates);
          }
          currentGroup.subSegments.push(s);
        }
      }
    });
    if (currentGroup) {
      groupedSegmentsByLength.push(currentGroup);
    }
    // Bước 2: Hợp nhất thành 2-4 nhóm
    const limitGroups = (groups, minGroups = 2, maxGroups = 4) => {
      if (groups.length <= maxGroups) return groups;
      const mergedGroups = [];
      let current = null;
      const totalLength = groups.reduce((sum, g) => sum + g.LENGTH, 0);
      const targetGroupLength = totalLength / maxGroups;
      groups.forEach((group) => {
        if (!current) {
          current = { ...group };
        } else if (
          mergedGroups.length < maxGroups - 1 &&
          current.LENGTH + group.LENGTH <= targetGroupLength * 1.5 &&
          turf.distance(
            turf.point(
              current.geometry.coordinates[
                current.geometry.coordinates.length - 1
              ]
            ),
            turf.point(group.geometry.coordinates[0]),
            { units: "meters" }
          ) < 20
        ) {
          current.TONODENO = group.TONODENO;
          current.LENGTH += group.LENGTH;
          current.geometry.coordinates.push(
            ...group.geometry.coordinates.slice(1)
          );
          current.subSegments.push(...group.subSegments);
          current.aqiImpact.aqi =
            (current.aqiImpact.aqi * current.subSegments.length +
              group.aqiImpact.aqi) /
            (current.subSegments.length + 1);
          current.aqiImpact.pm25 =
            (current.aqiImpact.pm25 * current.subSegments.length +
              group.aqiImpact.pm25) /
            (current.subSegments.length + 1);
          current.aqiImpact.pm10 =
            (current.aqiImpact.pm10 * current.subSegments.length +
              group.aqiImpact.pm10) /
            (current.subSegments.length + 1);
          current.aqiImpact.isSimulatedAqi =
            current.aqiImpact.isSimulatedAqi || group.aqiImpact.isSimulatedAqi;
          group.aqiImpact.simulatedAqiIds.forEach((id) => {
            if (!current.aqiImpact.simulatedAqiIds.includes(id)) {
              current.aqiImpact.simulatedAqiIds.push(id);
            }
          });
        } else {
          mergedGroups.push(current);
          current = { ...group };
        }
      });
      if (current) {
        mergedGroups.push(current);
      }
      while (mergedGroups.length < minGroups) {
        if (mergedGroups.length <= 1) break;
        mergedGroups[0].TONODENO = mergedGroups[1].TONODENO;
        mergedGroups[0].LENGTH += mergedGroups[1].LENGTH;
        mergedGroups[0].geometry.coordinates.push(
          ...mergedGroups[1].geometry.coordinates.slice(1)
        );
        mergedGroups[0].subSegments.push(...mergedGroups[1].subSegments);
        mergedGroups[0].aqiImpact.aqi =
          (mergedGroups[0].aqiImpact.aqi * mergedGroups[0].subSegments.length +
            mergedGroups[1].aqiImpact.aqi) /
          (mergedGroups[0].subSegments.length + 1);
        mergedGroups[0].aqiImpact.pm25 =
          (mergedGroups[0].aqiImpact.pm25 * mergedGroups[0].subSegments.length +
            mergedGroups[1].aqiImpact.pm25) /
          (mergedGroups[0].subSegments.length + 1);
        mergedGroups[0].aqiImpact.pm10 =
          (mergedGroups[0].aqiImpact.pm10 * mergedGroups[0].subSegments.length +
            mergedGroups[1].aqiImpact.pm10) /
          (mergedGroups[0].subSegments.length + 1);
        mergedGroups[0].aqiImpact.isSimulatedAqi =
          mergedGroups[0].aqiImpact.isSimulatedAqi ||
          mergedGroups[1].aqiImpact.isSimulatedAqi;
        mergedGroups[1].aqiImpact.simulatedAqiIds.forEach((id) => {
          if (!mergedGroups[0].aqiImpact.simulatedAqiIds.includes(id)) {
            mergedGroups[0].aqiImpact.simulatedAqiIds.push(id);
          }
        });
        mergedGroups.splice(1, 1);
      }
      while (mergedGroups.length > maxGroups) {
        if (mergedGroups.length <= 1) break;
        mergedGroups[mergedGroups.length - 2].TONODENO =
          mergedGroups[mergedGroups.length - 1].TONODENO;
        mergedGroups[mergedGroups.length - 2].LENGTH +=
          mergedGroups[mergedGroups.length - 1].LENGTH;
        mergedGroups[mergedGroups.length - 2].geometry.coordinates.push(
          ...mergedGroups[mergedGroups.length - 1].geometry.coordinates.slice(1)
        );
        mergedGroups[mergedGroups.length - 2].subSegments.push(
          ...mergedGroups[mergedGroups.length - 1].subSegments
        );
        mergedGroups[mergedGroups.length - 2].aqiImpact.aqi =
          (mergedGroups[mergedGroups.length - 2].aqiImpact.aqi *
            mergedGroups[mergedGroups.length - 2].subSegments.length +
            mergedGroups[mergedGroups.length - 1].aqiImpact.aqi) /
          (mergedGroups[mergedGroups.length - 2].subSegments.length + 1);
        mergedGroups[mergedGroups.length - 2].aqiImpact.pm25 =
          (mergedGroups[mergedGroups.length - 2].aqiImpact.pm25 *
            mergedGroups[mergedGroups.length - 2].subSegments.length +
            mergedGroups[mergedGroups.length - 1].aqiImpact.pm25) /
          (mergedGroups[mergedGroups.length - 2].subSegments.length + 1);
        mergedGroups[mergedGroups.length - 2].aqiImpact.pm10 =
          (mergedGroups[mergedGroups.length - 2].aqiImpact.pm10 *
            mergedGroups[mergedGroups.length - 2].subSegments.length +
            mergedGroups[mergedGroups.length - 1].aqiImpact.pm10) /
          (mergedGroups[mergedGroups.length - 2].subSegments.length + 1);
        mergedGroups[mergedGroups.length - 2].aqiImpact.isSimulatedAqi =
          mergedGroups[mergedGroups.length - 2].aqiImpact.isSimulatedAqi ||
          mergedGroups[mergedGroups.length - 1].aqiImpact.isSimulatedAqi;
        mergedGroups[mergedGroups.length - 1].aqiImpact.simulatedAqiIds.forEach(
          (id) => {
            if (
              !mergedGroups[
                mergedGroups.length - 2
              ].aqiImpact.simulatedAqiIds.includes(id)
            ) {
              mergedGroups[
                mergedGroups.length - 2
              ].aqiImpact.simulatedAqiIds.push(id);
            }
          }
        );
        mergedGroups.splice(mergedGroups.length - 1, 1);
      }
      return mergedGroups;
    };
    // Bước 3: Gán phương tiện duy nhất và hiển thị chỉ cho nhóm
    const assignUniqueModes = (groups) => {
      const usedModes = [];
      const result = groups.map((group) => {
        const recommendedMode = determineModeByLength(
          group.LENGTH,
          group.aqiImpact,
          usedModes
        );
        usedModes.push(recommendedMode);
        const travelTime = this.calculateTime(
          group.LENGTH,
          recommendedMode,
          null,
          group.FROMNODENO,
          group.TONODENO,
          null
        );
        const healthScore = this._calculateModeHealthScore(
          recommendedMode,
          group.LENGTH,
          group.aqiImpact.pm25
        );
        return {
          FROMNODENO: group.FROMNODENO,
          TONODENO: group.TONODENO,
          LENGTH: parseFloat(group.LENGTH.toFixed(2)),
          TRAVELTIME: parseFloat(travelTime.toFixed(2)),
          recommendedMode,
          healthScore: parseFloat(healthScore.toFixed(2)),
          aqiImpact: {
            aqi: parseFloat(group.aqiImpact.aqi.toFixed(2)),
            pm25: parseFloat(group.aqiImpact.pm25.toFixed(2)),
            pm10: parseFloat(group.aqiImpact.pm10.toFixed(2)),
            isSimulatedAqi: group.aqiImpact.isSimulatedAqi,
            simulatedAqiIds: group.aqiImpact.simulatedAqiIds,
          },
          geometry: group.geometry,
          subSegments: group.subSegments,
        };
      });
      // Đảm bảo đi bộ xuất hiện nếu chưa đạt walkingTarget
      if (!usedModes.includes("walking") && walkingLength < walkingTarget) {
        const smallestNonWalkingGroup = result
          .filter((g) => g.recommendedMode !== "walking" && g.LENGTH <= 1.0)
          .reduce((min, g) => (g.LENGTH < min.LENGTH ? g : min), result[0]);
        if (smallestNonWalkingGroup && smallestNonWalkingGroup.LENGTH <= 1.0) {
          smallestNonWalkingGroup.recommendedMode = "walking";
          smallestNonWalkingGroup.TRAVELTIME = this.calculateTime(
            smallestNonWalkingGroup.LENGTH,
            "walking",
            null,
            smallestNonWalkingGroup.FROMNODENO,
            smallestNonWalkingGroup.TONODENO,
            null
          );
          smallestNonWalkingGroup.healthScore = this._calculateModeHealthScore(
            "walking",
            smallestNonWalkingGroup.LENGTH,
            smallestNonWalkingGroup.aqiImpact.pm25
          );
        }
      }
      return result;
    };
    // Áp dụng các bước
    let mergedGroups = limitGroups(groupedSegmentsByLength);
    const finalGroupedSegments = assignUniqueModes(mergedGroups);
    // Hiển thị phương tiện chỉ tại điểm bắt đầu của mỗi nhóm
    finalGroupedSegments.forEach((group, index) => {
      if (index === 0) {
        console.log(
          `[Route] Start at ${group.FROMNODENO} with ${group.recommendedMode}`
        );
      } else {
        console.log(
          `[Route] Continue at ${group.FROMNODENO} with ${group.recommendedMode}`
        );
      }
    });
    console.log(
      `[suggestTransportForSegments] Finished. Total grouped segments: ${
        finalGroupedSegments.length
      }. Original: ${originalSegmentCount}. Modes: ${[
        ...new Set(finalGroupedSegments.map((s) => s.recommendedMode)),
      ].join(", ")}`
    );
    return finalGroupedSegments;
  }

  _findShortestPath(startNodeId, endNodeId, criteria, usedEdges) {
    const openSet = new PriorityQueue();
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
    const gScore = new Map();
    gScore.set(startNodeId, 0);
    const cameFrom = new Map();
    while (openSet.size() > 0) {
      const current = openSet.dequeue();
      const currentNodeId = current.node;
      if (current.gScore > (gScore.get(currentNodeId) || Infinity)) {
        continue;
      }
      if (currentNodeId === endNodeId) {
        return {
          path: current.path,
          segments: current.segments,
          metrics: current.metrics,
          geometry: current.geometry,
          segmentFeatures: current.segmentFeatures,
        };
      }
      const neighbors = this.graph[currentNodeId] || [];
      for (const { neighbor: neighborNodeId, routeData } of neighbors) {
        const edgeKey = `${currentNodeId}-${neighborNodeId}`;
        if (usedEdges.has(edgeKey)) continue;
        const trafficImpact =
          this.simulatedTrafficImpacts.get(edgeKey) ||
          this.simulatedTrafficImpacts.get(
            `${neighborNodeId}-${currentNodeId}`
          );
        if (trafficImpact && trafficImpact.isBlocked) {
          continue;
        }
        const { cost: segmentCost, metrics } = this._calculateSegmentCost(
          routeData,
          criteria
        );
        const tentativeGScore = current.gScore + segmentCost;
        if (tentativeGScore < (gScore.get(neighborNodeId) || Infinity)) {
          gScore.set(neighborNodeId, tentativeGScore);
          cameFrom.set(neighborNodeId, {
            prev: currentNodeId,
            routeData: routeData,
          });
          const newPath = [...current.path, neighborNodeId];
          const newSegments = [...current.segments, routeData];
          const newGeometryCoordinates = [
            ...current.geometry.coordinates,
            ...(routeData.geometry?.coordinates || []),
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
                geometry: routeData.geometry,
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

class PriorityQueue {
  constructor() {
    this.elements = [];
  }
  enqueue(element) {
    this.elements.push(element);
    this.elements.sort((a, b) => a.fScore - b.fScore);
  }
  dequeue() {
    return this.elements.shift();
  }
  size() {
    return this.elements.length;
  }
}

module.exports = { WayFinder, getBestRoute };
