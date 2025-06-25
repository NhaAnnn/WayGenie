import React, { useState, useEffect, useRef } from "react";
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
  TouchableWithoutFeedback,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import axios from "axios";
import { transportModes } from "../data/transportModes";
import { MAPBOX_PUBLIC_ACCESS_TOKEN, BACKEND_API_BASE_URL } from "../secrets";
import RouteDetailsModal from "./RouteDetailsModal";
import { Ionicons } from "@expo/vector-icons";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const DEFAULT_HANOI_COORDS = [105.8342, 21.0278]; // [lon, lat]
const HANOI_BOUNDS = {
  minLon: 105.6,
  maxLon: 106.0,
  minLat: 20.8,
  maxLat: 21.2,
}; // Phạm vi Hà Nội (có thể điều chỉnh)

const RouteFindingPanel = ({
  onRouteSelected,
  onClearRoute,
  allCoordinates,
  disabled,
}) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState("driving");
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestedRoutes, setSuggestedRoutes] = useState([]);
  const [isRouteDetailsModalVisible, setIsRouteDetailsModalVisible] =
    useState(false);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null);
  const [hasPerformedInitialSearch, setHasPerformedInitialSearch] =
    useState(false);
  const [routingCriteria] = useState([
    { id: "fastest", name: "Nhanh nhất" },
    { id: "shortest", name: "Ngắn nhất" },
    { id: "least_traffic", name: "Ít tắc đường" },
    { id: "least_polluted", name: "Ít ô nhiễm" },
    { id: "least_emission", name: "Ít gây ô nhiễm" },
  ]);
  const [selectedRoutingCriterionId, setSelectedRoutingCriterionId] =
    useState("fastest");
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const [startInputLayout, setStartInputLayout] = useState(null);
  const [endInputLayout, setEndInputLayout] = useState(null);
  const [panelLayout, setPanelLayout] = useState(null);

  const debouncedStartText = useDebounce(start, 300);
  const debouncedEndText = useDebounce(end, 300);

  // Map default Hanoi coordinates to nearest node
  useEffect(() => {
    if (!startCoords && start === "" && allCoordinates?.length > 0) {
      const { node, distance } = findNearestNode(DEFAULT_HANOI_COORDS);
      if (node) {
        setStartCoords([
          node.location.coordinates[0],
          node.location.coordinates[1],
        ]);
        setStart("Hà Nội (Mặc định)");
        console.log(
          "RouteFindingPanel: Đặt điểm bắt đầu mặc định cho Hà Nội tại nút gần nhất:",
          node.node_id,
          "Khoảng cách:",
          distance.toFixed(2),
          "m"
        );
      } else {
        setStartCoords(DEFAULT_HANOI_COORDS);
        setStart("Hà Nội (Mặc định)");
        setError("Không tìm thấy nút gần trong cơ sở dữ liệu cho Hà Nội.");
      }
    }
  }, [startCoords, start, allCoordinates]);

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

  useEffect(() => {
    if (hasPerformedInitialSearch && startCoords && endCoords) {
      console.log(
        "RouteFindingPanel: Chế độ hoặc tiêu chí thay đổi, đang tìm lại tuyến đường."
      );
      fetchRoute();
    }
  }, [
    mode,
    selectedRoutingCriterionId,
    hasPerformedInitialSearch,
    startCoords,
    endCoords,
  ]);

  const togglePanelExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPanelExpanded((prev) => !prev);
    Keyboard.dismiss();
    setSuggestions([]);
    setActiveInput(null);
  };

  const haversineDistance = (coords1, coords2) => {
    const R = 6371e3; // Bán kính Trái Đất (mét)
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
    return R * c; // Khoảng cách tính bằng mét
  };

  const findNearestNode = (coords) => {
    if (!allCoordinates || allCoordinates.length === 0 || !coords) {
      return { node: null, distance: Infinity };
    }
    let nearestNode = null;
    let minDistance = Infinity;

    allCoordinates.forEach((node) => {
      const nodeCoords = [
        node.location.coordinates[0],
        node.location.coordinates[1],
      ];
      const distance = haversineDistance(coords, nodeCoords);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    });

    console.log(
      `findNearestNode: Tìm thấy nút gần nhất ${
        nearestNode?.node_id
      } cách ${minDistance.toFixed(2)}m từ ${coords}`
    );
    return { node: nearestNode, distance: minDistance };
  };

  const isWithinHanoi = (coords) => {
    const [lon, lat] = coords;
    return (
      lon >= HANOI_BOUNDS.minLon &&
      lon <= HANOI_BOUNDS.maxLon &&
      lat >= HANOI_BOUNDS.minLat &&
      lat <= HANOI_BOUNDS.maxLat
    );
  };

  const handleAutocomplete = async (text, inputType) => {
    if (!text) {
      setSuggestions([]);
      return;
    }
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
        coords: [feature.center[0], feature.center[1]],
      }));
      setSuggestions(hits);
      setError("");
    } catch (e) {
      console.error(
        "RouteFindingPanel: Lỗi Mapbox Autocomplete:",
        e.response ? e.response.data : e.message
      );
      setSuggestions([]);
      setError("Không thể lấy gợi ý địa điểm. Vui lòng thử lại.");
    }
  };

  const selectSuggestion = (place) => {
    Keyboard.dismiss();
    const { node, distance } = findNearestNode(place.coords);
    const nearestCoords = node
      ? [node.location.coordinates[0], node.location.coordinates[1]]
      : place.coords;
    if (activeInput === "start") {
      setStart(place.name);
      setStartCoords(nearestCoords);
      console.log(
        "RouteFindingPanel: Điểm đi đã chọn:",
        place.name,
        "Tọa độ Mapbox:",
        place.coords,
        "Tọa độ nút gần nhất:",
        nearestCoords,
        "Khoảng cách:",
        distance.toFixed(2),
        "m"
      );
    } else {
      setEnd(place.name);
      setEndCoords(nearestCoords);
      console.log(
        "RouteFindingPanel: Điểm đến đã chọn:",
        place.name,
        "Tọa độ Mapbox:",
        place.coords,
        "Tọa độ nút gần nhất:",
        nearestCoords,
        "Khoảng cách:",
        distance.toFixed(2),
        "m"
      );
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const mapRoutingCriterionToWeights = (criterionId) => {
    const weightsMap = {
      fastest: {
        timeWeight: 0.7,
        distanceWeight: 0.1,
        trafficWeight: 0.15,
        pollutionWeight: 0.05,
        emissionWeight: 0.0,
      },
      shortest: {
        timeWeight: 0.1,
        distanceWeight: 0.7,
        trafficWeight: 0.15,
        pollutionWeight: 0.05,
        emissionWeight: 0.0,
      },
      least_traffic: {
        timeWeight: 0.15,
        distanceWeight: 0.1,
        trafficWeight: 0.7,
        pollutionWeight: 0.05,
        emissionWeight: 0.0,
      },
      least_polluted: {
        timeWeight: 0.15,
        distanceWeight: 0.1,
        trafficWeight: 0.15,
        pollutionWeight: 0.6,
        emissionWeight: 0.0,
      },
      least_emission: {
        timeWeight: 0.1,
        distanceWeight: 0.5,
        trafficWeight: 0.1,
        pollutionWeight: 0.05,
        emissionWeight: 0.25,
      },
    };
    return weightsMap[criterionId] || weightsMap["fastest"];
  };

  const fetchRoute = async () => {
    if (!startCoords || !endCoords) {
      setError("Vui lòng chọn điểm đi và điểm đến.");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestedRoutes([]);
    onClearRoute();

    try {
      // Tạm thời chỉ sử dụng backend cho mọi trường hợp (vô hiệu hóa Mapbox)
      const { node: startNode } = findNearestNode(startCoords);
      const { node: endNode } = findNearestNode(endCoords);

      if (!startNode || !endNode) {
        setError(
          "Không tìm thấy nút gần trong cơ sở dữ liệu cho một trong hai điểm."
        );
        setLoading(false);
        return;
      }

      const startNodeCoords = [
        startNode.location.coordinates[0],
        startNode.location.coordinates[1],
      ];
      const endNodeCoords = [
        endNode.location.coordinates[0],
        endNode.location.coordinates[1],
      ];

      const distanceBetweenNodes = haversineDistance(
        startNodeCoords,
        endNodeCoords
      );
      if (distanceBetweenNodes < 10) {
        setError(
          "Điểm đi và điểm đến quá gần nhau hoặc trùng nhau. Vui lòng chọn địa điểm khác."
        );
        setLoading(false);
        return;
      }

      console.log(
        "RouteFindingPanel: Sử dụng Backend API... startNode:",
        startNode.node_id,
        "endNode:",
        endNode.node_id
      );
      const backendRes = await axios.post(
        `${BACKEND_API_BASE_URL}/find-route`,
        {
          startLon: startNodeCoords[0],
          startLat: startNodeCoords[1],
          endLon: endNodeCoords[0],
          endLat: endNodeCoords[1],
          mode,
          criteriaWeights: mapRoutingCriterionToWeights(
            selectedRoutingCriterionId
          ),
        }
      );
      console.log("Backend response data:", backendRes.data);

      let selectedRouteGeoJSONs = [];
      if (backendRes.data?.selectedRoute?.geoJSONs?.length > 0) {
        selectedRouteGeoJSONs = backendRes.data.selectedRoute.geoJSONs;
        const routes = [
          {
            geometry: selectedRouteGeoJSONs[0],
            duration: backendRes.data.selectedRoute.totalDuration,
            distance: backendRes.data.selectedRoute.totalDistance,
            isBackendRoute: true,
            backendCriteriaType: backendRes.data.selectedRoute.criteriaType,
            geoJSONs: backendRes.data.selectedRoute.geoJSONs,
          },
          ...backendRes.data.alternativeRoutes.map((route) => ({
            geometry: route.geoJSONs[0] || {
              type: "Feature",
              geometry: null,
            },
            duration: route.totalDuration,
            distance: route.totalDistance,
            isBackendRoute: true,
            backendCriteriaType: route.criteriaType,
            geoJSONs: route.geoJSONs,
          })),
        ];
        setSuggestedRoutes(routes);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setHasPerformedInitialSearch(true);
        onRouteSelected(startNodeCoords, endNodeCoords, selectedRouteGeoJSONs);
      } else {
        setError(
          backendRes.data?.msg ||
            "Không tìm thấy tuyến đường từ backend. Kiểm tra dữ liệu nút hoặc chế độ."
        );
      }
    } catch (error) {
      console.error(
        "RouteFindingPanel: Lỗi API:",
        error.response ? error.response.status : error.message
      );
      setError(
        `Không thể lấy dữ liệu tuyến đường: ${
          error.response?.data?.msg || error.message
        }.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFindRoute = () => {
    if (!startCoords || !endCoords) {
      Alert.alert("Thông báo", "Vui lòng chọn điểm đi và điểm đến từ gợi ý.");
      return;
    }
    fetchRoute();
  };

  const showRouteDetails = (route) => {
    setSelectedRouteDetails({
      ...route,
      criteriaName: route.isBackendRoute
        ? route.backendCriteriaType
        : routingCriteria.find((c) => c.id === selectedRoutingCriterionId)
            ?.name,
    });
    setIsRouteDetailsModalVisible(true);
  };

  const closeRouteDetailsModal = () => {
    setIsRouteDetailsModalVisible(false);
    setSelectedRouteDetails(null);
  };

  const onPanelLayout = (event) => {
    setPanelLayout(event.nativeEvent.layout);
  };

  const getAbsoluteLayout = (ref) => {
    return new Promise((resolve) => {
      if (ref.current) {
        ref.current.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      } else {
        resolve(null);
      }
    });
  };

  const handleScreenPress = () => {
    if (activeInput) {
      Keyboard.dismiss();
      setActiveInput(null);
      setSuggestions([]);
    }
  };

  return (
    <View
      style={[styles.container, !isPanelExpanded && styles.containerCollapsed]}
      onLayout={onPanelLayout}
    >
      <TouchableWithoutFeedback onPress={handleScreenPress}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
              <TextInput
                ref={startInputRef}
                style={styles.input}
                placeholder="📍 Điểm đi"
                value={start}
                onChangeText={setStart}
                onFocus={async () => {
                  setActiveInput("start");
                  setSuggestions([]);
                  const layout = await getAbsoluteLayout(startInputRef);
                  setStartInputLayout(layout);
                  if (!isPanelExpanded) {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut
                    );
                    setIsPanelExpanded(true);
                  }
                }}
                onBlur={() => {}}
                placeholderTextColor="#888"
              />
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                ref={endInputRef}
                style={styles.input}
                placeholder="🏁 Điểm đến"
                value={end}
                onChangeText={setEnd}
                onFocus={async () => {
                  setActiveInput("end");
                  setSuggestions([]);
                  const layout = await getAbsoluteLayout(endInputRef);
                  setEndInputLayout(layout);
                  if (!isPanelExpanded) {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut
                    );
                    setIsPanelExpanded(true);
                  }
                }}
                onBlur={() => {}}
                placeholderTextColor="#888"
              />
            </View>
          </View>

          {hasPerformedInitialSearch && isPanelExpanded && (
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
                      styles.criteriaButton,
                      selectedRoutingCriterionId === criterion.id
                        ? styles.criteriaButtonSelected
                        : {},
                    ]}
                    onPress={() => setSelectedRoutingCriterionId(criterion.id)}
                  >
                    <Text
                      style={[
                        styles.criteriaText,
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

          {isPanelExpanded && (
            <TouchableOpacity
              style={styles.findButton}
              onPress={handleFindRoute}
              disabled={loading || disabled}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="search" size={16} color="#fff" />
                  <Text style={styles.findButtonText}>Tìm đường</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {isPanelExpanded && error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {suggestedRoutes.length > 0 && isPanelExpanded && (
            <View style={styles.suggestedRoutesContainer}>
              <Text style={styles.suggestedRoutesTitle}>
                Các Lộ trình Gợi ý:
              </Text>
              <ScrollView
                style={styles.suggestedRoutesList}
                nestedScrollEnabled
              >
                {suggestedRoutes.map((item, index) => (
                  <TouchableOpacity
                    key={`route-${index}`}
                    style={styles.suggestedRouteItem}
                    onPress={() => {
                      showRouteDetails(item);
                      onRouteSelected(
                        startCoords,
                        endCoords,
                        item.isBackendRoute ? item.geoJSONs : [item.geometry]
                      );
                    }}
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
                    {item.isBackendRoute && (
                      <Text style={styles.mainRouteIndicator}>
                        {" "}
                        ({item.backendCriteriaType})
                      </Text>
                    )}
                    {!item.isBackendRoute && index === 0 && (
                      <Text style={styles.mainRouteIndicator}> (Đề xuất)</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

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

      <TouchableOpacity
        style={styles.collapseHandle}
        onPress={togglePanelExpanded}
      >
        <Ionicons
          name={isPanelExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#1976d2"
        />
      </TouchableOpacity>

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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    marginHorizontal: 10,
    marginTop: 40,
    maxHeight: "90%",
    overflow: "hidden",
  },
  containerCollapsed: {
    maxHeight: "5%",
    maxWidth: "20%",
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
  },
  modeScroll: {
    flexDirection: "row",
    marginBottom: 5,
    paddingVertical: 5,
    backgroundColor: "#e3f2fd",
    borderRadius: 10,
  },
  modeScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modeButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 3,
  },
  modeButtonSelected: {
    backgroundColor: "#1976d2",
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontSize: 11,
    color: "#1976d2",
    fontWeight: "500",
  },
  modeTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  criteriaScroll: {
    flexDirection: "row",
    paddingVertical: 5,
    backgroundColor: "#e3f2fd",
    borderRadius: 10,
  },
  criteriaScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  criteriaButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 3,
  },
  criteriaButtonSelected: {
    backgroundColor: "#1976d2",
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  criteriaText: {
    fontSize: 11,
    color: "#1976d2",
    fontWeight: "500",
  },
  criteriaTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  findButton: {
    backgroundColor: "#1976d2",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 8,
  },
  findButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 6,
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
    overflow: "hidden",
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
  collapseHandle: {
    height: 20,
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderTopColor: "#e0e0e0",
  },
});

export default RouteFindingPanel;
