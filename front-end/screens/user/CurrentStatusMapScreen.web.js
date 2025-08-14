import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  SafeAreaView,
  Modal,
  TouchableWithoutFeedback,
  LayoutAnimation,
} from "react-native";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { transportModes } from "../../data/transportCurrentModel";
import {
  MAPBOX_PUBLIC_ACCESS_TOKEN,
  BACKEND_API_BASE_URL,
} from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AIR_QUALITY_API_URL = `${BACKEND_API_BASE_URL}/aqis`;

export default function CurrentStatusMapScreen({ navigation }) {
  const { user } = useAuth();
  const userId = user?.id;

  // State for addresses and coordinates
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  // State for routes and selection
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [mode, setMode] = useState("driving");
  const [routePreference, setRoutePreference] = useState("fastest");

  // UI state
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModePanelVisible, setIsModePanelVisible] = useState(false);
  const [isCriteriaPanelVisible, setIsCriteriaPanelVisible] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // State for data layers
  const [layersVisibility, setLayersVisibility] = useState({
    traffic: true,
    airQuality: true,
    coordinates: true,
  });

  const [isError, setIsError] = useState(false);
  const SEARCH_ROUTE_API_URL = `${BACKEND_API_BASE_URL}/search-route`;

  const debounceTimeout = useRef(null);

  // Route preference options
  const routePreferences = [
    { id: "fastest", label: "Nhanh nhất", icon: "rocket" },
    { id: "shortest", label: "Ngắn nhất", icon: "resize" },
    { id: "eco", label: "Ít ô nhiễm", icon: "leaf" },
    { id: "least_emission", label: "Ít phát thải", icon: "cloud" },
  ];

  // Fetch route when mode or preference changes
  useEffect(() => {
    if (startCoords && endCoords && userId) {
      fetchRoute();
    }
  }, [mode, routePreference, startCoords, endCoords, userId]);

  // Handle address autocomplete
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
          coords: [feature.center[1], feature.center[0]],
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

  // Select a suggested address
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

  // Calculate emissions for a route
  const calculateEmissions = useCallback((distance, transportMode) => {
    const distanceKm = distance / 1000;
    const emissionFactors = {
      driving: 170,
      walking: 0,
      cycling: 0,
      "driving-traffic": 200,
      transit: 90,
    };
    return (distanceKm * (emissionFactors[transportMode] || 150)).toFixed(0);
  }, []);

  // Calculate average coordinates of a route
  const calculateAverageCoords = useCallback((geometry) => {
    if (!geometry || !geometry.coordinates || !geometry.coordinates.length) {
      return [0, 0];
    }
    const coords = geometry.coordinates;
    const avgLat =
      coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
    const avgLon =
      coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
    return [avgLon, avgLat];
  }, []);

  // Fetch air quality data for a given coordinate
  const fetchAirQuality = async (lon, lat) => {
    try {
      const res = await axios.get(AIR_QUALITY_API_URL, {
        params: {
          stationName: "", // Không lọc theo stationName để lấy tất cả
        },
      });
      const aqisRecords = res.data;
      if (!aqisRecords || aqisRecords.length === 0) {
        return { pm25: 0 };
      }

      // Tìm trạm gần nhất dựa trên khoảng cách Euclidean
      let nearestStation = null;
      let minDistance = Infinity;
      aqisRecords.forEach((record) => {
        if (record.location && record.location.coordinates) {
          const [stationLon, stationLat] = record.location.coordinates;
          const distance = Math.sqrt(
            Math.pow(stationLon - lon, 2) + Math.pow(stationLat - lat, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestStation = record;
          }
        }
      });
      return nearestStation ? { pm25: nearestStation.pm25 || 0 } : { pm25: 0 };
    } catch (error) {
      console.error("Error fetching air quality data:", error);
      return { pm25: 0 };
    }
  };

  // Sort routes by preference
  const sortRoutesByPreference = useCallback((routes, preference) => {
    if (!routes || routes.length === 0) return routes;
    const sortedRoutes = [...routes];
    switch (preference) {
      case "fastest":
        sortedRoutes.sort((a, b) => a.duration - b.duration);
        break;
      case "shortest":
        sortedRoutes.sort((a, b) => a.distance - b.distance);
        break;
      case "eco":
        sortedRoutes.sort((a, b) => (a.pollution || 0) - (b.pollution || 0));
        break;
      case "least_emission":
        sortedRoutes.sort((a, b) => a.emissions - b.emissions);
        break;
      default:
        break;
    }
    return sortedRoutes;
  }, []);

  // Fetch routes from Mapbox API and air quality data
  const fetchRoute = async () => {
    if (!startCoords || !endCoords || !userId) {
      setError("Vui lòng chọn điểm đi và điểm đến, hoặc đăng nhập.");
      return;
    }
    setLoading(true);
    setError("");
    setRoutes([]);
    setSelectedRouteIndex(0);
    try {
      const startLonLat = `${startCoords[1]},${startCoords[0]}`;
      const endLonLat = `${endCoords[1]},${endCoords[0]}`;
      const res = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${mode}/${startLonLat};${endLonLat}`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            geometries: "geojson",
            steps: false,
            alternatives: true,
            language: "vi",
          },
          timeout: 300000,
        }
      );
      if (res.data.routes && res.data.routes.length > 0) {
        const routesData = await Promise.all(
          res.data.routes.map(async (route) => {
            const [avgLon, avgLat] = calculateAverageCoords(route.geometry);
            const airQuality = await fetchAirQuality(avgLon, avgLat);
            return {
              geometry: route.geometry,
              distance: route.distance,
              duration: route.duration / 60,
              emissions: parseFloat(calculateEmissions(route.distance, mode)),
              pollution: parseFloat(airQuality.pm25.toFixed(1)),
            };
          })
        );
        const sortedRoutes = sortRoutesByPreference(
          routesData,
          routePreference
        );
        setRoutes(sortedRoutes);

        // Gửi dữ liệu thống kê lên server
        const dateKey = new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
        });
        await axios
          .post(SEARCH_ROUTE_API_URL, {
            userID: userId,
            description: `${start} -> ${end}`,
            time: new Date().toISOString(),
            dateKey: dateKey,
          })
          .catch((err) => {
            console.error("Failed to save search route:", err);
          });
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
  };

  // Select a specific route
  const selectRoute = (index) => {
    setSelectedRouteIndex(index);
  };

  // Toggle panel expanded
  const togglePanelExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPanelExpanded((prev) => !prev);
    setSuggestions([]);
    setActiveInput(null);
    setIsModePanelVisible(false);
    setIsCriteriaPanelVisible(false);
  };

  // Handle screen press to dismiss suggestions
  const handleScreenPress = () => {
    if (activeInput) {
      setActiveInput(null);
      setSuggestions([]);
    }
  };

  // Get current mode and criterion labels
  const currentModeLabel = transportModes.find(
    (item) => item.mapboxProfile === mode
  )?.label;
  const currentCriterionName = routePreferences.find(
    (pref) => pref.id === routePreference
  )?.label;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapWrapper
          startCoords={startCoords}
          endCoords={endCoords}
          routes={routes}
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
          selectedRouteIndex={selectedRouteIndex}
          initialCenter={[105.8342, 21.0278]}
          initialZoom={12}
          layersVisibility={layersVisibility}
        />
      </View>

      <View
        style={[
          styles.formContainer,
          !isPanelExpanded ? styles.containerCollapsedStyleForHandleOnly : {},
        ]}
      >
        {isPanelExpanded ? (
          <TouchableWithoutFeedback onPress={handleScreenPress}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => navigation.navigate("Home")}
              >
                <Ionicons name="home" size={24} color="#3366dd" />
              </TouchableOpacity>
              <Text style={styles.title}>WayGenie 🚀</Text>
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
                >
                  <Text style={styles.actionButtonText}>
                    Tiêu chí: {currentCriterionName}
                  </Text>
                  <Ionicons name="options" size={18} color="#1976d2" />
                </TouchableOpacity>
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {routes.length > 0 && (
                <View style={styles.suggestedRoutesContainer}>
                  <Text style={styles.suggestedRoutesTitle}>
                    Các Lộ trình Gợi ý:
                  </Text>
                  <ScrollView
                    style={styles.suggestedRoutesList}
                    nestedScrollEnabled
                  >
                    {routes.map((route, index) => (
                      <TouchableOpacity
                        key={`route-${index}`}
                        style={[
                          styles.suggestedRouteItem,
                          Platform.OS === "web" && styles.webCursorPointer,
                          selectedRouteIndex === index &&
                            styles.routeOptionSelected,
                        ]}
                        onPress={() => selectRoute(index)}
                      >
                        <Text style={styles.suggestedRouteText}>
                          <Text>{`Lộ trình ${index + 1}: `}</Text>
                          <Text style={styles.routeDetailHighlight}>
                            {(route.distance / 1000).toFixed(2)} km
                          </Text>
                          <Text>{` (`}</Text>
                          <Text style={styles.routeDetailHighlight}>
                            {Math.round(route.duration)} phút
                          </Text>
                          <Text>{`)`}</Text>
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {routes.length > 0 && (
                <View style={styles.routeInfoContainer}>
                  {routePreference === "fastest" ? (
                    <>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Thời gian:</Text>
                        <Text style={styles.routeInfoValue}>
                          {Math.floor(routes[selectedRouteIndex].duration)} phút
                        </Text>
                      </View>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Ưu tiên:</Text>
                        <Text style={styles.routeInfoValue}>
                          {
                            routePreferences.find(
                              (p) => p.id === routePreference
                            )?.label
                          }
                        </Text>
                      </View>
                    </>
                  ) : routePreference === "shortest" ? (
                    <>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Độ dài:</Text>
                        <Text style={styles.routeInfoValue}>
                          {(routes[selectedRouteIndex].distance / 1000).toFixed(
                            1
                          )}{" "}
                          km
                        </Text>
                      </View>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Ưu tiên:</Text>
                        <Text style={styles.routeInfoValue}>
                          {
                            routePreferences.find(
                              (p) => p.id === routePreference
                            )?.label
                          }
                        </Text>
                      </View>
                    </>
                  ) : routePreference === "eco" ? (
                    <>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Độ dài:</Text>
                        <Text style={styles.routeInfoValue}>
                          {(routes[selectedRouteIndex].distance / 1000).toFixed(
                            1
                          )}{" "}
                          km
                        </Text>
                      </View>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Độ ô nhiễm:</Text>
                        <Text style={styles.routeInfoValue}>
                          {(
                            routes[selectedRouteIndex].pollution *
                              (1.8 *
                                (routes[selectedRouteIndex].distance / 1000)) ||
                            0
                          ).toFixed(1)}{" "}
                          µg/m³
                        </Text>
                      </View>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Ưu tiên:</Text>
                        <Text style={styles.routeInfoValue}>
                          {
                            routePreferences.find(
                              (p) => p.id === routePreference
                            )?.label
                          }
                        </Text>
                      </View>
                    </>
                  ) : routePreference === "least_emission" ? (
                    <>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Độ dài:</Text>
                        <Text style={styles.routeInfoValue}>
                          {(routes[selectedRouteIndex].distance / 1000).toFixed(
                            1
                          )}{" "}
                          km
                        </Text>
                      </View>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>
                          Lượng khí thải:
                        </Text>
                        <Text style={styles.routeInfoValue}>
                          {routes[selectedRouteIndex].emissions} g CO2
                        </Text>
                      </View>
                      <View style={styles.routeInfoItem}>
                        <Text style={styles.routeInfoLabel}>Ưu tiên:</Text>
                        <Text style={styles.routeInfoValue}>
                          {
                            routePreferences.find(
                              (p) => p.id === routePreference
                            )?.label
                          }
                        </Text>
                      </View>
                    </>
                  ) : null}
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

        {/* Mode Selection Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isModePanelVisible}
          onRequestClose={() => setIsModePanelVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setIsModePanelVisible(false)}
          >
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
                  <Text style={styles.panelTitle}>
                    Chọn Tiêu chí Định tuyến
                  </Text>
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
                  {routePreferences.map((pref) => (
                    <TouchableOpacity
                      key={pref.id}
                      style={[styles.panelItem]}
                      onPress={() => {
                        setRoutePreference(pref.id);
                        setIsCriteriaPanelVisible(false);
                      }}
                    >
                      <Text style={styles.panelItemText}>{pref.label}</Text>
                      {routePreference === pref.id && (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  mapContainer: {
    flex: 1,
  },
  homeButton: {
    zIndex: 1000,
    position: "absolute",
    left: 10,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formContainer: {
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
  errorText: {
    color: "red",
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
  },
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
  routeOptionSelected: {
    backgroundColor: "#aeffff",
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  routeInfoContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  routeInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  routeInfoLabel: {
    fontSize: 16,
    color: "#666",
  },
  routeInfoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});
