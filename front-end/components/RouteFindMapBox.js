import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
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
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../secrets";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const RouteFindingPanel = ({
  onRouteSelected,
  onClearRoute,
  disabled,
  supportedCriteria,
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
  const [isModePanelVisible, setIsModePanelVisible] = useState(false);
  const [isCriteriaPanelVisible, setIsCriteriaPanelVisible] = useState(false);
  const [selectedRoutingCriterionId, setSelectedRoutingCriterionId] = useState(
    supportedCriteria[0] || "fastest"
  );
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  const debounceTimeout = useRef(null);

  const routingCriteria = useMemo(
    () =>
      supportedCriteria.map((id) => ({
        id,
        name:
          {
            fastest: "Nhanh nhất",
            shortest: "Ngắn nhất",
            least_pollution: "Ít ô nhiễm",
            emission: "Ít phát thải",
          }[id] || id,
      })),
    [supportedCriteria]
  );

  const calculateEmissions = useCallback((distance, transportMode) => {
    const distanceKm = distance / 1000;
    const emissionFactors = {
      driving: 170,
      walking: 0,
      cycling: 0,
      "driving-traffic": 200,
      transit: 90,
    };
    return (distanceKm * (emissionFactors[transportMode] || 150)).toFixed(2);
  }, []);

  const sortRoutesByPreference = useCallback((routes, preference) => {
    if (!routes || routes.length === 0) return routes;

    const sortedRoutes = [...routes];

    switch (preference) {
      case "fastest":
        sortedRoutes.sort((a, b) => a.metrics.time - b.metrics.time);
        break;
      case "shortest":
        sortedRoutes.sort((a, b) => a.metrics.distance - b.metrics.distance);
        break;
      case "emission":
        sortedRoutes.sort((a, b) => a.metrics.emission - b.metrics.emission);
        break;
      case "least_pollution":
        sortedRoutes.sort((a, b) => a.metrics.pollution - b.metrics.pollution);
        break;
      default:
        break;
    }

    return sortedRoutes;
  }, []);

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
      const startLonLat = `${startCoords[0]},${startCoords[1]}`;
      const endLonLat = `${endCoords[0]},${endCoords[1]}`;

      let additionalParams = {};
      if (mode === "driving" || mode === "driving-traffic") {
        additionalParams = {
          annotations: "congestion",
          overview: "full",
        };
      }

      const res = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${mode}/${startLonLat};${endLonLat}`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            geometries: "geojson",
            steps: false,
            alternatives: true,
            language: "vi",
            ...additionalParams,
          },
          timeout: 300000,
        }
      );

      if (res.data.routes && res.data.routes.length > 0) {
        const routes = res.data.routes.map((route, index) => {
          const pollution = route.congestion
            ? route.congestion.reduce((sum, c) => sum + (c.numeric || 0), 0) /
              route.congestion.length
            : 0;

          return {
            id: `route-${index}`,
            segmentFeatures: [
              {
                type: "Feature",
                geometry: route.geometry,
                properties: {
                  routeId: `route-${index}`,
                },
              },
            ],
            metrics: {
              distance: route.distance / 1000,
              time: route.duration / 60,
              emission: parseFloat(calculateEmissions(route.distance, mode)),
              pollution: pollution,
            },
          };
        });

        const sortedRoutes = sortRoutesByPreference(
          routes,
          selectedRoutingCriterionId
        );
        setAvailableRoutes(sortedRoutes);

        const allRoutesGeoJSON = sortedRoutes.map((route) => ({
          type: "FeatureCollection",
          features: route.segmentFeatures.map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              routeId: route.id,
            },
          })),
        }));

        onRouteSelected(
          startCoords,
          endCoords,
          allRoutesGeoJSON,
          sortedRoutes[0].id
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
    calculateEmissions,
    sortRoutesByPreference,
  ]);

  const selectRoute = useCallback(
    (route) => {
      const geoJSONRoutesForMap = availableRoutes.map((r) => ({
        type: "FeatureCollection",
        features: r.segmentFeatures.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            routeId: r.id,
          },
        })),
      }));

      onRouteSelected(startCoords, endCoords, geoJSONRoutesForMap, route.id);
    },
    [availableRoutes, startCoords, endCoords, onRouteSelected]
  );

  useEffect(() => {
    if (startCoords && endCoords) {
      fetchRoute();
    }
  }, [startCoords, endCoords, mode, selectedRoutingCriterionId, fetchRoute]);

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

  const currentModeLabel = transportModes.find(
    (item) => item.mapboxProfile === mode
  )?.label;
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
                <TextInput
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
                  editable={!disabled}
                />
                {activeInput === "start" && suggestions.length > 0 && (
                  <ScrollView
                    style={styles.suggestionListRelative}
                    keyboardShouldPersistTaps="handled"
                  >
                    {suggestions.map((item, index) => (
                      <TouchableOpacity
                        key={`s_start_${index}`}
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
                  editable={!disabled}
                />
                {activeInput === "end" && suggestions.length > 0 && (
                  <ScrollView
                    style={styles.suggestionListRelative}
                    keyboardShouldPersistTaps="handled"
                  >
                    {suggestions.map((item, index) => (
                      <TouchableOpacity
                        key={`s_end_${index}`}
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
                  setIsModePanelVisible(true);
                }}
                disabled={disabled}
              >
                <Text style={styles.actionButtonText}>
                  Chế độ: {currentModeLabel}
                </Text>
              </TouchableOpacity>
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
                disabled={disabled}
              >
                <Text style={styles.actionButtonText}>
                  Tiêu chí: {currentCriterionName}
                </Text>
                <Ionicons name="options" size={18} color="#1976d2" />
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {availableRoutes.length > 0 && (
              <View style={styles.suggestedRoutesContainer}>
                <Text style={styles.suggestedRoutesTitle}>
                  Các Lộ trình Gợi ý:
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
                      disabled={disabled}
                    >
                      <Text style={styles.suggestedRouteText}>
                        <Text>{`Lộ trình ${index + 1}: `}</Text>
                        <Text style={styles.routeDetailHighlight}>
                          {route.metrics.distance.toFixed(2)} km
                        </Text>
                        <Text>{` (`}</Text>
                        <Text style={styles.routeDetailHighlight}>
                          {Math.round(route.metrics.time)} phút
                        </Text>
                        <Text>{`)`}</Text>
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
        disabled={disabled}
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
                {transportModes.map((item) => (
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
    maxHeight: SCREEN_HEIGHT * 0.8,
    overflow: "hidden",
    zIndex: 1,
    width: SCREEN_WIDTH > 768 ? 350 : SCREEN_WIDTH * 0.9,
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
    fontSize: 12,
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
  panelContent: {
    width: SCREEN_WIDTH * 0.5,
    backgroundColor: "white",
    borderRadius: 15,
    maxHeight: SCREEN_HEIGHT * 0.7,
    overflow: "hidden",
    paddingBottom: 10,
  },
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
