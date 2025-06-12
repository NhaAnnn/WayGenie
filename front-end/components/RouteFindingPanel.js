import React, { useState, useEffect, useRef } from "react"; // Import useRef
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Alert,
  ScrollView,
  TouchableWithoutFeedback, // Import TouchableWithoutFeedback
} from "react-native";
import axios from "axios";

import { transportModes } from "../data/transportModes"; // Đảm bảo đường dẫn đúng
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../secrets"; // Đảm bảo đường dẫn đúng
import RouteDetailsModal from "./RouteDetailsModal"; // Đảm bảo đường dẫn đúng

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

// Tọa độ mặc định cho Hà Nội (ví dụ)
const DEFAULT_HANOI_COORDS = [21.0278, 105.8342]; // Vĩ độ, Kinh độ (Latitude, Longitude)

const RouteFindingPanel = ({ onRouteSelected, onClearRoute }) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState("driving"); // Khởi tạo với giá trị mặc định

  const [startCoords, setStartCoords] = useState(null); // [lon, lat]
  const [endCoords, setEndCoords] = useState(null); // [lon, lat]

  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null); // 'start' hoặc 'end'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const debouncedStartText = useDebounce(start, 300);
  const debouncedEndText = useDebounce(end, 300);

  const [suggestedRoutes, setSuggestedRoutes] = useState([]); // Chứa tất cả các tuyến đường gợi ý từ Mapbox
  const [isRouteDetailsModalVisible, setIsRouteDetailsModalVisible] =
    useState(false);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null); // Tuyến đường chi tiết được chọn để hiển thị modal

  // State mới để kiểm soát việc hiển thị các lựa chọn phương tiện và tiêu chí
  const [hasPerformedInitialSearch, setHasPerformedInitialSearch] =
    useState(false);

  // State cho các tiêu chí định tuyến
  const [routingCriteria] = useState([
    { id: "fastest", name: "Nhanh nhất" },
    { id: "shortest", name: "Ngắn nhất" },
    { id: "least_traffic", name: "Ít tắc đường" },
    { id: "least_polluted", name: "Ít ô nhiễm" },
  ]);
  const [selectedRoutingCriterionId, setSelectedRoutingCriterionId] =
    useState("fastest");

  // Refs và state cho vị trí của TextInput để định vị danh sách gợi ý
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const [startInputLayout, setStartInputLayout] = useState(null);
  const [endInputLayout, setEndInputLayout] = useState(null);
  const [panelLayout, setPanelLayout] = useState(null); // Layout của toàn bộ panel

  useEffect(() => {
    if (!startCoords && start === "") {
      setStartCoords([DEFAULT_HANOI_COORDS[1], DEFAULT_HANOI_COORDS[0]]);
      setStart("Hà Nội (Mặc định)");
    }
  }, []);

  useEffect(() => {
    if (activeInput === "start") {
      handleAutocomplete(debouncedStartText, "start");
    }
  }, [debouncedStartText, activeInput]);

  useEffect(() => {
    if (activeInput === "end") {
      handleAutocomplete(debouncedEndText, "end");
    }
  }, [debouncedEndText, activeInput]);

  // Effect để tự động tìm lại tuyến đường khi mode hoặc tiêu chí thay đổi
  useEffect(() => {
    // Chỉ tìm lại nếu đã có ít nhất một lần tìm kiếm thành công và có điểm đi/điểm đến
    if (hasPerformedInitialSearch && startCoords && endCoords) {
      fetchRoute();
    }
  }, [mode, selectedRoutingCriterionId, hasPerformedInitialSearch]);

  const handleAutocomplete = async (text, inputType) => {
    if (!text) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          text
        )}.json`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            limit: 5,
            language: "vi",
            country: "vn",
            types: "place,locality,address,poi,district,region",
          },
        }
      );
      const hits = res.data.features.map((feature) => ({
        name: feature.place_name,
        coords: [feature.center[0], feature.center[1]], // Lưu dưới dạng [lon, lat]
      }));

      setSuggestions(hits);
      setError("");
    } catch (e) {
      console.error(
        "Lỗi Autocomplete Mapbox:",
        e.response ? e.response.data : e.message
      );
      setSuggestions([]);
      setError("Không thể lấy gợi ý địa điểm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (place) => {
    Keyboard.dismiss();
    if (activeInput === "start") {
      setStart(place.name);
      setStartCoords(place.coords);
    } else {
      setEnd(place.name);
      setEndCoords(place.coords);
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const fetchRoute = async () => {
    if (!startCoords || !endCoords) {
      setError("Vui lòng chọn điểm đi và điểm đến.");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestedRoutes([]);
    // onClearRoute(); // Không gọi onClearRoute ở đây để tránh reset map nếu chỉ thay đổi mode/criterion

    try {
      const startLonLat = `${startCoords[0]},${startCoords[1]}`;
      const endLonLat = `${endCoords[0]},${endCoords[1]}`;

      const currentMode = mode || "driving";

      console.log("Đang tìm đường với:", {
        startLonLat,
        endLonLat,
        mode: currentMode,
        criterion: selectedRoutingCriterionId,
      });

      const res = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${currentMode}/${startLonLat};${endLonLat}`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            geometries: "geojson",
            overview: "full",
            steps: true,
            alternatives: true,
          },
        }
      );

      console.log(
        "Phản hồi từ Mapbox Directions API:",
        JSON.stringify(res.data, null, 2)
      );

      if (res.data.routes && res.data.routes.length > 0) {
        setSuggestedRoutes(res.data.routes);
        setHasPerformedInitialSearch(true); // Đã tìm kiếm thành công, hiển thị các tùy chọn

        const allGeoJSONs = res.data.routes.map((route) => route.geometry);

        onRouteSelected(
          startCoords, // Là [lon, lat]
          endCoords, // Là [lon, lat]
          allGeoJSONs // TRUYỀN TOÀN BỘ MẢNG CÁC GEOJSONs
        );
        console.log("Đã tìm thấy lộ trình thành công và cập nhật bản đồ.");
      } else {
        setError("Không tìm thấy tuyến đường cho các điểm đã chọn.");
        console.warn("Không tìm thấy tuyến đường từ API.");
      }
    } catch (error) {
      console.error(
        "Lỗi Mapbox Directions API:",
        error.response ? error.response.data : error.message
      );
      if (error.response && error.response.status === 401) {
        setError(
          "Lỗi xác thực API. Vui lòng kiểm tra lại Access Token Mapbox của bạn."
        );
      } else if (error.response && error.response.data) {
        setError(
          `Lỗi tìm đường: ${error.response.data.message || error.message}`
        );
      } else {
        setError(
          `Không thể lấy dữ liệu tuyến đường: ${error.message}. Vui lòng kiểm tra kết nối hoặc thử lại.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFindRoute = () => {
    if (!startCoords || !endCoords) {
      Alert.alert("Thông báo", "Vui lòng chọn điểm đi và điểm đến từ gợi ý.");
      return;
    }
    // Khi người dùng nhấn nút tìm đường, luôn gọi fetchRoute và đảm bảo hiển thị các tùy chọn
    fetchRoute();
  };

  const showRouteDetails = (route) => {
    setSelectedRouteDetails(route);
    setIsRouteDetailsModalVisible(true);
  };

  const closeRouteDetailsModal = () => {
    setIsRouteDetailsModalVisible(false);
    setSelectedRouteDetails(null);
  };

  // Callback để lấy layout của panel chính
  const onPanelLayout = (event) => {
    setPanelLayout(event.nativeEvent.layout);
  };

  // Hàm để lấy layout của input field
  const getAbsoluteLayout = (ref) => {
    return new Promise((resolve) => {
      if (ref.current) {
        // Sử dụng measureInWindow để lấy tọa độ tuyệt đối trong cửa sổ
        ref.current.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      } else {
        resolve(null);
      }
    });
  };

  // Hàm để xử lý khi người dùng chạm vào bất kỳ đâu ngoài input/suggestions
  const handleScreenPress = () => {
    if (activeInput) {
      Keyboard.dismiss();
      setActiveInput(null);
      setSuggestions([]); // Xóa gợi ý khi mất focus toàn bộ
    }
  };

  return (
    <View style={styles.container} onLayout={onPanelLayout}>
      <TouchableWithoutFeedback onPress={handleScreenPress}>
        <ScrollView
          keyboardShouldPersistTaps="handled" // Quan trọng để các TouchableOpacity trong gợi ý hoạt động
          contentContainerStyle={styles.scrollContent}
        >
          {/* Input Fields for Start and End Points */}
          <View style={styles.inputContainer}>
            {/* Start Input Group */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={startInputRef} // Gán ref
                style={styles.input}
                placeholder="📍 Điểm đi"
                value={start}
                onChangeText={setStart}
                onFocus={async () => {
                  setActiveInput("start");
                  setSuggestions([]);
                  const layout = await getAbsoluteLayout(startInputRef);
                  setStartInputLayout(layout);
                }}
                onBlur={() => {
                  // Giữ trống để TouchableWithoutFeedback xử lý việc đóng gợi ý
                }}
                placeholderTextColor="#888"
              />
            </View>

            {/* End Input Group */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={endInputRef} // Gán ref
                style={styles.input}
                placeholder="🏁 Điểm đến"
                value={end}
                onChangeText={setEnd}
                onFocus={async () => {
                  setActiveInput("end");
                  setSuggestions([]);
                  const layout = await getAbsoluteLayout(endInputRef);
                  setEndInputLayout(layout);
                }}
                onBlur={() => {
                  // Giữ trống để TouchableWithoutFeedback xử lý việc đóng gợi ý
                }}
                placeholderTextColor="#888"
              />
            </View>
          </View>

          {/* Transport Mode Selection and Routing Criteria - Chỉ hiển thị sau khi tìm kiếm ban đầu */}
          {hasPerformedInitialSearch && (
            <View style={styles.modeAndCriteriaContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.modeScroll}
                contentContainerStyle={styles.modeScrollContent}
              >
                {transportModes.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.modeButton,
                      mode === item.mapboxProfile && styles.modeButtonSelected,
                    ]}
                    onPress={() => setMode(item.mapboxProfile)}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        mode === item.mapboxProfile && styles.modeTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Routing Criteria Controls */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.criteriaScroll}
                contentContainerStyle={styles.criteriaScrollContent}
              >
                {routingCriteria.map((criterion) => (
                  <TouchableOpacity
                    key={criterion.id}
                    style={[
                      styles.criteriaButton, // Style riêng cho nút tiêu chí
                      selectedRoutingCriterionId === criterion.id
                        ? styles.criteriaButtonSelected
                        : {},
                    ]}
                    onPress={() => setSelectedRoutingCriterionId(criterion.id)}
                  >
                    <Text
                      style={[
                        styles.criteriaText, // Style riêng cho text tiêu chí
                        selectedRoutingCriterionId === criterion.id
                          ? styles.criteriaTextSelected
                          : {},
                      ]}
                    >
                      {criterion.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Find Route Button */}
          <TouchableOpacity
            style={styles.findButton}
            onPress={handleFindRoute}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.findButtonText}>Tìm đường</Text>
            )}
          </TouchableOpacity>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Suggested Routes Display */}
          {suggestedRoutes.length > 0 && (
            <View style={styles.suggestedRoutesContainer}>
              <Text style={styles.suggestedRoutesTitle}>
                Các Lộ trình Gợi ý:
              </Text>
              {/* ScrollView để cuộn danh sách các tuyến đường nếu nhiều */}
              <ScrollView
                style={styles.suggestedRoutesList}
                nestedScrollEnabled
              >
                {suggestedRoutes.map((item, index) => (
                  <TouchableOpacity
                    key={`route-${index}`}
                    style={styles.suggestedRouteItem}
                    onPress={() => showRouteDetails(item)}
                  >
                    <Text style={styles.suggestedRouteText}>
                      <Text>{`Lộ trình ${index + 1}: `}</Text>
                      <Text style={styles.routeDetailHighlight}>
                        {(item.distance / 1000).toFixed(1)} km
                      </Text>
                      <Text>{` (`}</Text>
                      <Text style={styles.routeDetailHighlight}>
                        {(item.duration / 60).toFixed(0)} phút
                      </Text>
                      <Text>{`)`}</Text>
                    </Text>
                    {/* Thêm biểu tượng hoặc chỉ báo cho tuyến đường chính nếu cần */}
                    {index === 0 && (
                      <Text style={styles.mainRouteIndicator}> (Đề xuất)</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Render Suggestions Overlay outside ScrollView */}
      {activeInput === "start" &&
        suggestions.length > 0 &&
        startInputLayout &&
        panelLayout && (
          <ScrollView
            style={[
              styles.suggestionListAbsoluteOverlay,
              {
                top:
                  startInputLayout.y -
                  panelLayout.y +
                  startInputLayout.height +
                  2,
                left: startInputLayout.x - panelLayout.x,
                width: startInputLayout.width,
              },
            ]}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`s_start_overlay_${item.coords[0]}_${item.coords[1]}_${index}`}
                onPress={() => selectSuggestion(item)}
                style={styles.suggestionItem}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

      {activeInput === "end" &&
        suggestions.length > 0 &&
        endInputLayout &&
        panelLayout && (
          <ScrollView
            style={[
              styles.suggestionListAbsoluteOverlay,
              {
                top:
                  endInputLayout.y - panelLayout.y + endInputLayout.height + 2,
                left: endInputLayout.x - panelLayout.x,
                width: endInputLayout.width,
              },
            ]}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`s_end_overlay_${item.coords[0]}_${item.coords[1]}_${index}`}
                onPress={() => selectSuggestion(item)}
                style={styles.suggestionItem}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

      {/* Route Details Modal */}
      <RouteDetailsModal
        isVisible={isRouteDetailsModalVisible}
        onClose={closeRouteDetailsModal}
        route={selectedRouteDetails}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 4,
    position: "relative",
  },
  scrollContent: {
    paddingBottom: 5,
  },
  inputContainer: {
    marginBottom: 5,
  },
  inputGroup: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    fontSize: 14,
    color: "#333",
  },
  suggestionListAbsoluteOverlay: {
    position: "absolute",
    backgroundColor: "#fff",
    maxHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 2000,
    paddingVertical: 5,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  suggestionText: {
    fontSize: 13,
    color: "#333",
  },
  modeAndCriteriaContainer: {
    flexDirection: "column",
    marginBottom: 10,
    zIndex: 0,
  },
  modeScroll: {
    flexDirection: "row",
    marginBottom: 5,
    paddingVertical: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
  },
  modeScrollContent: {
    flexGrow: 1,
    justifyContent: "center", // Căn giữa nội dung theo chiều ngang
    alignItems: "center", // Căn giữa nội dung theo chiều dọc (nếu có)
  },
  modeButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 3,
  },
  modeButtonSelected: {
    backgroundColor: "#007BFF",
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  modeTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  criteriaScroll: {
    flexDirection: "row",
    paddingVertical: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
  },
  criteriaScrollContent: {
    flexGrow: 1,
    justifyContent: "center", // Căn giữa nội dung theo chiều ngang
    alignItems: "center", // Căn giữa nội dung theo chiều dọc (nếu có)
  },
  criteriaButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 3,
  },
  criteriaButtonSelected: {
    backgroundColor: "#3498db",
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  criteriaText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  criteriaTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  findButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  findButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 5,
    fontSize: 11,
  },
  suggestedRoutesContainer: {
    marginTop: 10,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    overflow: "hidden", // Giữ overflow: hidden để danh sách gợi ý tuyến đường không tràn ra ngoài
    maxHeight: 150,
  },
  suggestedRoutesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    color: "#333",
  },
  suggestedRoutesList: {
    maxHeight: 120,
  },
  suggestedRouteItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  suggestedRouteText: {
    fontSize: 13,
    color: "#555",
  },
  routeDetailHighlight: {
    fontWeight: "bold",
    color: "#007BFF",
  },
  mainRouteIndicator: {
    fontSize: 11,
    color: "#28a745",
    fontWeight: "bold",
    marginLeft: 5,
  },
});

export default RouteFindingPanel;
