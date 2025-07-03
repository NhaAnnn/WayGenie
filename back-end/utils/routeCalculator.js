/**
 * Lớp MinPriorityQueue được tối ưu hơn sử dụng heap (binary heap)
 * để thêm và bóc phần tử nhanh hơn (O(logN)) so với sắp xếp lại toàn bộ mảng (O(N logN)).
 * Các phần tử được lưu trữ dưới dạng { value: any, priority: number }.
 */
class MinPriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(value, priority) {
    this.values.push({ value, priority });
    this.bubbleUp();
  }

  dequeue() {
    const min = this.values[0];
    const end = this.values.pop();
    if (this.values.length > 0) {
      this.values[0] = end;
      this.sinkDown();
    }
    return min;
  }

  bubbleUp() {
    let idx = this.values.length - 1;
    const element = this.values[idx];
    while (idx > 0) {
      let parentIdx = Math.floor((idx - 1) / 2);
      let parent = this.values[parentIdx];
      if (element.priority >= parent.priority) break;
      this.values[parentIdx] = element;
      this.values[idx] = parent;
      idx = parentIdx;
    }
  }

  sinkDown() {
    let idx = 0;
    const length = this.values.length;
    const element = this.values[0];
    while (true) {
      let leftChildIdx = 2 * idx + 1;
      let rightChildIdx = 2 * idx + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIdx < length) {
        leftChild = this.values[leftChildIdx];
        if (leftChild.priority < element.priority) {
          swap = leftChildIdx;
        }
      }
      if (rightChildIdx < length) {
        rightChild = this.values[rightChildIdx];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < leftChild.priority)
        ) {
          swap = rightChildIdx;
        }
      }

      if (swap === null) break;
      this.values[idx] = this.values[swap];
      this.values[swap] = element;
      idx = swap;
    }
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

/**
 * Tính khoảng cách Haversine giữa hai điểm tọa độ.
 * @param {number[]} coord1 - [lon, lat] của điểm thứ nhất.
 * @param {number[]} coord2 - [lon, lat] của điểm thứ hai.
 * @returns {number} Khoảng cách tính bằng mét.
 */
function haversineDistance(coord1, coord2) {
  const R = 6371e3; // Bán kính trái đất (mét)
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Tính heuristic Haversine cho thuật toán A*.
 * @param {number} nodeId - ID của nút hiện tại.
 * @param {number} endNodeNo - ID của nút đích.
 * @param {Map} coordinatesMap - Bản đồ tọa độ các nút.
 * @returns {number} Khoảng cách ước lượng (km).
 */
function haversineHeuristic(nodeId, endNodeNo, coordinatesMap) {
  const node = coordinatesMap.get(nodeId);
  const endNode = coordinatesMap.get(endNodeNo);
  if (!node || !endNode) return 0;

  return (
    haversineDistance([node.lon, node.lat], [endNode.lon, endNode.lat]) / 1000
  );
}

/**
 * Lấy vận tốc theo chế độ di chuyển.
 * @param {Object} routeData - Dữ liệu tuyến đường.
 * @param {string} mode - Chế độ di chuyển (cycling, driving, walking, motorcycle).
 * @returns {number} Vận tốc (km/h).
 */
function getSpeedForMode(routeData, mode) {
  const defaultSpeeds = {
    cycling: 15,
    driving: 30,
    walking: 5,
    motorcycle: 25,
  };

  let speedKmH;
  if (mode === "cycling") {
    speedKmH = routeData.VCUR_PRTSYS_BIKE ?? defaultSpeeds.cycling;
  } else if (mode === "driving") {
    speedKmH = routeData.VCUR_PRTSYS_CAR ?? defaultSpeeds.driving;
  } else if (mode === "walking") {
    speedKmH = defaultSpeeds.walking;
  } else if (mode === "motorcycle") {
    speedKmH = routeData.VCUR_PRTSYS_MC ?? defaultSpeeds.motorcycle;
  }
  return speedKmH;
}

/**
 * Tính toán các chỉ số cho một đoạn đường.
 * @param {Object} routeData - Dữ liệu tuyến đường.
 * @param {string} mode - Chế độ di chuyển.
 * @returns {Object} Các chỉ số (time, distance, pollution, emission, health).
 */
function calculateSegmentMetrics(routeData, mode) {
  const distanceKm = routeData.LENGTH ? routeData.LENGTH / 1000 : 0;
  const speedKmH = getSpeedForMode(routeData, mode);
  const timeHours = distanceKm / speedKmH;
  const timeSeconds = timeHours * 3600;

  const pollution = routeData.pollutionFactor || 0.05;
  const emission = ["driving", "motorcycle"].includes(mode)
    ? distanceKm * (mode === "driving" ? 0.2 : 0.15)
    : 0;
  const health = ["walking", "cycling"].includes(mode)
    ? distanceKm * (mode === "walking" ? 0.1 : 0.15)
    : 0;

  return {
    time: timeSeconds,
    distance: distanceKm,
    pollution,
    emission,
    health,
  };
}

/**
 * Tính trọng số cạnh dựa trên tiêu chí.
 * @param {Object} routeData - Dữ liệu tuyến đường hoặc properties của GeoJSON Feature.
 * @param {Object} weights - Trọng số các tiêu chí.
 * @param {string} mode - Chế độ di chuyển.
 * @returns {number} Trọng số cạnh.
 */
function calculateEdgeWeight(routeData, weights, mode) {
  const metrics = routeData.metrics || calculateSegmentMetrics(routeData, mode);

  const {
    timeWeight = 0,
    distanceWeight = 0,
    pollutionWeight = 0,
    emissionWeight = 0,
    healthWeight = 0,
  } = weights;

  return (
    timeWeight * metrics.time +
    distanceWeight * metrics.distance +
    pollutionWeight * metrics.pollution +
    emissionWeight * metrics.emission -
    healthWeight * metrics.health
  );
}

/**
 * Đánh giá toàn bộ tuyến đường theo các tiêu chí.
 * @param {Object} route - Tuyến đường với segments.
 * @param {string} mode - Chế độ di chuyển.
 * @returns {Object} Tổng các chỉ số.
 */
function evaluateRouteMetrics(route, mode) {
  return route.segments.reduce(
    (acc, segment) => {
      const metrics = segment.properties.metrics;
      return {
        time: acc.time + metrics.time,
        distance: acc.distance + metrics.distance,
        pollution: acc.pollution + metrics.pollution,
        emission: acc.emission + metrics.emission,
        health: acc.health + metrics.health,
      };
    },
    { time: 0, distance: 0, pollution: 0, emission: 0, health: 0 }
  );
}

/**
 * Sao chép đồ thị để sử dụng trong Yen's Algorithm.
 * @param {Object} graph - Đồ thị gốc.
 * @returns {Object} Bản sao đồ thị.
 */
function cloneGraph(graph) {
  const newGraph = {};
  for (const node in graph) {
    newGraph[node] = graph[node].map((edge) => ({ ...edge }));
  }
  return newGraph;
}

/**
 * Tìm đường đi ngắn nhất sử dụng A*.
 * @param {number} startNodeNo - ID nút bắt đầu.
 * @param {number} endNodeNo - ID nút kết thúc.
 * @param {Object} graph - Đồ thị.
 * @param {Map} coordinatesMap - Bản đồ tọa độ.
 * @param {Object} primaryWeights - Trọng số tiêu chí chính.
 * @param {string} mode - Chế độ di chuyển.
 * @returns {Object|null} Đường đi ngắn nhất hoặc null nếu không tìm thấy.
 */
function findShortestPathAStar(
  startNodeNo,
  endNodeNo,
  graph,
  coordinatesMap,
  primaryWeights,
  mode
) {
  const openSet = new MinPriorityQueue();
  openSet.enqueue({ node: startNodeNo, gScore: 0, fScore: 0 }, 0);

  const cameFrom = {};
  const gScore = { [startNodeNo]: 0 };
  const fScore = {
    [startNodeNo]: haversineHeuristic(startNodeNo, endNodeNo, coordinatesMap),
  };

  while (!openSet.isEmpty()) {
    const { node: current } = openSet.dequeue().value; // Updated: .element to .value

    if (current === endNodeNo) {
      return reconstructPathAStar(
        endNodeNo,
        cameFrom,
        mode,
        coordinatesMap,
        gScore[endNodeNo]
      ); // Pass gScore[endNodeNo]
    }

    const neighbors = graph[current] || [];
    for (const { neighbor, routeData } of neighbors) {
      const tentativeGScore =
        gScore[current] + calculateEdgeWeight(routeData, primaryWeights, mode);

      if (!gScore[neighbor] || tentativeGScore < gScore[neighbor]) {
        cameFrom[neighbor] = { node: current, route: routeData };
        gScore[neighbor] = tentativeGScore;
        fScore[neighbor] =
          tentativeGScore +
          haversineHeuristic(neighbor, endNodeNo, coordinatesMap);
        openSet.enqueue(
          { node: neighbor, gScore: tentativeGScore, fScore: fScore[neighbor] },
          fScore[neighbor]
        );
      }
    }
  }

  return null;
}

/**
 * Tái tạo đường đi từ kết quả A*.
 * @param {number} endNodeNo - ID nút đích.
 * @param {Object} previous - Bản đồ tiền thân.
 * @param {string} mode - Chế độ di chuyển.
 * @param {Map} coordinatesMap - Bản đồ tọa độ.
 * @param {number} finalGScore - G-score cuối cùng của nút đích.
 * @returns {Object|null} Đường đi được tái tạo hoặc null nếu không hợp lệ.
 */
function reconstructPathAStar(
  endNodeNo,
  previous,
  mode,
  coordinatesMap,
  finalGScore
) {
  const path = [];
  const segments = [];
  let currentNode = endNodeNo;

  if (!previous[endNodeNo] && endNodeNo !== undefined) {
    return null; // Không thể xây dựng đường đi nếu đích không có trong previous
  }

  // Handle the case where startNode === endNode
  if (endNodeNo === previous[endNodeNo]?.node) {
    path.unshift(endNodeNo);
  } else {
    while (
      currentNode !== null &&
      previous[currentNode] !== undefined &&
      previous[currentNode].node !== currentNode
    ) {
      path.unshift(currentNode);
      const pred = previous[currentNode];

      if (pred.route) {
        const metrics = calculateSegmentMetrics(pred.route, mode);
        const segment = {
          type: "Feature",
          properties: {
            id: pred.route.linkNo || `segment-${currentNode}-${pred.node}`,
            FROMNODENO: pred.route.FROMNODENO,
            TONODENO: pred.route.TONODENO,
            NAME: pred.route.NAME || "",
            metrics,
          },
          geometry: {
            type: "LineString",
            coordinates: pred.route.geometry?.coordinates
              ? [...pred.route.geometry.coordinates]
              : [
                  [
                    coordinatesMap.get(pred.node)?.lon,
                    coordinatesMap.get(pred.node)?.lat,
                  ],
                  [
                    coordinatesMap.get(currentNode)?.lon,
                    coordinatesMap.get(currentNode)?.lat,
                  ],
                ],
          },
        };
        segments.unshift(segment);
      }
      currentNode = pred.node;
    }
    // Add the start node to the path
    if (currentNode !== null && !path.includes(currentNode)) {
      path.unshift(currentNode);
    }
  }

  const totals = segments.reduce(
    (acc, segment) => ({
      distance: acc.distance + segment.properties.metrics.distance,
      duration: acc.duration + segment.properties.metrics.time,
      cost: acc.cost + calculateEdgeWeight(segment.properties, {}, mode), // Pass empty weights for segment cost if not needed, or ensure correct weights are passed
    }),
    { distance: 0, duration: 0, cost: 0 }
  );

  return {
    path,
    segments,
    totalCost: finalGScore, // Use the actual final G-score
    totalDistance: totals.distance,
    totalDuration: totals.duration,
    geometry: {
      type: "FeatureCollection",
      features: segments.map((s) => ({
        type: "Feature",
        properties: s.properties,
        geometry: s.geometry,
      })),
    },
  };
}

/**
 * Tìm K đường đi ngắn nhất sử dụng Yen's Algorithm.
 * @param {number} startNodeNo - ID nút bắt đầu.
 * @param {number} endNodeNo - ID nút kết thúc.
 * @param {Object[]} allCoordinates - Danh sách tọa độ.
 * @param {Object[]} allRoutes - Danh sách tuyến đường.
 * @param {string} mode - Chế độ di chuyển.
 * @param {Object} primaryCriteriaWeights - Trọng số tiêu chí chính.
 * @param {number} K - Số lượng tuyến đường tối đa.
 * @returns {Object[]} Danh sách K tuyến đường.
 */
function findKShortestPaths(
  startNodeNo,
  endNodeNo,
  allCoordinates,
  allRoutes,
  mode,
  primaryCriteriaWeights,
  K = 4
) {
  startNodeNo = Number(startNodeNo);
  endNodeNo = Number(endNodeNo);

  const coordinatesMap = new Map(
    allCoordinates.map((c) => [
      Number(c.node_id),
      { lon: c.location.coordinates[0], lat: c.location.coordinates[1] },
    ])
  );

  const initialGraph = {};
  allCoordinates.forEach((coord) => {
    initialGraph[Number(coord.node_id)] = [];
  });

  allRoutes.forEach((route) => {
    const fromNode = Number(route.FROMNODENO);
    const toNode = Number(route.TONODENO);

    if (
      !initialGraph.hasOwnProperty(fromNode) ||
      !initialGraph.hasOwnProperty(toNode)
    ) {
      return;
    }

    const allowedModes = route.TSYSSET
      ? route.TSYSSET.split(",").map((m) => m.trim().toLowerCase())
      : [];
    let modeAllowed = false;
    if (mode === "cycling" && allowedModes.includes("bike")) {
      modeAllowed = true;
    } else if (mode === "driving" && allowedModes.includes("car")) {
      modeAllowed = true;
    } else if (mode === "walking" && allowedModes.includes("w")) {
      modeAllowed = true;
    } else if (mode === "motorcycle" && allowedModes.includes("mc")) {
      modeAllowed = true;
    } else if (!route.TSYSSET || route.TSYSSET.trim() === "") {
      modeAllowed = true;
    }

    if (modeAllowed) {
      initialGraph[fromNode].push({ neighbor: toNode, routeData: route });
      const reverseRouteData = { ...route };
      reverseRouteData.FROMNODENO = toNode;
      reverseRouteData.TONODENO = fromNode;
      if (reverseRouteData.geometry && reverseRouteData.geometry.coordinates) {
        reverseRouteData.geometry.coordinates = [
          ...reverseRouteData.geometry.coordinates,
        ].reverse();
      }
      initialGraph[toNode].push({
        neighbor: fromNode,
        routeData: reverseRouteData,
      });
    }
  });

  if (startNodeNo === endNodeNo) {
    const coord = coordinatesMap.get(startNodeNo);
    return [
      {
        path: [startNodeNo],
        segments: [],
        totalCost: 0,
        totalDuration: 0,
        totalDistance: 0,
        geometry: {
          type: "FeatureCollection",
          features: [],
        },
      },
    ];
  }

  const A = [];
  const B = new MinPriorityQueue();

  const P1 = findShortestPathAStar(
    startNodeNo,
    endNodeNo,
    initialGraph,
    coordinatesMap,
    primaryCriteriaWeights,
    mode
  );

  if (P1) {
    A.push(P1);
  } else {
    return [];
  }

  for (let k = 1; k < K; k++) {
    const Pk = A[k - 1];
    if (!Pk || Pk.path.length <= 1) {
      break;
    }

    for (let i = 0; i < Pk.path.length - 1; i++) {
      const spurNode = Pk.path[i];
      const rootPath = Pk.path.slice(0, i + 1);
      const tempGraph = cloneGraph(initialGraph);
      const removedEdges = [];

      for (const pathFound of A) {
        if (
          pathFound.path.length > i &&
          pathFound.path
            .slice(0, i + 1)
            .every((node, idx) => Number(node) === Number(rootPath[idx]))
        ) {
          const nextNodeInPathFound = Number(pathFound.path[i + 1]);
          const edgesFromSpur = tempGraph[spurNode];
          if (edgesFromSpur) {
            const edgeIndex = edgesFromSpur.findIndex(
              (edge) => Number(edge.neighbor) === nextNodeInPathFound
            );
            if (edgeIndex !== -1) {
              removedEdges.push({
                node: spurNode,
                edge: edgesFromSpur[edgeIndex],
                index: edgeIndex,
              });
              edgesFromSpur.splice(edgeIndex, 1);
            }
          }
        }
      }

      const temporarilyRemovedNodes = [];
      for (let j = 0; j < i; j++) {
        const nodeToRemove = Number(rootPath[j]);
        if (tempGraph.hasOwnProperty(nodeToRemove)) {
          temporarilyRemovedNodes.push({
            node: nodeToRemove,
            originalEdges: tempGraph[nodeToRemove],
          });
          tempGraph[nodeToRemove] = [];
          for (const otherNodeStr in tempGraph) {
            const otherNode = Number(otherNodeStr);
            tempGraph[otherNode] = tempGraph[otherNode].filter(
              (edge) => Number(edge.neighbor) !== nodeToRemove
            );
          }
        }
      }

      const spurPathResult = findShortestPathAStar(
        spurNode,
        endNodeNo,
        tempGraph,
        coordinatesMap,
        primaryCriteriaWeights,
        mode
      );

      for (const { node, originalEdges } of temporarilyRemovedNodes) {
        tempGraph[node] = originalEdges;
        for (const otherNodeStr in initialGraph) {
          const otherNode = Number(otherNodeStr);
          if (initialGraph[otherNode]) {
            initialGraph[otherNode].forEach((originalEdge) => {
              if (
                Number(originalEdge.neighbor) === node &&
                !tempGraph[otherNode].some(
                  (e) =>
                    e.neighbor === originalEdge.neighbor &&
                    e.routeData === originalEdge.routeData
                )
              ) {
                tempGraph[otherNode].push(originalEdge);
              }
            });
          }
        }
      }
      for (const { node, edge, index } of removedEdges) {
        if (tempGraph[node]) {
          tempGraph[node].splice(index, 0, edge);
        }
      }

      if (spurPathResult) {
        const spurPath = spurPathResult.path;
        const spurSegments = spurPathResult.segments;

        const totalPath = [...rootPath];
        const totalSegments = [];
        let currentTotalCost = 0;
        let currentTotalDuration = 0;
        let currentTotalDistance = 0;

        for (let j = 0; j < rootPath.length - 1; j++) {
          const from = Number(rootPath[j]);
          const to = Number(rootPath[j + 1]);
          const segmentData = initialGraph[from]?.find(
            (edge) => Number(edge.neighbor) === to
          )?.routeData;

          if (segmentData) {
            const metrics = calculateSegmentMetrics(segmentData, mode);
            currentTotalDistance += metrics.distance;
            currentTotalDuration += metrics.time;
            currentTotalCost += calculateEdgeWeight(
              segmentData,
              primaryCriteriaWeights,
              mode
            );
            totalSegments.push({
              type: "Feature",
              properties: {
                id: segmentData.linkNo || `segment-${from}-${to}`,
                FROMNODENO: segmentData.FROMNODENO,
                TONODENO: segmentData.TONODENO,
                NAME: segmentData.NAME || "",
                metrics,
              },
              geometry: {
                type: "LineString",
                coordinates: segmentData.geometry?.coordinates
                  ? [...segmentData.geometry.coordinates]
                  : [
                      [
                        coordinatesMap.get(from)?.lon,
                        coordinatesMap.get(from)?.lat,
                      ],
                      [
                        coordinatesMap.get(to)?.lon,
                        coordinatesMap.get(to)?.lat,
                      ],
                    ],
              },
            });
          } else {
            const segmentFromPk = Pk.segments.find(
              (s) =>
                (Number(s.properties.FROMNODENO) === from &&
                  Number(s.properties.TONODENO) === to) ||
                (Number(s.properties.FROMNODENO) === to &&
                  Number(s.properties.TONODENO) === from)
            );
            if (segmentFromPk) {
              currentTotalDistance += segmentFromPk.properties.metrics.distance;
              currentTotalDuration += segmentFromPk.properties.metrics.time;
              currentTotalCost += calculateEdgeWeight(
                segmentFromPk.properties,
                primaryCriteriaWeights,
                mode
              );
              totalSegments.push({
                ...segmentFromPk,
                geometry: {
                  type: "LineString",
                  coordinates: [...segmentFromPk.geometry.coordinates],
                },
              });
            }
          }
        }

        if (spurPath.length > 1) {
          totalPath.push(...spurPath.slice(1));
          for (const segment of spurSegments) {
            currentTotalDistance += segment.properties.metrics.distance;
            currentTotalDuration += segment.properties.metrics.time;
            currentTotalCost += calculateEdgeWeight(
              segment.properties,
              primaryCriteriaWeights,
              mode
            );
            totalSegments.push({
              ...segment,
              geometry: {
                type: "LineString",
                coordinates: [...segment.geometry.coordinates],
              },
            });
          }
        }

        const newPathCandidate = {
          path: totalPath,
          segments: totalSegments,
          totalCost: currentTotalCost,
          totalDuration: currentTotalDuration,
          totalDistance: currentTotalDistance,
          geometry: {
            type: "FeatureCollection",
            features: totalSegments.map((s) => ({
              type: "Feature",
              properties: s.properties,
              geometry: s.geometry,
            })),
          },
        };

        const pathExistsInA = A.some(
          (p) => p.path.join(",") === newPathCandidate.path.join(",")
        );
        const pathExistsInB = B.values.some(
          (item) =>
            item.value.path.join(",") === newPathCandidate.path.join(",")
        );

        if (
          !pathExistsInA &&
          !pathExistsInB &&
          newPathCandidate.path.length > 1
        ) {
          B.enqueue(newPathCandidate, newPathCandidate.totalCost);
        }
      }
    }

    if (!B.isEmpty()) {
      const nextPath = B.dequeue().value;
      A.push(nextPath);
    } else {
      break;
    }
  }

  return A;
}

/**
 * Tính toán nhiều tuyến đường dựa trên đa tiêu chí.
 * @param {number} startNodeNo - ID nút bắt đầu.
 * @param {number} endNodeNo - ID nút kết thúc.
 * @param {Object[]} allCoordinates - Danh sách tọa độ.
 * @param {Object[]} allRoutes - Danh sách tuyến đường.
 * @param {string} mode - Chế độ di chuyển.
 * @param {number} maxRoutes - Số lượng tuyến đường tối đa.
 * @param {string} preferredSortingCriterion - Tiêu chí ưu tiên.
 * @returns {Object} Tuyến đường được chọn và tất cả tuyến đường.
 */
function calculateMultipleRouteOptions(
  startNodeNo,
  endNodeNo,
  allCoordinates,
  allRoutes,
  mode,
  maxRoutes = 4,
  preferredSortingCriterion = "optimal"
) {
  if (!startNodeNo || !endNodeNo) {
    return { selectedRoute: null, allRoutesWithMetrics: [] };
  }

  startNodeNo = Number(startNodeNo);
  endNodeNo = Number(endNodeNo);

  const coordinatesMap = new Map();
  allCoordinates.forEach((coord) => {
    if (
      coord &&
      coord.node_id != null &&
      coord.location &&
      coord.location.coordinates
    ) {
      coordinatesMap.set(Number(coord.node_id), {
        lon: coord.location.coordinates[0],
        lat: coord.location.coordinates[1],
      });
    }
  });

  if (!coordinatesMap.has(startNodeNo) || !coordinatesMap.has(endNodeNo)) {
    return { selectedRoute: null, allRoutesWithMetrics: [] };
  }

  const graph = {};
  coordinatesMap.forEach((_, nodeId) => {
    graph[nodeId] = [];
  });

  allRoutes.forEach((route) => {
    if (!route) return;

    const fromNode = Number(route.FROMNODENO);
    const toNode = Number(route.TONODENO);

    if (
      isNaN(fromNode) ||
      isNaN(toNode) ||
      !graph[fromNode] ||
      !graph[toNode]
    ) {
      return;
    }

    const allowedModes = route.TSYSSET
      ? route.TSYSSET.split(",").map((m) => m.trim().toLowerCase())
      : [];

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
    }

    if (modeAllowed) {
      graph[fromNode].push({
        neighbor: toNode,
        routeData: route,
      });

      const reverseRoute = { ...route };
      reverseRoute.FROMNODENO = toNode;
      reverseRoute.TONODENO = fromNode;
      if (reverseRoute.geometry?.coordinates) {
        reverseRoute.geometry.coordinates = [
          ...reverseRoute.geometry.coordinates,
        ].reverse();
      }
      graph[toNode].push({
        neighbor: fromNode,
        routeData: reverseRoute,
      });
    }
  });

  if (!Object.values(graph).some((edges) => edges.length > 0)) {
    return { selectedRoute: null, allRoutesWithMetrics: [] };
  }

  if (startNodeNo === endNodeNo) {
    const coord = coordinatesMap.get(startNodeNo);
    const singleRoute = {
      path: [startNodeNo],
      segments: [],
      totalCost: 0,
      totalDuration: 0,
      totalDistance: 0,
      geometry: {
        type: "FeatureCollection",
        features: [],
      },
    };
    return {
      selectedRoute: singleRoute,
      allRoutesWithMetrics: [singleRoute],
    };
  }

  const criteriaProfiles = {
    optimal: {
      name: "Tuyến đường Tối ưu",
      timeWeight: 0.25,
      distanceWeight: 0.25,
      trafficWeight: 0.2,
      pollutionWeight: 0.15,
      emissionWeight: 0.1,
      healthWeight: 0.05,
    },
    fastest: {
      name: "Tuyến đường Nhanh nhất",
      timeWeight: 0.85,
      distanceWeight: 0.1,
      trafficWeight: 0.03,
      pollutionWeight: 0.01,
      emissionWeight: 0.01,
      healthWeight: 0.0,
    },
    least_polluted: {
      name: "Tuyến đường Ít ô nhiễm",
      timeWeight: 0.1,
      distanceWeight: 0.1,
      trafficWeight: 0.1,
      pollutionWeight: 0.65,
      emissionWeight: 0.05,
      healthWeight: 0.0,
    },
    least_emission: {
      name: "Tuyến đường Ít phát thải",
      timeWeight: 0.1,
      distanceWeight: 0.1,
      trafficWeight: 0.1,
      pollutionWeight: 0.05,
      emissionWeight: 0.65,
      healthWeight: 0.0,
    },
    least_traffic: {
      name: "Tuyến đường Ít tắc đường",
      timeWeight: 0.1,
      distanceWeight: 0.1,
      trafficWeight: 0.65,
      pollutionWeight: 0.1,
      emissionWeight: 0.05,
      healthWeight: 0.0,
    },
    health: {
      name: "Tuyến đường Sức khỏe",
      timeWeight: 0.1,
      distanceWeight: 0.1,
      trafficWeight: 0.1,
      pollutionWeight: 0.2,
      emissionWeight: 0.0,
      healthWeight: 0.5,
    },
  };

  let primaryWeights =
    criteriaProfiles[preferredSortingCriterion] || criteriaProfiles.optimal;
  if (
    preferredSortingCriterion === "health" &&
    !["walking", "cycling"].includes(mode)
  ) {
    primaryWeights = criteriaProfiles.optimal;
  }

  const foundRoutes = findKShortestPaths(
    startNodeNo,
    endNodeNo,
    allCoordinates,
    allRoutes,
    mode,
    primaryWeights,
    maxRoutes
  );

  const routesWithMetrics = [];
  let selectedRoute = null;

  if (foundRoutes.length === 0) {
    return { selectedRoute: null, allRoutesWithMetrics: [] };
  }

  foundRoutes.forEach((route, index) => {
    const metrics = evaluateRouteMetrics(route, mode);
    const evaluatedRoute = {
      id: `route_${index + 1}`,
      path: route.path,
      segments: route.segments,
      totalCost: route.totalCost,
      totalDuration: route.totalDuration,
      totalDistance: route.totalDistance,
      geometry: route.geometry,
      metrics,
      criteriaCosts: {},
      suggestedVehicleType: null,
      name:
        criteriaProfiles[preferredSortingCriterion]?.name ||
        `Tuyến đường ${index + 1}`,
    };

    for (const criterionId in criteriaProfiles) {
      const profile = criteriaProfiles[criterionId];
      if (criterionId === "health" && !["walking", "cycling"].includes(mode)) {
        evaluatedRoute.criteriaCosts[criterionId] = Infinity;
        continue;
      }

      let reCalcCost = 0;
      for (const segment of route.segments) {
        reCalcCost += calculateEdgeWeight(segment.properties, profile, mode);
      }
      evaluatedRoute.criteriaCosts[criterionId] = reCalcCost;
    }

    const minCostCriteria = Object.keys(evaluatedRoute.criteriaCosts).reduce(
      (a, b) =>
        evaluatedRoute.criteriaCosts[a] < evaluatedRoute.criteriaCosts[b]
          ? a
          : b
    );

    if (minCostCriteria === "least_emission") {
      evaluatedRoute.suggestedVehicleType =
        "Đi bộ hoặc Xe đạp (để giảm phát thải)";
    } else if (
      minCostCriteria === "health" &&
      ["walking", "cycling"].includes(mode)
    ) {
      evaluatedRoute.suggestedVehicleType =
        "Đi bộ hoặc Xe đạp (để tăng cường sức khỏe)";
    }

    routesWithMetrics.push(evaluatedRoute);
  });

  routesWithMetrics.sort((a, b) => a.totalCost - b.totalCost);
  selectedRoute = routesWithMetrics[0] || null;

  return { selectedRoute, allRoutesWithMetrics: routesWithMetrics };
}

// Dữ liệu mẫu (thay thế bằng dữ liệu thực tế của bạn)
const sampleCoordinates = [
  { node_id: 1, location: { coordinates: [105.7766, 10.0306] } }, // Example coordinates for Node 1 (lon, lat)
  { node_id: 2, location: { coordinates: [105.777, 10.031] } }, // Example coordinates for Node 2
  { node_id: 3, location: { coordinates: [105.778, 10.03] } }, // Example coordinates for Node 3
  { node_id: 4, location: { coordinates: [105.779, 10.0315] } }, // Example coordinates for Node 4
];

const sampleRoutes = [
  {
    linkNo: "link1",
    FROMNODENO: 1,
    TONODENO: 2,
    LENGTH: 100, // meters
    TSYSSET: "car,bike", // Allowed modes
    VCUR_PRTSYS_CAR: 40, // Car speed km/h
    VCUR_PRTSYS_BIKE: 20, // Bike speed km/h
    NAME: "Road A-B",
    geometry: {
      type: "LineString",
      coordinates: [
        [105.7766, 10.0306],
        [105.777, 10.031],
      ],
    },
  },
  {
    linkNo: "link2",
    FROMNODENO: 2,
    TONODENO: 3,
    LENGTH: 150,
    TSYSSET: "car",
    VCUR_PRTSYS_CAR: 35,
    NAME: "Road B-C",
    geometry: {
      type: "LineString",
      coordinates: [
        [105.777, 10.031],
        [105.778, 10.03],
      ],
    },
  },
  {
    linkNo: "link3",
    FROMNODENO: 1,
    TONODENO: 3,
    LENGTH: 200,
    TSYSSET: "walking",
    NAME: "Footpath A-C",
    geometry: {
      type: "LineString",
      coordinates: [
        [105.7766, 10.0306],
        [105.778, 10.03],
      ],
    },
  },
  {
    linkNo: "link4",
    FROMNODENO: 3,
    TONODENO: 4,
    LENGTH: 120,
    TSYSSET: "car,mc",
    VCUR_PRTSYS_CAR: 50,
    VCUR_PRTSYS_MC: 45,
    NAME: "Road C-D",
    geometry: {
      type: "LineString",
      coordinates: [
        [105.778, 10.03],
        [105.779, 10.0315],
      ],
    },
  },
];

// Định nghĩa các tham số đầu vào cho hàm
const startNodeId = 1;
const endNodeId = 4;
const travelMode = "driving"; // hoặc "walking", "cycling", "motorcycle"
const maxNumRoutes = 4;
const sortCriterion = "optimal"; // hoặc "fastest", "least_polluted", "least_emission", "health", "least_traffic"

// Gọi hàm và log kết quả
const routeResults = calculateMultipleRouteOptions(
  startNodeId,
  endNodeId,
  sampleCoordinates,
  sampleRoutes,
  travelMode,
  maxNumRoutes,
  sortCriterion
);

console.log(JSON.stringify(routeResults, null, 2));

module.exports = {
  haversineDistance,
  calculateMultipleRouteOptions,
};
