import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  LayoutAnimation,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import axios from "axios";
import { transportModes } from "../data/transportModes";
import { MAPBOX_PUBLIC_ACCESS_TOKEN, BACKEND_API_BASE_URL } from "../secrets";
import SimulationConfigModal from "./SimulationConfigModal.web.js";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

const RouteFindingPanel = ({
  onRouteSelected,
  onClearRoute,
  disabled,
  onSimulationApplied,
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
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [isRouteDetailsModalVisible, setIsRouteDetailsModalVisible] =
    useState(false);
  const [isSimulationConfigModalVisible, setIsSimulationConfigModalVisible] =
    useState(false);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null);
  const [routingCriteria] = useState([
    { id: "optimal", name: "Tối ưu" },
    { id: "shortest", name: "Ngắn nhất" },
    { id: "fastest", name: "Nhanh nhất" },
    { id: "least_pollution", name: "Ít ô nhiễm" },
    { id: "emission", name: "Ít phát thải" },
    { id: "healthiest", name: "Sức khỏe" },
  ]);
  const [selectedRoutingCriterionId, setSelectedRoutingCriterionId] =
    useState("optimal");
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isModePanelVisible, setIsModePanelVisible] = useState(false);
  const [isCriteriaPanelVisible, setIsCriteriaPanelVisible] = useState(false);

  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  const debounceTimeout = useRef(null);

  // Filter transport modes based on selected criterion
  const filteredTransportModes = useMemo(() => {
    if (["least_pollution", "emission"].includes(selectedRoutingCriterionId)) {
      return transportModes.filter(
        (item) =>
          item.mapboxProfile !== "walking" && item.mapboxProfile !== "cycling"
      );
    }
    return transportModes;
  }, [selectedRoutingCriterionId]);

  const fetchRoute = useCallback(async () => {
    if (!startCoords || !endCoords) {
      setError("Vui lòng chọn điểm đi và điểm đến.");
      return;
    }

    setLoading(true);
    setError("");
    setAvailableRoutes([]);
    onClearRoute();

    try {
      const maxRoutesToSend =
        selectedRoutingCriterionId === "optimal" ||
        selectedRoutingCriterionId === "healthiest"
          ? 1
          : 3;

      const response = await axios.post(
        `${BACKEND_API_BASE_URL}/find-way`,
        {
          startLon: startCoords[0],
          startLat: startCoords[1],
          endLon: endCoords[0],
          endLat: endCoords[1],
          mode,
          criteria: selectedRoutingCriterionId,
          maxRoutes: maxRoutesToSend,
        },
        {
          timeout: 300000,
        }
      );

      const { routes } = response.data;
      console.log("Fetched routes:", routes);

      if (routes && routes.length > 0) {
        const routesToSet =
          selectedRoutingCriterionId === "optimal" ? [routes[0]] : routes;
        setAvailableRoutes(routesToSet);

        const allRoutesGeoJSON = routesToSet.map((route) => {
          if (selectedRoutingCriterionId === "healthiest") {
            return {
              type: "FeatureCollection",
              features: route.segments.map((segment, index) => ({
                type: "Feature",
                geometry: segment.geometry,
                properties: {
                  routeId: route.id,
                  segmentId: `${route.id}_${index}`,
                  recommendedMode: segment.recommendedMode,
                  length: segment.LENGTH,
                  time: segment.TRAVELTIME,
                  pollution: segment.aqiImpact.pm25,
                  healthScore: segment.healthScore,
                },
              })),
            };
          } else {
            return {
              type: "FeatureCollection",
              features: route.segmentFeatures.map((feature) => ({
                ...feature,
                properties: {
                  ...feature.properties,
                  routeId: route.id,
                },
              })),
            };
          }
        });

        onRouteSelected(
          startCoords,
          endCoords,
          allRoutesGeoJSON,
          routesToSet[0].id
        );
      } else {
        setError("Không tìm thấy tuyến đường phù hợp");
      }
    } catch (error) {
      setError(
        error.response?.data?.error ||
          error.message ||
          "Lỗi khi tìm tuyến đường"
      );
    } finally {
      setLoading(false);
    }
  }, [
    startCoords,
    endCoords,
    mode,
    selectedRoutingCriterionId,
    onClearRoute,
    onRouteSelected,
  ]);

  const selectRoute = useCallback(
    (route) => {
      setSelectedRouteDetails({
        ...route,
        criterionName:
          routingCriteria.find((c) => c.id === selectedRoutingCriterionId)
            ?.name || "Tuyến đường",
      });

      const geoJSONRoutesForMap = availableRoutes.map((r) => {
        if (selectedRoutingCriterionId === "healthiest") {
          return {
            type: "FeatureCollection",
            features: r.segments.map((segment, index) => ({
              type: "Feature",
              geometry: segment.geometry,
              properties: {
                routeId: r.id,
                segmentId: `${r.id}_${index}`,
                recommendedMode: segment.recommendedMode,
                length: segment.LENGTH,
                time: segment.TRAVELTIME,
                pollution: segment.aqiImpact.pm25,
                healthScore: segment.healthScore,
              },
            })),
          };
        } else {
          return {
            type: "FeatureCollection",
            features: r.segmentFeatures.map((feature) => ({
              ...feature,
              properties: {
                ...feature.properties,
                routeId: r.id,
              },
            })),
          };
        }
      });

      console.log(
        "Passing to onRouteSelected from selectRoute:",
        JSON.stringify(geoJSONRoutesForMap, null, 2)
      );

      onRouteSelected(startCoords, endCoords, geoJSONRoutesForMap, route.id);
    },
    [
      availableRoutes,
      startCoords,
      endCoords,
      onRouteSelected,
      routingCriteria,
      selectedRoutingCriterionId,
    ]
  );

  useEffect(() => {
    if (
      startCoords &&
      endCoords &&
      Array.isArray(startCoords) &&
      Array.isArray(endCoords) &&
      startCoords.length === 2 &&
      endCoords.length === 2
    ) {
      fetchRoute();
    } else {
      console.log("Invalid coords, skipping fetch:", startCoords, endCoords);
    }
  }, [startCoords, endCoords, mode, selectedRoutingCriterionId, fetchRoute]);

  // Set default mode to "driving" when "healthiest" criterion is selected
  useEffect(() => {
    if (selectedRoutingCriterionId === "healthiest") {
      setMode("driving");
    }
  }, [selectedRoutingCriterionId]);

  const togglePanelExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPanelExpanded((prev) => !prev);
    setSuggestions([]);
    setActiveInput(null);
    setIsModePanelVisible(false);
    setIsCriteriaPanelVisible(false);
  };

  const handleAutocomplete = async (text, inputType) => {
    if (!text) {
      setSuggestions([]);
      setActiveInput(null);
      return;
    }

    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      try {
        setLoading(true);
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
        setActiveInput(inputType);
        setError("");
      } catch (e) {
        console.error("Autocomplete error:", e);
        setSuggestions([]);
        setError("Không thể lấy gợi ý địa điểm. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleScreenPress = () => {
    if (activeInput) {
      setActiveInput(null);
      setSuggestions([]);
    }
  };

  const selectSuggestion = (place) => {
    console.log("Selected place coords:", place.coords);
    if (activeInput === "start") {
      setStart(place.name);
      setStartCoords(place.coords);
      console.log("Selected start coords:", place.coords);
    } else {
      setEnd(place.name);
      setEndCoords(place.coords);
      console.log("Selected end coords:", place.coords);
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const currentModeLabel =
    filteredTransportModes.find((item) => item.mapboxProfile === mode)?.label ||
    "Xe hơi";
  const currentCriterionName = routingCriteria.find(
    (criterion) => criterion.id === selectedRoutingCriterionId
  )?.name;

  return (
    <View
      style={[
        styles.container,
        !isPanelExpanded ? styles.containerCollapsedStyleForHandleOnly : {},
      ]}
    >
      {isPanelExpanded ? (
        <TouchableWithoutFeedback onPress={handleScreenPress}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.inputContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.title}>WayGenie 🚀</Text>
                <TextInput
                  ref={startInputRef}
                  style={styles.input}
                  placeholder="📍 Điểm đi"
                  value={start}
                  onChangeText={(text) => {
                    setStart(text);
                    handleAutocomplete(text, "start");
                  }}
                  onFocus={() => {
                    setIsModePanelVisible(false);
                    setIsCriteriaPanelVisible(false);
                  }}
                  placeholderTextColor="#888"
                />
                {activeInput === "start" && suggestions.length > 0 && (
                  <ScrollView
                    style={styles.suggestionListRelative}
                    keyboardShouldPersistTaps="handled"
                  >
                    {suggestions.map((item, index) => (
                      <TouchableOpacity
                        key={`s_start_${item.coords[0]}_${item.coords[1]}_${index}`}
                        onPress={() => selectSuggestion(item)}
                        style={styles.suggestionItem}
                      >
                        <Text style={styles.suggestionText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  ref={endInputRef}
                  style={styles.input}
                  placeholder="🏁 Điểm đến"
                  value={end}
                  onChangeText={(text) => {
                    setEnd(text);
                    handleAutocomplete(text, "end");
                  }}
                  onFocus={() => {
                    setIsModePanelVisible(false);
                    setIsCriteriaPanelVisible(false);
                  }}
                  placeholderTextColor="#888"
                />
                {activeInput === "end" && suggestions.length > 0 && (
                  <ScrollView
                    style={styles.suggestionListRelative}
                    keyboardShouldPersistTaps="handled"
                  >
                    {suggestions.map((item, index) => (
                      <TouchableOpacity
                        key={`s_end_${item.coords[0]}_${item.coords[1]}_${index}`}
                        onPress={() => selectSuggestion(item)}
                        style={styles.suggestionItem}
                      >
                        <Text style={styles.suggestionText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
            <View style={styles.modeAndCriteriaContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  Platform.OS === "web" && styles.webCursorPointer,
                ]}
                onPress={() => {
                  setSuggestions([]);
                  setActiveInput(null);
                  setIsCriteriaPanelVisible(true);
                }}
              >
                <Text style={styles.actionButtonText}>
                  Tiêu chí: {currentCriterionName}
                </Text>
                <Ionicons name="options" size={18} color="#1976d2" />
              </TouchableOpacity>
              {selectedRoutingCriterionId !== "healthiest" && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    Platform.OS === "web" && styles.webCursorPointer,
                  ]}
                  onPress={() => {
                    setSuggestions([]);
                    setActiveInput(null);
                    setIsModePanelVisible(true);
                  }}
                >
                  <Text style={styles.actionButtonText}>
                    Chế độ: {currentModeLabel}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  Platform.OS === "web" && styles.webCursorPointer,
                ]}
                onPress={() => {
                  setIsSimulationConfigModalVisible(true);
                }}
              >
                <Ionicons name="settings" size={18} color="#1976d2" />
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {availableRoutes.length > 0 && (
              <View style={styles.suggestedRoutesContainer}>
                <Text style={styles.suggestedRoutesTitle}>
                  {selectedRoutingCriterionId === "optimal"
                    ? "Tuyến đường Tối ưu:"
                    : "Các Lộ trình Gợi ý:"}
                </Text>
                <ScrollView
                  style={styles.suggestedRoutesList}
                  nestedScrollEnabled
                >
                  {availableRoutes.map((route, index) => (
                    <TouchableOpacity
                      key={`route-${route.id}-${index}`}
                      style={[
                        styles.suggestedRouteItem,
                        Platform.OS === "web" && styles.webCursorPointer,
                      ]}
                      onPress={() => selectRoute(route)}
                    >
                      <Text style={styles.suggestedRouteText}>
                        <Text style={{ color: "#000000" }}>{`Lộ trình ${
                          index + 1
                        }: `}</Text>
                        <Text style={styles.routeDetailHighlight}>
                          {route.metrics.distance.toFixed(2)} km
                        </Text>
                        <Text>{` (`}</Text>
                        <Text style={styles.routeDetailHighlight}>
                          {Math.round(route.metrics.time)} phút
                        </Text>
                        <Text>{`)`}</Text>
                        {selectedRoutingCriterionId === "healthiest" && (
                          <Text style={styles.routeDetailHighlight}>
                            {` Phương tiện: ${route.properties.recommendedModes.join(
                              ", "
                            )}`}
                          </Text>
                        )}
                      </Text>
                      <Text style={styles.routeScoreText}>
                        {selectedRoutingCriterionId === "least_pollution" && (
                          <Text>{`Ô nhiễm: ${route.metrics.pollution.toFixed(
                            2
                          )} µg/m³`}</Text>
                        )}
                        {selectedRoutingCriterionId === "emission" && (
                          <Text>{`Phát thải: ${route.metrics.emission.toFixed(
                            2
                          )} g`}</Text>
                        )}
                        {selectedRoutingCriterionId === "healthiest" && (
                          <Text>{`Sức khỏe: ${route.metrics.health.toFixed(
                            2
                          )}`}</Text>
                        )}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      ) : null}
      <TouchableOpacity
        style={[
          styles.collapseHandle,
          !isPanelExpanded && styles.collapseHandleCollapsed,
        ]}
        onPress={togglePanelExpanded}
      >
        {loading ? (
          <ActivityIndicator size="small" color="rgba(0, 157, 255, 0.76)" />
        ) : (
          <Ionicons
            name={isPanelExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#1976d2"
          />
        )}
      </TouchableOpacity>

      {/* SimulationConfigModal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isSimulationConfigModalVisible}
        onRequestClose={() => setIsSimulationConfigModalVisible(false)}
      >
        <View style={styles.panelOverlay}>
          <View
            style={[styles.panelConfig]}
            onStartShouldSetResponder={() => true}
          >
            <SimulationConfigModal
              isVisible={isSimulationConfigModalVisible}
              onClose={() => setIsSimulationConfigModalVisible(false)}
              onSimulationApplied={onSimulationApplied}
            />
          </View>
        </View>
      </Modal>

      {/* Mode Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModePanelVisible}
        onRequestClose={() => setIsModePanelVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModePanelVisible(false)}>
          <View style={styles.panelOverlay}>
            <View
              style={[styles.panelContent]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Chọn Chế độ Di chuyển</Text>
                <TouchableOpacity
                  onPress={() => setIsModePanelVisible(false)}
                  style={[
                    styles.panelCloseButton,
                    Platform.OS === "web" && styles.webCursorPointer,
                  ]}
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.panelScrollView}>
                {filteredTransportModes.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.panelItem,
                      Platform.OS === "web" && styles.webCursorPointer,
                    ]}
                    onPress={() => {
                      setMode(item.mapboxProfile);
                      setIsModePanelVisible(false);
                    }}
                  >
                    <Text style={styles.panelItemText}>{item.label}</Text>
                    {mode === item.mapboxProfile && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#1976d2"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Criteria Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isCriteriaPanelVisible}
        onRequestClose={() => setIsCriteriaPanelVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsCriteriaPanelVisible(false)}
        >
          <View style={styles.panelOverlay}>
            <View
              style={[styles.panelContent]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Chọn Tiêu chí Định tuyến</Text>
                <TouchableOpacity
                  onPress={() => setIsCriteriaPanelVisible(false)}
                  style={[
                    styles.panelCloseButton,
                    Platform.OS === "web" && styles.webCursorPointer,
                  ]}
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.panelScrollView}>
                {routingCriteria.map((criterion) => (
                  <TouchableOpacity
                    key={criterion.id}
                    style={[styles.panelItem]}
                    onPress={() => {
                      setSelectedRoutingCriterionId(criterion.id);
                      setIsCriteriaPanelVisible(false);
                    }}
                  >
                    <Text style={styles.panelItemText}>{criterion.name}</Text>
                    {selectedRoutingCriterionId === criterion.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#1976d2"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    width: SCREEN_WIDTH * 0.25,
    maxHeight: SCREEN_HEIGHT * 0.8,
    maxWidth: SCREEN_WIDTH * 0.25,
    overflow: "hidden",
    zIndex: 1,
  },
  containerCollapsedStyleForHandleOnly: {
    padding: 0,
    height: 40,
    width: 60,
    alignSelf: "flex-end",
    overflow: "visible",
    backgroundColor: "transparent",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { flexGrow: 1, paddingBottom: 5 },
  inputContainer: { marginBottom: 10 },
  inputGroup: { marginBottom: 5, position: "relative" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  input: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  suggestionListRelative: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 175,
    zIndex: 2000,
    marginTop: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: { fontSize: 16, color: "#444" },
  modeAndCriteriaContainer: {
    flexDirection: "row",
    flexWrap: "no-wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f9fb",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#a7d9ee",
    marginRight: 5,
    marginBottom: 5,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#1976d2",
    marginRight: 5,
    fontWeight: "600",
  },
  errorText: { color: "red", marginTop: 10, textAlign: "center" },
  suggestedRoutesContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  suggestedRoutesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  suggestedRoutesList: {
    borderColor: "#eee",
    borderWidth: 1,
    borderRadius: 8,
  },
  suggestedRouteItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  suggestedRouteText: { fontSize: 14, color: "#555" },
  routeDetailHighlight: { fontWeight: "bold", color: "#1976d2" },
  routeScoreText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    fontStyle: "italic",
  },
  collapseHandle: {
    position: "relative",
    alignSelf: "center",
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  collapseHandleCollapsed: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    alignSelf: "flex-end",
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  panelOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panelConfig: {
    width: SCREEN_WIDTH * 0.5,
    borderRadius: 15,
    maxHeight: SCREEN_HEIGHT * 0.7,
    overflow: "hidden",
    paddingBottom: 10,
  },
  panelContent: {
    width: SCREEN_WIDTH * 0.5,
    backgroundColor: "white",
    borderRadius: 15,
    maxHeight: SCREEN_HEIGHT * 0.7,
    overflow: "hidden",
    paddingBottom: 10,
  },
  webModalContentOverride: Platform.select({
    web: {
      position: "relative",
      maxWidth: 400,
      width: "auto",
    },
  }),
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  panelTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  panelCloseButton: { padding: 5 },
  panelScrollView: { flexGrow: 0 },
  panelItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  panelItemText: { fontSize: 16, color: "#333" },
  webCursorPointer: Platform.select({
    web: {
      cursor: "pointer",
    },
  }),
});

export default RouteFindingPanel;
