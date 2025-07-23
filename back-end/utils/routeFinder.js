// class RouteFinder {
//   constructor(graph, coordinatesMap, mode) {
//     this.graph = graph;
//     this.coordinatesMap = coordinatesMap;
//     this.mode = mode;
//     this.maxRoutes = 1000;
//     this.maxDepth = 50;
//     this.visitedRoutes = new Set();
//   }

//   static criteriaProfiles = {
//     optimal: {
//       name: "Optimal",
//       weights: {
//         time: 0.3,
//         distance: 0.3,
//         pollution: 0.2,
//         emission: 0.1,
//         health: 0.1,
//       },
//     },
//     fastest: {
//       name: "Fastest",
//       weights: {
//         time: 0.7,
//         distance: 0.2,
//         pollution: 0.05,
//         emission: 0.05,
//         health: 0.0,
//       },
//     },
//     least_polluted: {
//       name: "Least Polluted",
//       weights: {
//         time: 0.1,
//         distance: 0.2,
//         pollution: 0.5,
//         emission: 0.2,
//         health: 0.0,
//       },
//     },
//     least_emission: {
//       name: "Least Emission",
//       weights: {
//         time: 0.1,
//         distance: 0.2,
//         pollution: 0.2,
//         emission: 0.5,
//         health: 0.0,
//       },
//     },
//     health: {
//       name: "Healthiest",
//       weights: {
//         time: 0.1,
//         distance: 0.2,
//         pollution: 0.1,
//         emission: 0.0,
//         health: 0.6,
//       },
//     },
//   };

//   findAllRoutes(startNodeNo, endNodeNo, criteria) {
//     const routes = [];
//     this.dfs(Number(startNodeNo), Number(endNodeNo), new Set(), [], routes, 0);
//     return this.processRoutes(routes, criteria);
//   }

//   dfs(currentNode, endNode, visitedNodes, currentPath, routes, depth) {
//     if (depth > this.maxDepth || routes.length >= this.maxRoutes) return;

//     visitedNodes.add(currentNode);
//     currentPath.push(currentNode);

//     if (currentNode === endNode) {
//       const routeKey = currentPath.join("-");
//       if (!this.visitedRoutes.has(routeKey)) {
//         this.visitedRoutes.add(routeKey);
//         routes.push([...currentPath]);
//       }
//     } else {
//       const neighbors = this.graph[currentNode] || [];
//       for (const neighborData of neighbors) {
//         if (!visitedNodes.has(neighborData.neighbor)) {
//           this.dfs(
//             neighborData.neighbor,
//             endNode,
//             visitedNodes,
//             currentPath,
//             routes,
//             depth + 1
//           );
//         }
//       }
//     }

//     visitedNodes.delete(currentNode);
//     currentPath.pop();
//   }

//   processRoutes(paths, criteria) {
//     const processed = paths.map((path, index) => {
//       const segments = this.getSegmentsFromPath(path);
//       const metrics = this.calculateRouteMetrics(segments);
//       const criteriaScores = this.calculateCriteriaScores(metrics);

//       return {
//         id: `route_${index + 1}`,
//         name: `Route ${index + 1}`,
//         path: path,
//         segments: segments,
//         metrics: metrics,
//         criteriaScores: criteriaScores,
//         geometry: this.createRouteGeometry(segments),
//         segmentFeatures: this.createSegmentFeatures(segments),
//       };
//     });
//     processed.forEach((route, index) => {
//       console.log(
//         `Route ${index + 1} Path: ${route.path.join(" -> ")} Scores:`,
//         route.criteriaScores
//       );
//     });
//     return this.sortRoutes(processed, criteria);
//   }

//   sortRoutes(routes, criteria) {
//     return [...routes].sort((a, b) => {
//       const scoreA = a.criteriaScores?.[criteria] || 0;
//       const scoreB = b.criteriaScores?.[criteria] || 0;
//       return scoreB - scoreA;
//     });
//   }

//   getSegmentsFromPath(path) {
//     const segments = [];
//     for (let i = 0; i < path.length - 1; i++) {
//       const fromNode = path[i];
//       const toNode = path[i + 1];
//       const edges = this.graph[fromNode] || [];
//       const segmentData = edges.find(
//         (edge) => edge.neighbor === toNode
//       )?.routeData;

//       if (segmentData) {
//         segments.push({
//           ...segmentData,
//           fromNode,
//           toNode,
//           segmentId: `${fromNode}-${toNode}`,
//         });
//       }
//     }
//     return segments;
//   }

//   calculateRouteMetrics(segments) {
//     const totals = segments.reduce(
//       (acc, segment) => {
//         const segmentMetrics = this.calculateSegmentMetrics(segment);
//         return {
//           time: acc.time + segmentMetrics.time,
//           distance: acc.distance + segmentMetrics.distance,
//           pollution: acc.pollution + segmentMetrics.pollution,
//           emission: acc.emission + segmentMetrics.emission,
//           health: acc.health + segmentMetrics.health,
//           segmentCount: acc.segmentCount + 1,
//         };
//       },
//       {
//         time: 0,
//         distance: 0,
//         pollution: 0,
//         emission: 0,
//         health: 0,
//         segmentCount: 0,
//       }
//     );

//     return {
//       time: totals.time / 60,
//       distance: totals.distance,
//       avgPollution: totals.pollution / totals.segmentCount,
//       avgEmission: totals.emission / totals.segmentCount,
//       health: totals.health,
//       segmentCount: totals.segmentCount,
//     };
//   }

//   calculateSegmentMetrics(segment) {
//     const distance = segment.LENGTH || 0.1;
//     const speed = this.getSpeedForMode(segment);
//     const time = distance / speed;

//     return {
//       time: time * 3600,
//       distance: distance,
//       pollution: this.getPollutionLevel(segment),
//       emission: this.getEmissionLevel(distance),
//       health: this.getHealthBenefit(distance),
//     };
//   }

//   getSpeedForMode(segment) {
//     const speeds = {
//       cycling: segment.VCUR_PRTSYS_BIKE || 15,
//       driving: segment.VCUR_PRTSYS_CAR || 40,
//       walking: 5,
//       motorcycle: segment.VCUR_PRTSYS_MC || 35,
//     };
//     return speeds[this.mode] || 30;
//   }

//   getPollutionLevel(segment) {
//     return segment.pollutionFactor || 0.3;
//   }

//   getEmissionLevel(distance) {
//     const factors = {
//       driving: 0.2,
//       motorcycle: 0.15,
//       cycling: 0.01,
//       walking: 0,
//     };
//     return distance * (factors[this.mode] || 0.1);
//   }

//   getHealthBenefit(distance) {
//     const factors = {
//       walking: 0.15,
//       cycling: 0.2,
//       driving: -0.05,
//       motorcycle: -0.05,
//     };
//     return distance * (factors[this.mode] || 0);
//   }

//   calculateCriteriaScores(metrics) {
//     const scores = {};
//     for (const [criteria, profile] of Object.entries(
//       RouteFinder.criteriaProfiles
//     )) {
//       scores[criteria] = Object.entries(profile.weights).reduce(
//         (sum, [key, weight]) => sum + metrics[key] * weight,
//         0
//       );
//     }
//     return scores;
//   }

//   createRouteGeometry(segments) {
//     return {
//       type: "MultiLineString",
//       coordinates: segments.map((segment) => {
//         if (segment.geometry?.coordinates) return segment.geometry.coordinates;
//         const fromCoord = this.coordinatesMap.get(Number(segment.FROMNODENO));
//         const toCoord = this.coordinatesMap.get(Number(segment.TONODENO));
//         return [
//           [fromCoord?.lon || 0, fromCoord?.lat || 0],
//           [toCoord?.lon || 0, toCoord?.lat || 0],
//         ];
//       }),
//     };
//   }

//   createSegmentFeatures(segments) {
//     return segments.map((segment) => ({
//       type: "Feature",
//       properties: {
//         id: segment.linkNo || `${segment.FROMNODENO}-${segment.TONODENO}`,
//         name: segment.NAME || "Unnamed Road",
//         length: segment.LENGTH || 0,
//         mode: this.mode,
//         fromNode: segment.fromNode,
//         toNode: segment.toNode,
//       },
//       geometry: segment.geometry || {
//         type: "LineString",
//         coordinates: [
//           [
//             segment.FROMNODENO.location.coordinates[0],
//             segment.FROMNODENO.location.coordinates[1],
//           ],
//           [
//             segment.TONODENO.location.coordinates[0],
//             segment.TONODENO.location.coordinates[1],
//           ],
//         ],
//       },
//     }));
//   }
// }

// module.exports = RouteFinder;
