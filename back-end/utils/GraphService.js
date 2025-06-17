// utils/GraphService.js

/**
 * Lớp MinPriorityQueue để sử dụng trong thuật toán Dijkstra.
 * Các phần tử được lưu trữ dưới dạng { value: any, priority: number }.
 */
class MinPriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(value, priority) {
    this.values.push({ value, priority });
    this.sort(); // Sắp xếp lại sau khi thêm
  }

  dequeue() {
    return this.values.shift(); // Lấy phần tử có độ ưu tiên thấp nhất (đầu mảng)
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

/**
 * Tính toán trọng số của một cạnh (đoạn đường) dựa trên các tiêu chí và trọng số.
 * Đã tích hợp VOLRPT, VC và ô nhiễm không khí.
 * @param {Object} route - Đối tượng tuyến đường từ MongoDB.
 * @param {Object} criteriaWeights - Đối tượng chứa trọng số cho từng tiêu chí (time, distance, traffic, pollution).
 * @param {string} mode - Chế độ di chuyển (ví dụ: 'driving', 'cycling', 'walking').
 * @returns {number} Tổng trọng số tính toán cho đoạn đường.
 */
function calculateEdgeWeight(route, criteriaWeights, mode) {
  // Lấy các giá trị cần thiết từ route
  const lengthKm = route.lengthKm || 0.01; // Tránh chia cho 0
  let speedKmH = route.v0PrtKmH || 30; // Vận tốc tối đa mặc định

  // Cố gắng sử dụng vận tốc thực tế theo mode cụ thể nếu có
  if (mode === "cycling" && route.vCurPrtSysBike) {
    speedKmH = route.vCurPrtSysBike;
  } else if (mode === "driving" && route.vCurPrtSysCar) {
    speedKmH = route.vCurPrtSysCar;
  } else if (mode === "walking" && route.vCurPrtSysCo) {
    // Giả định 'CO' là đi bộ nếu không có 'WALKING'
    speedKmH = route.vCurPrtSysCo;
  }
  // Nếu speedKmH vẫn là 0 hoặc rất nhỏ, đặt một giá trị tối thiểu để tránh lỗi và phản ánh độ khó
  if (speedKmH <= 0) speedKmH = 10;

  const durationHours = lengthKm / speedKmH; // Thời gian di chuyển (giờ)

  // --- Tính toán trafficImpactFactor dựa trên VOLVEHPRT(AP) và CAPPRT, hoặc VC ---
  // Ưu tiên sử dụng VC (Vol/Cap Ratio) nếu có, nếu không, thử dùng VOLVEHPRT(AP) / CAPPRT
  let dynamicTrafficImpact = 0.1; // Giá trị mặc định thấp

  if (route.volCapRatioPrtAP != null && route.volCapRatioPrtAP > 0) {
    // Nếu có VC ratio, sử dụng nó. Giá trị càng cao, tắc đường càng nhiều.
    // Chuẩn hóa hoặc nhân với một hệ số để nó có ý nghĩa trong tổng chi phí.
    dynamicTrafficImpact = route.volCapRatioPrtAP; // VC thường từ 0 đến >1
  } else if (
    route.volVehPrtAP != null &&
    route.CAPPRT != null &&
    route.CAPPRT > 0
  ) {
    // Nếu không có VC, tính từ Volume/Capacity
    dynamicTrafficImpact = route.volVehPrtAP / route.CAPPRT;
  }

  // Giới hạn tác động giao thông để không quá lớn hoặc quá nhỏ
  dynamicTrafficImpact = Math.min(Math.max(dynamicTrafficImpact, 0.01), 2.0); // Giới hạn từ 0.01 đến 2.0

  // Sử dụng pollutionFactor từ dữ liệu route.
  // Trong thực tế, giá trị này sẽ được cập nhật từ các nguồn dữ liệu ô nhiễm thực tế.
  const pollutionImpact = route.pollutionFactor || 0.01; // Giá trị mặc định

  // Áp dụng trọng số cho từng tiêu chí
  const timeCost = durationHours * (criteriaWeights.timeWeight || 0);
  const distanceCost = lengthKm * (criteriaWeights.distanceWeight || 0);
  const trafficCost =
    dynamicTrafficImpact * (criteriaWeights.trafficWeight || 0);
  const pollutionCost =
    pollutionImpact * (criteriaWeights.pollutionWeight || 0);

  // Tổng chi phí (trọng số) của đoạn đường
  // Đảm bảo chi phí là một số dương để Dijkstra hoạt động đúng
  const totalCost = timeCost + distanceCost + trafficCost + pollutionCost;
  return totalCost > 0 ? totalCost : 0.001; // Đảm bảo chi phí dương nhỏ nhất
}

/**
 * Thuật toán Dijkstra tìm đường ngắn nhất đa tiêu chí.
 *
 * @param {number} startNodeNo - NODE-NO của điểm bắt đầu.
 * @param {number} endNodeNo - NODE-NO của điểm kết thúc.
 * @param {Array<Object>} allCoordinates - Mảng các đối tượng tọa độ từ MongoDB.
 * @param {Array<Object>} allRoutes - Mảng các đối tượng tuyến đường từ MongoDB.
 * @param {Object} criteriaWeights - Đối tượng chứa trọng số cho từng tiêu chí.
 * Ví dụ: { timeWeight: 0.5, distanceWeight: 0.3, trafficWeight: 0.2, pollutionWeight: 0.1 }
 * @param {string} mode - Chế độ di chuyển (ví dụ: 'driving', 'cycling', 'walking').
 * @returns {Object|null} Đối tượng chứa `path` (mảng NODE-NO), `totalCost`, `totalDuration` (phút), `totalDistance` (km), hoặc null nếu không tìm thấy đường.
 */
function findMultiCriteriaRoute(
  startNodeNo,
  endNodeNo,
  allCoordinates,
  allRoutes,
  criteriaWeights,
  mode
) {
  const graph = {}; // Adjacency list: { 'nodeId': [{ neighborId: '...', routeData: { ... } }], ... }
  const nodeCoords = new Map(); // Map: { 'nodeId': {XCOORD, YCOORD}, ... }

  // 1. Xây dựng đồ thị và Map tọa độ
  allCoordinates.forEach((coord) => {
    graph[coord["NODE-NO"]] = [];
    nodeCoords.set(coord["NODE-NO"], {
      XCOORD: coord.XCOORD,
      YCOORD: coord.YCOORD,
    });
  });

  allRoutes.forEach((route) => {
    const fromNode = route.FROMNODENO;
    const toNode = route.TONODENO;

    if (graph[fromNode] && graph[toNode]) {
      // Kiểm tra TSYSSET để xem tuyến đường có hỗ trợ mode đã chọn không
      const allowedModes = route.TSYSSET
        ? route.TSYSSET.split(",").map((m) => m.trim().toLowerCase())
        : [];
      let modeAllowed = true; // Mặc định cho phép nếu không có TSYSSET hoặc không khớp mode cụ thể

      if (mode === "cycling" && !allowedModes.includes("bike"))
        modeAllowed = false;
      if (mode === "driving" && !allowedModes.includes("car"))
        modeAllowed = false;
      if (mode === "walking" && !allowedModes.includes("w"))
        modeAllowed = false; // Giả định 'W' cho Walking

      if (modeAllowed) {
        // Thêm cạnh đi từ fromNode đến toNode
        graph[fromNode].push({ neighbor: toNode, routeData: route });
        // Nếu là đường hai chiều hoặc không có hướng cụ thể, thêm cạnh ngược lại
        // Trong trường hợp này, dữ liệu không chỉ rõ 2 chiều, nên chỉ thêm 1 chiều theo FROM-TO
        // Nếu cần 2 chiều, bạn sẽ cần logic để thêm cạnh ngược lại và tính toán trọng số tương ứng
      }
    }
  });

  // 2. Thuật toán Dijkstra
  const distances = {}; // Khoảng cách từ startNode đến mỗi nút
  const previous = {}; // Nút trước đó trong đường đi tối ưu
  const pq = new MinPriorityQueue(); // Hàng đợi ưu tiên

  // Khởi tạo
  for (let node in graph) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[startNodeNo] = 0;
  pq.enqueue(startNodeNo, 0);

  let totalDuration = 0; // Tổng thời gian
  let totalDistance = 0; // Tổng khoảng cách (km)

  while (!pq.isEmpty()) {
    const { value: currentNode, priority: currentCost } = pq.dequeue();

    if (currentCost > distances[currentNode]) continue; // Đã tìm thấy đường tốt hơn

    if (parseInt(currentNode) === endNodeNo) {
      // Đã đến đích, xây dựng đường đi
      const path = [];
      let tempNode = endNodeNo;
      while (tempNode !== null) {
        path.unshift(tempNode); // Thêm vào đầu mảng
        tempNode = previous[tempNode]?.node; // Lấy nút trước đó từ đối tượng previous
      }

      // Tính toán tổng thời gian và khoảng cách thực tế của đường đi đã tìm được
      let currentTotalDuration = 0;
      let currentTotalDistance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const edge = graph[from].find((edge) => edge.neighbor === to);
        if (edge) {
          const route = edge.routeData;
          const lengthKm = route.lengthKm || 0.01;
          let speedKmH = route.v0PrtKmH || 30;
          if (mode === "cycling" && route.vCurPrtSysBike) {
            speedKmH = route.vCurPrtSysBike;
          } else if (mode === "driving" && route.vCurPrtSysCar) {
            speedKmH = route.vCurPrtSysCar;
          } else if (mode === "walking" && route.vCurPrtSysCo) {
            speedKmH = route.vCurPrtSysCo;
          }
          if (speedKmH <= 0) speedKmH = 10;
          currentTotalDuration += (lengthKm / speedKmH) * 60; // Cộng dồn thời gian (phút)
          currentTotalDistance += lengthKm; // Cộng dồn khoảng cách (km)
        }
      }
      totalDuration = currentTotalDuration;
      totalDistance = currentTotalDistance;

      return { path, totalCost: currentCost, totalDuration, totalDistance };
    }

    // Duyệt qua các hàng xóm
    for (let edge of graph[currentNode]) {
      const neighbor = edge.neighbor;
      const routeData = edge.routeData;
      const weight = calculateEdgeWeight(routeData, criteriaWeights, mode);
      const newCost = currentCost + weight;

      if (newCost < distances[neighbor]) {
        distances[neighbor] = newCost;
        previous[neighbor] = { node: currentNode, route: routeData }; // Lưu cả route data
        pq.enqueue(neighbor, newCost);
      }
    }
  }

  return null; // Không tìm thấy đường đi
}

/**
 * Tìm kiếm và trả về nhiều tuyến đường tối ưu dựa trên các tiêu chí khác nhau.
 *
 * @param {number} startNodeNo - NODE-NO của điểm bắt đầu.
 * @param {number} endNodeNo - NODE-NO của điểm kết thúc.
 * @param {Array<Object>} allCoordinates - Mảng các đối tượng tọa độ từ MongoDB.
 * @param {Array<Object>} allRoutes - Mảng các đối tượng tuyến đường từ MongoDB.
 * @param {string} mode - Chế độ di chuyển (ví dụ: 'driving', 'cycling', 'walking').
 * @returns {Array<Object>} Mảng các đối tượng tuyến đường, mỗi đối tượng chứa `criteriaType`, `path`, `totalCost`, `totalDuration`, `totalDistance`.
 */
function findAlternativeRoutes(
  startNodeNo,
  endNodeNo,
  allCoordinates,
  allRoutes,
  mode
) {
  const alternativeRoutes = [];

  // Định nghĩa các cấu hình trọng số cho các loại tuyến đường khác nhau
  const criteriaProfiles = {
    "Tuyến đường Nhanh nhất": {
      timeWeight: 10,
      distanceWeight: 1,
      trafficWeight: 2,
      pollutionWeight: 0.5,
    }, // Ưu tiên thời gian
    "Tuyến đường Ngắn nhất": {
      timeWeight: 1,
      distanceWeight: 10,
      trafficWeight: 1,
      pollutionWeight: 0.5,
    }, // Ưu tiên khoảng cách
    "Tuyến đường Xanh nhất": {
      timeWeight: 2,
      distanceWeight: 1,
      trafficWeight: 1,
      pollutionWeight: 10,
    }, // Ưu tiên ít ô nhiễm
    "Tuyến đường Ít tắc đường nhất": {
      timeWeight: 2,
      distanceWeight: 1,
      trafficWeight: 10,
      pollutionWeight: 0.5,
    }, // Ưu tiên ít tắc đường
    "Tuyến đường Cân bằng": {
      timeWeight: 3,
      distanceWeight: 2,
      trafficWeight: 3,
      pollutionWeight: 3,
    }, // Cân bằng giữa các tiêu chí
  };

  for (const type in criteriaProfiles) {
    const weights = criteriaProfiles[type];
    console.log(`Finding ${type}...`);
    const route = findMultiCriteriaRoute(
      startNodeNo,
      endNodeNo,
      allCoordinates,
      allRoutes,
      weights,
      mode
    );
    if (route) {
      alternativeRoutes.push({
        criteriaType: type,
        ...route,
      });
    }
  }
  return alternativeRoutes;
}

/**
 * Đề xuất tuyến đường tối ưu nhất từ danh sách các tuyến đường thay thế.
 * Hiện tại, nó sẽ chọn tuyến đường "Cân bằng" nếu có, hoặc tuyến đường có chi phí thấp nhất trong số các lựa chọn.
 *
 * @param {Array<Object>} alternativeRoutes - Mảng các tuyến đường thay thế được trả về từ findAlternativeRoutes.
 * @returns {Object|null} Tuyến đường được đề xuất, hoặc null nếu không có tuyến đường nào.
 */
function getOptimalRouteSuggestion(alternativeRoutes) {
  if (!alternativeRoutes || alternativeRoutes.length === 0) {
    return null;
  }

  // Ưu tiên đề xuất tuyến đường "Cân bằng" nếu nó tồn tại
  const balancedRoute = alternativeRoutes.find(
    (route) => route.criteriaType === "Tuyến đường Cân bằng"
  );
  if (balancedRoute) {
    return balancedRoute;
  }

  // Nếu không có tuyến đường "Cân bằng", chọn tuyến đường có tổng chi phí thấp nhất
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
  findAlternativeRoutes, // Export the new function
  getOptimalRouteSuggestion, // Export the new function
};
