/**
 * Lớp MinPriorityQueue được tối ưu hơn sử dụng heap (binary heap)
 * để thêm và bóc phần tử nhanh hơn (O(logN)) so với sắp xếp lại toàn bộ mảng (O(N logN)).
 * Các phần tử được lưu trữ dưới dạng { value: any, priority: number }.
 */
class MinPriorityQueue {
  constructor() {
    this.values = [];
  }

  /**
   * Thêm một phần tử mới vào hàng đợi ưu tiên.
   * @param {*} value - Giá trị của phần tử.
   * @param {number} priority - Độ ưu tiên của phần tử (số nhỏ hơn = ưu tiên cao hơn).
   */
  enqueue(value, priority) {
    this.values.push({ value, priority });
    this.bubbleUp();
  }

  /**
   * Lấy và loại bỏ phần tử có độ ưu tiên thấp nhất (phần tử gốc của heap).
   * @returns {Object} Phần tử có độ ưu tiên thấp nhất.
   */
  dequeue() {
    const min = this.values[0];
    const end = this.values.pop();
    if (this.values.length > 0) {
      this.values[0] = end;
      this.sinkDown();
    }
    return min;
  }

  /**
   * Di chuyển phần tử mới thêm vào lên đúng vị trí của nó trong heap.
   */
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

  /**
   * Di chuyển phần tử gốc (sau khi dequeue) xuống đúng vị trí của nó trong heap.
   */
  sinkDown() {
    let idx = 0;
    const length = this.values.length;
    const element = this.values[0];
    while (true) {
      let leftChildIdx = 2 * idx + 1;
      let rightChildIdx = 2 * idx + 2;
      let leftChild, rightChild;
      let swap = null; // Index to swap with

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

  /**
   * Kiểm tra xem hàng đợi có rỗng không.
   * @returns {boolean} True nếu hàng đợi rỗng, ngược lại là false.
   */
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
  const lengthKm = route.lengthKm || 0.01; // Tránh chia cho 0 nếu độ dài không xác định
  let speedKmH = route.v0PrtKmH || 30; // Vận tốc mặc định an toàn

  // Chọn vận tốc cụ thể theo mode
  if (
    mode === "cycling" &&
    route.vCurPrtSysBike !== undefined &&
    route.vCurPrtSysBike !== null
  ) {
    speedKmH = route.vCurPrtSysBike;
  } else if (
    mode === "driving" &&
    route.vCurPrtSysCar !== undefined &&
    route.vCurPrtSysCar !== null
  ) {
    speedKmH = route.vCurPrtSysCar;
  } else if (
    mode === "walking" &&
    route.vCurPrtSysCo !== undefined &&
    route.vCurPrtSysCo !== null
  ) {
    // Giả định 'CO' là đi bộ nếu không có 'WALKING' riêng
    speedKmH = route.vCurPrtSysCo;
  }

  // Đảm bảo tốc độ tối thiểu để tránh chia cho 0 hoặc giá trị quá lớn
  if (speedKmH <= 0) speedKmH = 5; // Vận tốc tối thiểu hợp lý (ví dụ: 5 km/h)

  const durationHours = lengthKm / speedKmH; // Thời gian di chuyển (giờ)

  // --- Tính toán trafficImpactFactor ---
  let dynamicTrafficImpact = 0.1; // Giá trị mặc định thấp cho đường thông thoáng

  if (route.volCapRatioPrtAP != null && route.volCapRatioPrtAP > 0) {
    dynamicTrafficImpact = route.volCapRatioPrtAP;
  } else if (
    route.volVehPrtAP != null &&
    route.CAPPRT != null &&
    route.CAPPRT > 0
  ) {
    dynamicTrafficImpact = route.volVehPrtAP / route.CAPPRT;
  }

  // Giới hạn tác động giao thông trong một khoảng hợp lý
  dynamicTrafficImpact = Math.min(Math.max(dynamicTrafficImpact, 0.01), 3.0); // Giới hạn từ 0.01 đến 3.0

  // Sử dụng pollutionFactor từ dữ liệu route.
  // Trong thực tế, giá trị này cần được cập nhật từ các nguồn dữ liệu ô nhiễm thực tế và liên kết với đoạn đường.
  const pollutionImpact = route.pollutionFactor || 0.05; // Giá trị mặc định nhỏ

  // Áp dụng trọng số cho từng tiêu chí, sử dụng 0 nếu trọng số không được cung cấp.
  // Các trọng số nên được chuẩn hóa hoặc có ý nghĩa tương đối.
  const timeCost = durationHours * (criteriaWeights.timeWeight || 0);
  const distanceCost = lengthKm * (criteriaWeights.distanceWeight || 0);
  const trafficCost =
    dynamicTrafficImpact * (criteriaWeights.trafficWeight || 0);
  const pollutionCost =
    pollutionImpact * (criteriaWeights.pollutionWeight || 0);

  // Tổng chi phí (trọng số) của đoạn đường.
  // Đảm bảo chi phí là một số dương để Dijkstra hoạt động đúng.
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
  const graph = {}; // Danh sách kề: { 'nodeId': [{ neighborId: '...', routeData: { ... } }], ... }

  // 1. Xây dựng đồ thị
  // Đảm bảo tất cả các node đều có trong đồ thị, kể cả những node không có tuyến đường đi ra/vào.
  allCoordinates.forEach((coord) => {
    const nodeId = coord["NODE-NO"];
    if (!graph[nodeId]) {
      graph[nodeId] = [];
    }
  });

  allRoutes.forEach((route) => {
    const fromNode = route.FROMNODENO;
    const toNode = route.TONODENO;

    // Chỉ thêm cạnh nếu cả hai nút tồn tại trong tập hợp allCoordinates
    if (graph.hasOwnProperty(fromNode) && graph.hasOwnProperty(toNode)) {
      const allowedModes = route.TSYSSET
        ? route.TSYSSET.split(",").map((m) => m.trim().toLowerCase())
        : [];
      let modeAllowed = false; // Mặc định không cho phép nếu không có TSYSSET cụ thể

      // Kiểm tra mode di chuyển hợp lệ
      if (mode === "cycling" && allowedModes.includes("bike")) {
        modeAllowed = true;
      } else if (mode === "driving" && allowedModes.includes("car")) {
        modeAllowed = true;
      } else if (
        mode === "walking" &&
        (allowedModes.includes("w") || allowedModes.includes("co"))
      ) {
        // Added 'co' for walking based on common mapping
        modeAllowed = true;
      } else if (!route.TSYSSET || route.TSYSSET.trim() === "") {
        // Nếu TSYSSET trống hoặc không có, coi như cho phép tất cả các mode mặc định
        modeAllowed = true;
      }

      if (modeAllowed) {
        // Thêm cạnh đi từ fromNode đến toNode
        graph[fromNode].push({ neighbor: toNode, routeData: route });

        // Nếu tuyến đường là hai chiều (thường có một trường 'ONEWAY' hoặc tương tự),
        // bạn sẽ thêm cạnh ngược lại ở đây.
        // Ví dụ: if (!route.ONEWAY || route.ONEWAY === 0) { ... }
        // Hiện tại, dữ liệu không chỉ rõ hai chiều, nên chỉ thêm một chiều theo FROM-TO.
      }
    }
  });

  // 2. Chuẩn bị cho Thuật toán Dijkstra
  const distances = {}; // Khoảng cách từ startNode đến mỗi nút (tổng chi phí)
  const previous = {}; // Nút và dữ liệu tuyến đường trước đó trong đường đi tối ưu
  const pq = new MinPriorityQueue(); // Hàng đợi ưu tiên

  // Khởi tạo tất cả các nút
  for (const node of Object.keys(graph)) {
    distances[node] = Infinity;
    previous[node] = null;
  }

  // Thiết lập nút bắt đầu
  distances[startNodeNo] = 0;
  pq.enqueue(startNodeNo, 0);

  // 3. Thực thi Thuật toán Dijkstra
  while (!pq.isEmpty()) {
    const { value: currentNode, priority: currentCost } = pq.dequeue();

    // Nếu đã tìm thấy đường tốt hơn đến currentNode, bỏ qua
    if (currentCost > distances[currentNode]) {
      continue;
    }

    // Nếu đã đến đích, xây dựng đường đi
    if (parseInt(currentNode) === endNodeNo) {
      const path = [];
      let tempNode = endNodeNo;
      // Dò ngược lại từ đích đến nguồn để xây dựng đường đi
      while (tempNode !== null) {
        path.unshift(tempNode); // Thêm vào đầu mảng để có thứ tự đúng
        // Sử dụng previous[tempNode]?.node để truy cập an toàn
        tempNode = previous[tempNode] ? previous[tempNode].node : null;
      }

      // Tính toán tổng thời gian và khoảng cách thực tế của đường đi đã tìm được
      let actualTotalDurationMinutes = 0;
      let actualTotalDistanceKm = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];

        // Tìm cạnh (routeData) giữa 'from' và 'to' đã được lưu trong `previous[to]`
        // (chúng ta đã lưu `routeData` vào `previous[neighbor]`)
        const route = previous[to]?.route;

        if (route) {
          const lengthKm = route.lengthKm || 0.01;
          let speedKmH = route.v0PrtKmH || 30; // Default speed

          // Recalculate speed based on mode (same logic as calculateEdgeWeight)
          if (
            mode === "cycling" &&
            route.vCurPrtSysBike !== undefined &&
            route.vCurPrtSysBike !== null
          ) {
            speedKmH = route.vCurPrtSysBike;
          } else if (
            mode === "driving" &&
            route.vCurPrtSysCar !== undefined &&
            route.vCurPrtSysCar !== null
          ) {
            speedKmH = route.vCurPrtSysCar;
          } else if (
            mode === "walking" &&
            route.vCurPrtSysCo !== undefined &&
            route.vCurPrtSysCo !== null
          ) {
            speedKmH = route.vCurPrtSysCo;
          }
          if (speedKmH <= 0) speedKmH = 5;

          actualTotalDurationMinutes += (lengthKm / speedKmH) * 60; // Convert hours to minutes
          actualTotalDistanceKm += lengthKm;
        }
      }

      return {
        path,
        totalCost: currentCost,
        totalDuration: actualTotalDurationMinutes,
        totalDistance: actualTotalDistanceKm,
      };
    }

    // Duyệt qua các hàng xóm của nút hiện tại
    for (const edge of graph[currentNode]) {
      const neighbor = edge.neighbor;
      const routeData = edge.routeData;
      const weight = calculateEdgeWeight(routeData, criteriaWeights, mode);
      const newCost = currentCost + weight;

      // Nếu tìm thấy đường đi ngắn hơn đến hàng xóm
      if (newCost < distances[neighbor]) {
        distances[neighbor] = newCost;
        // Lưu trữ cả nút trước đó VÀ dữ liệu tuyến đường đã sử dụng để đến nút hàng xóm
        previous[neighbor] = { node: currentNode, route: routeData };
        pq.enqueue(neighbor, newCost);
      }
    }
  }

  return null; // Không tìm thấy đường đi đến đích
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
    console.log(`Finding ${type} route for mode: ${mode}...`);
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
  findAlternativeRoutes,
  getOptimalRouteSuggestion,
};
