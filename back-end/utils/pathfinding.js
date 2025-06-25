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
 * Tính khoảng cách Haversine giữa hai nút để sử dụng làm heuristic trong A*.
 * @param {string} nodeId - ID của nút hiện tại.
 * @param {string} endNodeNo - ID của nút đích.
 * @param {Map} coordinatesMap - Map từ node_id đến tọa độ [lon, lat].
 * @returns {number} Khoảng cách Haversine (km).
 */
function haversineHeuristic(nodeId, endNodeNo, coordinatesMap) {
  const node = coordinatesMap.get(nodeId);
  const endNode = coordinatesMap.get(endNodeNo);
  if (!node || !endNode) return 0;

  const R = 6371; // Bán kính Trái Đất (km)
  const lat1 = (node.lat * Math.PI) / 180;
  const lat2 = (endNode.lat * Math.PI) / 180;
  const deltaLat = ((endNode.lat - node.lat) * Math.PI) / 180;
  const deltaLon = ((endNode.lon - node.lon) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Đã sửa: Giữ đơn vị km
}

/**
 * Tính toán trọng số của một cạnh (đoạn đường) dựa trên các tiêu chí và trọng số.
 * @param {Object} route - Đối tượng tuyến đường từ MongoDB.
 * @param {Object} criteriaWeights - Trọng số cho từng tiêu chí.
 * @param {string} mode - Chế độ di chuyển.
 * @returns {number} Tổng trọng số.
 */
function calculateEdgeWeight(route, criteriaWeights, mode) {
  const lengthKm = Math.max(route.length || 0.01, 0.01); // Đảm bảo không chia cho 0
  let speedKmH = route.v0Prt || 30;

  // Chọn vận tốc theo mode, mặc định nếu không có dữ liệu
  const modeSpeeds = {
    cycling: route.vCurPrtSysBike || 15,
    driving: route.vCurPrtSysCar || 30,
    walking: route.vCurPrtSysCo || 5,
    motorcycle: route.vCurPrtSysMc || 25,
  };
  speedKmH = modeSpeeds[mode] ?? speedKmH;
  speedKmH = Math.max(speedKmH, 5); // Đảm bảo vận tốc tối thiểu

  const durationHours = lengthKm / speedKmH;

  // Tính toán trafficImpactFactor
  let dynamicTrafficImpact = 0.1;
  if (route.volCapRatioPrtAP != null && route.volCapRatioPrtAP > 0) {
    dynamicTrafficImpact = route.volCapRatioPrtAP;
  } else if (route.volVehPrtAP != null && route.CAPPRT > 0) {
    dynamicTrafficImpact = route.volVehPrtAP / route.CAPPRT;
  }
  dynamicTrafficImpact = Math.min(Math.max(dynamicTrafficImpact, 0.01), 3.0);

  // Chuẩn hóa pollutionImpact (AQI/PM2.5)
  const MAX_AQI = 500;
  const pollutionImpact =
    Math.min(route.pollutionFactor || 0.05, MAX_AQI) / MAX_AQI;

  // Emission factor dựa trên phương tiện
  const emissionFactors = {
    walking: 0.0,
    cycling: 0.0,
    motorcycle: 0.3,
    driving: 0.5,
  };
  const emissionImpact = emissionFactors[mode] || 0.5;

  const timeCost = durationHours * (criteriaWeights.timeWeight || 0);
  const distanceCost = lengthKm * (criteriaWeights.distanceWeight || 0);
  const trafficCost =
    dynamicTrafficImpact * (criteriaWeights.trafficWeight || 0);
  const pollutionCost =
    pollutionImpact * (criteriaWeights.pollutionWeight || 0);
  const emissionCost = emissionImpact * (criteriaWeights.emissionWeight || 0);

  return Math.max(
    timeCost + distanceCost + trafficCost + pollutionCost + emissionCost,
    0.001
  );
}

/**
 * Thuật toán A* tìm nhiều đường đi đa tiêu chí, bao gồm các tuyến đường trung gian.
 * @returns {Array} Danh sách các đường đi từ startNodeNo đến endNodeNo.
 */
function findMultiCriteriaRoute(
  startNodeNo,
  endNodeNo,
  allCoordinates,
  allRoutes,
  criteriaWeights,
  mode,
  maxPathsPerNode = 5,
  costThreshold = 1.5
) {
  console.log(
    `findMultiCriteriaRoute: Starting with startNodeNo=${startNodeNo}, endNodeNo=${endNodeNo}, mode=${mode}`
  );

  const graph = {};
  const coordinatesMap = new Map(
    allCoordinates.map((c) => [
      c.node_id,
      { lon: c.location.coordinates[0], lat: c.location.coordinates[1] },
    ])
  );

  // Xây dựng đồ thị vô hướng
  allCoordinates.forEach((coord) => {
    graph[coord.node_id] = [];
  });

  allRoutes.forEach((route) => {
    const fromNode = route.FROMNODENO;
    const toNode = route.TONODENO;

    if (graph.hasOwnProperty(fromNode) && graph.hasOwnProperty(toNode)) {
      const allowedModes = route.TSYSSET
        ? route.TSYSSET.split(",").map((m) => m.trim().toLowerCase())
        : [];
      let modeAllowed = !route.TSYSSET || route.TSYSSET.trim() === "";
      if (mode === "cycling" && allowedModes.includes("bike"))
        modeAllowed = true;
      else if (mode === "driving" && allowedModes.includes("car"))
        modeAllowed = true;
      else if (
        mode === "walking" &&
        (allowedModes.includes("w") || allowedModes.includes("co"))
      )
        modeAllowed = true;
      else if (mode === "motorcycle" && allowedModes.includes("mc"))
        modeAllowed = true;

      if (modeAllowed) {
        // Thêm cạnh xuôi
        graph[fromNode].push({ neighbor: toNode, routeData: route });
        console.log(
          `Graph edge added (forward): ${fromNode} -> ${toNode}, modeAllowed=${modeAllowed}, TSYSSET=${route.TSYSSET}`
        );
        // Thêm cạnh ngược để tạo đồ thị vô hướng
        graph[toNode].push({ neighbor: fromNode, routeData: route });
        console.log(
          `Graph edge added (reverse): ${toNode} -> ${fromNode}, modeAllowed=${modeAllowed}, TSYSSET=${route.TSYSSET}`
        );
      }
    }
  });

  // Kiểm tra nếu startNodeNo hoặc endNodeNo không tồn tại trong graph
  if (!graph[startNodeNo] || !graph[endNodeNo]) {
    console.log(
      `findMultiCriteriaRoute: Node ${startNodeNo} or ${endNodeNo} not found in graph`
    );
    return [];
  }

  // Xử lý trường hợp startNodeNo bằng endNodeNo
  if (startNodeNo === endNodeNo) {
    console.log(
      `findMultiCriteriaRoute: startNodeNo equals endNodeNo (${startNodeNo}), returning zero-distance route`
    );
    return [
      {
        path: [startNodeNo],
        routeDetails: [],
        totalCost: 0,
        totalDuration: 0,
        totalDistance: 0,
      },
    ];
  }

  // Thuật toán A* sửa đổi
  const gScores = {}; // { node: [gScore1, gScore2, ...] }
  const fScores = {}; // { node: [fScore1, fScore2, ...] }
  const previous = {}; // { node: [{ node, route, gScore, pathIndex }, ...] }
  const pq = new MinPriorityQueue();

  for (const node of Object.keys(graph)) {
    gScores[node] = [];
    fScores[node] = [];
    previous[node] = [];
  }

  gScores[startNodeNo] = [0];
  fScores[startNodeNo] = [
    haversineHeuristic(startNodeNo, endNodeNo, coordinatesMap),
  ];
  previous[startNodeNo] = [null];
  pq.enqueue({ node: startNodeNo, pathIndex: 0 }, fScores[startNodeNo][0]);

  while (!pq.isEmpty()) {
    const {
      value: { node: currentNode, pathIndex },
      priority: currentFScore,
    } = pq.dequeue();

    if (
      pathIndex >= fScores[currentNode].length ||
      currentFScore > fScores[currentNode][pathIndex]
    )
      continue;

    if (parseInt(currentNode) === endNodeNo) {
      console.log(`findMultiCriteriaRoute: Destination ${endNodeNo} reached`);
      const allPaths = reconstructPaths(endNodeNo, previous, graph, mode);
      return allPaths;
    }

    for (const edge of graph[currentNode]) {
      const neighbor = edge.neighbor;
      const routeData = edge.routeData;
      const weight = calculateEdgeWeight(routeData, criteriaWeights, mode);
      const tentativeGScore = gScores[currentNode][pathIndex] + weight;

      const tentativeFScore =
        tentativeGScore +
        haversineHeuristic(neighbor, endNodeNo, coordinatesMap);

      let addPath = true;
      const minGScore =
        gScores[neighbor].length > 0
          ? Math.min(...gScores[neighbor])
          : Infinity;

      if (tentativeGScore > minGScore * costThreshold) {
        addPath = false;
      }

      if (addPath) {
        gScores[neighbor].push(tentativeGScore);
        fScores[neighbor].push(tentativeFScore);
        previous[neighbor].push({
          node: currentNode,
          route: routeData,
          gScore: tentativeGScore,
          pathIndex,
        });

        if (gScores[neighbor].length > maxPathsPerNode) {
          const maxGScoreIndex = gScores[neighbor].indexOf(
            Math.max(...gScores[neighbor])
          );
          gScores[neighbor].splice(maxGScoreIndex, 1);
          fScores[neighbor].splice(maxGScoreIndex, 1);
          previous[neighbor].splice(maxGScoreIndex, 1);
        }

        const newPathIndex = gScores[neighbor].indexOf(tentativeGScore);
        pq.enqueue(
          { node: neighbor, pathIndex: newPathIndex },
          tentativeFScore
        );
      }
    }
  }

  console.log(
    `findMultiCriteriaRoute: No path found from ${startNodeNo} to ${endNodeNo} for mode ${mode}`
  );
  return [];
}

/**
 * Tái tạo tất cả các đường đi từ đích về điểm bắt đầu.
 */
function reconstructPaths(endNodeNo, previous, graph, mode) {
  const results = [];

  function backtrack(
    node,
    pathNodes,
    pathRoutes,
    totalCost,
    totalDuration,
    totalDistance
  ) {
    if (previous[node][0] === null) {
      // Đã đến điểm bắt đầu
      results.push({
        path: [...pathNodes],
        routeDetails: [...pathRoutes],
        totalCost,
        totalDuration,
        totalDistance,
      });
      return;
    }

    for (const pred of previous[node]) {
      if (!pred) continue;
      const prevNode = pred.node;
      const route = pred.route;
      const gScore = pred.gScore;

      let lengthKm = 0.01;
      let durationMinutes = 0;
      if (route) {
        lengthKm = route.length || 0.01;
        let speedKmH = route.v0Prt || 30;
        const modeSpeeds = {
          cycling: route.vCurPrtSysBike,
          driving: route.vCurPrtSysCar,
          walking: route.vCurPrtSysCo,
          motorcycle: route.vCurPrtSysMc,
        };
        speedKmH = modeSpeeds[mode] ?? speedKmH;
        speedKmH = Math.max(speedKmH, 5);
        durationMinutes = (lengthKm / speedKmH) * 60;
      }

      pathNodes.unshift(node);
      if (route) pathRoutes.unshift(route);
      backtrack(
        prevNode,
        pathNodes,
        pathRoutes,
        gScore,
        totalDuration + durationMinutes,
        totalDistance + lengthKm
      );
      pathNodes.shift();
      if (route) pathRoutes.shift();
    }
  }

  previous[endNodeNo].forEach((pred, index) => {
    if (pred) {
      backtrack(endNodeNo, [endNodeNo], [], pred.gScore, 0, 0);
    }
  });

  return results;
}

/**
 * Tìm kiếm nhiều tuyến đường tối ưu dựa trên các tiêu chí.
 */
function findAlternativeRoutes(
  startNodeNo,
  endNodeNo,
  allCoordinates,
  allRoutes,
  mode
) {
  const alternativeRoutes = [];

  const criteriaProfiles = {
    "Tuyến đường Nhanh nhất": {
      timeWeight: 0.7,
      distanceWeight: 0.1,
      trafficWeight: 0.15,
      pollutionWeight: 0.05,
      emissionWeight: 0.0,
    },
    "Tuyến đường Ngắn nhất": {
      timeWeight: 0.1,
      distanceWeight: 0.7,
      trafficWeight: 0.15,
      pollutionWeight: 0.05,
      emissionWeight: 0.0,
    },
    "Tuyến đường Ít ô nhiễm": {
      timeWeight: 0.15,
      distanceWeight: 0.1,
      trafficWeight: 0.15,
      pollutionWeight: 0.6,
      emissionWeight: 0.0,
    },
    "Tuyến đường Ít tắc đường": {
      timeWeight: 0.15,
      distanceWeight: 0.1,
      trafficWeight: 0.7,
      pollutionWeight: 0.05,
      emissionWeight: 0.0,
    },
    "Tuyến đường Ít gây ô nhiễm": {
      timeWeight: 0.1,
      distanceWeight: 0.5,
      trafficWeight: 0.1,
      pollutionWeight: 0.05,
      emissionWeight: 0.25,
    },
    "Tuyến đường Cân bằng": {
      timeWeight: 0.25,
      distanceWeight: 0.25,
      trafficWeight: 0.25,
      pollutionWeight: 0.15,
      emissionWeight: 0.1,
    },
  };

  for (const type in criteriaProfiles) {
    console.log(`Finding ${type} routes for mode: ${mode}...`);
    const routes = findMultiCriteriaRoute(
      startNodeNo,
      endNodeNo,
      allCoordinates,
      allRoutes,
      criteriaProfiles[type],
      mode
    );
    routes.forEach((route) => {
      alternativeRoutes.push({
        criteriaType: type,
        ...route,
      });
    });
  }
  return alternativeRoutes;
}

/**
 * Đề xuất tuyến đường tối ưu nhất từ danh sách các tuyến đường.
 */
function getOptimalRouteSuggestion(alternativeRoutes) {
  if (!alternativeRoutes || alternativeRoutes.length === 0) {
    return null;
  }

  // Ưu tiên tuyến "Cân bằng"
  const balancedRoute = alternativeRoutes.find(
    (route) => route.criteriaType === "Tuyến đường Cân bằng"
  );
  if (balancedRoute) {
    return balancedRoute;
  }

  // Nếu không có tuyến "Cân bằng", chọn tuyến có totalCost thấp nhất
  let bestRoute = alternativeRoutes[0];
  for (let i = 1; i < alternativeRoutes.length; i++) {
    if (alternativeRoutes[i].totalCost < bestRoute.totalCost) {
      bestRoute = alternativeRoutes[i];
    }
  }

  return bestRoute;
}

module.exports = {
  findMultiCriteriaRoute,
  findAlternativeRoutes,
  getOptimalRouteSuggestion,
};
