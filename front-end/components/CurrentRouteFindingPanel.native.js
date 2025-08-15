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
  Keyboard,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Dimensions,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { transportModes } from "../data/transportCurrentModel";
import { MAPBOX_PUBLIC_ACCESS_TOKEN, BACKEND_API_BASE_URL } from "../secrets";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AIR_QUALITY_API_URL = `${BACKEND_API_BASE_URL}/aqis`;

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

// Hàm so sánh sâu để kiểm tra hai mảng tọa độ
const areCoordsEqual = (coords1, coords2) => {
  if (!coords1 || !coords2) return coords1 === coords2;
  return coords1[0] === coords2[0] && coords1[1] === coords2[1];
};

// Hàm so sánh sâu GeoJSONs
const areGeoJSONsEqual = (geoJSONs1, geoJSONs2) => {
  if (!geoJSONs1 || !geoJSONs2) return geoJSONs1 === geoJSONs2;
  if (geoJSONs1.length !== geoJSONs2.length) return false;
  return geoJSONs1.every((g1, i) => {
    const g2 = geoJSONs2[i];
    if (g1.type !== g2.type || g1.features.length !== g2.features.length)
      return false;
    return g1.features.every((f1, j) => {
      const f2 = g2.features[j];
      if (f1.type !== f2.type || f1.geometry.type !== f2.geometry.type)
        return false;
      return f1.geometry.coordinates.every((c1, k) =>
        areCoordsEqual(c1, f2.geometry.coordinates[k])
      );
    });
  });
};

const RouteFindingPanel = ({
  onRouteSelected,
  onClearRoute,
  disabled,
  userID, // Nhận userID từ props
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
  const [routingCriteria] = useState([
    {
      id: "fastest",
      name: "Nhanh nhất",
      allowedModes: ["driving", "walking", "cycling", "motorcycle"],
    },
    {
      id: "shortest",
      name: "Ngắn nhất",
      allowedModes: ["driving", "walking", "cycling", "motorcycle"],
    },
    {
      id: "least_pollution",
      name: "Ít ô nhiễm",
      allowedModes: ["driving", "walking", "cycling", "motorcycle"],
    },
    {
      id: "emission",
      name: "Ít phát thải",
      allowedModes: ["driving", "motorcycle"],
    },
  ]);
  const [selectedRoutingCriterionId, setSelectedRoutingCriterionId] =
    useState("fastest");
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isModePanelVisible, setIsModePanelVisible] = useState(false);
  const [isCriteriaPanelVisible, setIsCriteriaPanelVisible] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  const debouncedStartText = useDebounce(start, 500);
  const debouncedEndText = useDebounce(end, 500);

  useEffect(() => {
    if (activeInput === "start" && debouncedStartText) {
      handleAutocomplete(debouncedStartText, "start");
    } else {
      setSuggestions([]);
    }
  }, [debouncedStartText, activeInput]);

  useEffect(() => {
    if (activeInput === "end" && debouncedEndText) {
      handleAutocomplete(debouncedEndText, "end");
    } else {
      setSuggestions([]);
    }
  }, [debouncedEndText, activeInput]);

  // Calculate emissions
  const calculateEmissions = (distance, transportMode) => {
    const distanceKm = distance;
    const emissionFactors = {
      driving: 170,
      walking: 0,
      cycling: 0,
      motorcycle: 100,
    };
    return (distanceKm * (emissionFactors[transportMode] || 150)).toFixed(0);
  };

  // Calculate average coordinates
  const calculateAverageCoords = (geometry) => {
    if (!geometry || !geometry.coordinates || !geometry.coordinates.length) {
      return [0, 0];
    }
    const coords = geometry.coordinates;
    const avgLat =
      coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
    const avgLon =
      coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
    return [avgLon, avgLat];
  };

  // Fetch air quality data
  const fetchAirQuality = async (lon, lat) => {
    try {
      const res = await axios.get(AIR_QUALITY_API_URL, {
        params: { stationName: "" },
      });
      const aqisRecords = res.data;
      if (!aqisRecords || aqisRecords.length === 0) {
        return { pm25: 0 };
      }
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
  const sortRoutesByPreference = (routes, preference) => {
    if (!routes || routes.length === 0) return routes;
    const sortedRoutes = [...routes];
    switch (preference) {
      case "fastest":
        sortedRoutes.sort((a, b) => a.metrics.time - b.metrics.time);
        break;
      case "shortest":
        sortedRoutes.sort((a, b) => a.metrics.distance - b.metrics.distance);
        break;
      case "least_pollution":
        sortedRoutes.sort(
          (a, b) =>
            (a.segmentFeatures[0].properties.pollution || 0) -
            (b.segmentFeatures[0].properties.pollution || 0)
        );
        break;
      case "emission":
        sortedRoutes.sort(
          (a, b) =>
            a.segmentFeatures[0].properties.emissions -
            b.segmentFeatures[0].properties.emissions
        );
        break;
      default:
        break;
    }
    return sortedRoutes;
  };

  const fetchRoute = useCallback(async () => {
    if (!startCoords || !endCoords) {
      setError("Vui lòng chọn điểm đi và điểm đến.");
      return;
    }

    if (!userID) {
      setError("Vui lòng đăng nhập để tìm kiếm lộ trình.");
      return;
    }

    setLoading(true);
    setError("");
    setAvailableRoutes([]);
    onClearRoute();

    try {
      const profile = mode === "motorcycle" ? "driving" : mode;
      const coordinates = `${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}`;
      const response = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            geometries: "geojson",
            alternatives: true,
            steps: true,
            language: "vi",
            overview: "full",
            exclude: mode === "motorcycle" ? "motorway,ferry" : "ferry",
            annotations: "speed,distance,duration",
            avoid_maneuver_radius: mode === "motorcycle" ? 100 : undefined,
          },
          timeout: 30000,
        }
      );

      const { routes } = response.data;

      if (routes && routes.length > 0) {
        const processedRoutes = await Promise.all(
          routes.map(async (route, index) => {
            const adjustedDuration =
              mode === "motorcycle"
                ? (route.duration / 60) * 0.9
                : route.duration / 60;
            const [avgLon, avgLat] = calculateAverageCoords(route.geometry);
            const airQuality = await fetchAirQuality(avgLon, avgLat);
            const emissions = calculateEmissions(
              route.distance / 1000,
              mode === "motorcycle" ? "motorcycle" : mode
            );
            return {
              id: `route-${index}`,
              segmentFeatures: [
                {
                  type: "Feature",
                  geometry: route.geometry,
                  properties: {
                    routeId: `route-${index}`,
                    distance: route.distance / 1000,
                    duration: adjustedDuration,
                    emissions: parseFloat(emissions),
                    pollution: parseFloat(airQuality.pm25.toFixed(1)),
                    mode: mode === "motorcycle" ? "motorcycle" : mode,
                  },
                },
              ],
              metrics: {
                distance: route.distance / 1000,
                time: adjustedDuration,
              },
            };
          })
        );

        const sortedRoutes = sortRoutesByPreference(
          processedRoutes,
          selectedRoutingCriterionId
        );
        setAvailableRoutes(sortedRoutes);

        const allRoutesGeoJSON = sortedRoutes.map((route) => ({
          type: "FeatureCollection",
          features: route.segmentFeatures,
        }));

        setSelectedRouteId(sortedRoutes[0].id);
        onRouteSelected(
          startCoords,
          endCoords,
          allRoutesGeoJSON,
          sortedRoutes[0].id,
          selectedRoutingCriterionId
        );
        console.log("Route selected after fetch:", {
          geoJSONRoutesForMap: allRoutesGeoJSON,
          selectedRouteId: sortedRoutes[0].id,
          criterion: selectedRoutingCriterionId,
        });

        // Gửi dữ liệu tìm kiếm lên server
        const SEARCH_ROUTE_API_URL = `${BACKEND_API_BASE_URL}/search-route`;
        const dateKey = new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
        });
        try {
          console.log("Sending search route data:", {
            userID,
            description: `${start} -> ${end}`,
            time: new Date().toISOString(),
            dateKey,
          });
          await axios.post(SEARCH_ROUTE_API_URL, {
            userID,
            description: `${start} -> ${end}`,
            time: new Date().toISOString(),
            dateKey,
          });
          console.log("Search route saved successfully");
        } catch (error) {
          console.error(
            "Failed to save search route:",
            error.response?.data || error.message
          );
          // Không đặt setError để tránh làm gián đoạn giao diện
        }
      } else {
        const modeLabel =
          transportModes.find(
            (m) =>
              m.mapboxProfile === mode ||
              (m.key === "motorcycle" && mode === "motorcycle")
          )?.label || mode;
        setError(
          `Không tìm thấy tuyến đường phù hợp cho ${modeLabel}. Vui lòng thử phương thức khác.`
        );
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
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
    onClearRoute,
    onRouteSelected,
    selectedRoutingCriterionId,
    userID,
    start,
    end,
  ]);

  const selectRoute = useCallback(
    (route) => {
      setSelectedRouteId(route.id);
      const geoJSONRoutesForMap = availableRoutes.map((r) => ({
        type: "FeatureCollection",
        features: r.segmentFeatures,
      }));
      onRouteSelected(
        startCoords,
        endCoords,
        geoJSONRoutesForMap,
        route.id,
        selectedRoutingCriterionId
      );
      console.log("Route selected manually:", {
        geoJSONRoutesForMap,
        selectedRouteId: route.id,
        criterion: selectedRoutingCriterionId,
      });
    },
    [
      availableRoutes,
      startCoords,
      endCoords,
      onRouteSelected,
      selectedRoutingCriterionId,
    ]
  );

  const prevCoordsRef = useRef({
    startCoords: null,
    endCoords: null,
    mode: null,
    criterion: null,
  });

  useEffect(() => {
    if (
      startCoords &&
      endCoords &&
      (!areCoordsEqual(startCoords, prevCoordsRef.current.startCoords) ||
        !areCoordsEqual(endCoords, prevCoordsRef.current.endCoords) ||
        mode !== prevCoordsRef.current.mode ||
        selectedRoutingCriterionId !== prevCoordsRef.current.criterion)
    ) {
      fetchRoute();
      prevCoordsRef.current = {
        startCoords,
        endCoords,
        mode,
        criterion: selectedRoutingCriterionId,
      };
    }
  }, [startCoords, endCoords, mode, selectedRoutingCriterionId, fetchRoute]);

  const togglePanelExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPanelExpanded((prev) => !prev);
    Keyboard.dismiss();
    setSuggestions([]);
    setActiveInput(null);
    setIsModePanelVisible(false);
    setIsCriteriaPanelVisible(false);
  };

  const handleAutocomplete = async (text, inputType) => {
    if (!text || text.length < 3) {
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
      setSuggestions([]);
      setError("Không thể lấy gợi ý địa điểm. Vui lòng thử lại.");
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

  const handleScreenPress = () => {
    if (activeInput) {
      Keyboard.dismiss();
      setActiveInput(null);
      setSuggestions([]);
    }
  };

  const currentModeLabel = useMemo(
    () =>
      transportModes.find(
        (item) =>
          item.mapboxProfile === mode ||
          (item.key === "motorcycle" && mode === "motorcycle")
      )?.label || "Không xác định",
    [mode]
  );

  const currentCriterionName = useMemo(
    () =>
      routingCriteria.find(
        (criterion) => criterion.id === selectedRoutingCriterionId
      )?.name || "Không xác định",
    [selectedRoutingCriterionId]
  );

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
                  ref={startInputRef}
                  style={styles.input}
                  placeholder="📍 Điểm đi"
                  value={start}
                  onChangeText={setStart}
                  onFocus={() => {
                    setActiveInput("start");
                    setSuggestions([]);
                    setIsModePanelVisible(false);
                    setIsCriteriaPanelVisible(false);
                  }}
                  placeholderTextColor="#888"
                />
                {activeInput === "start" && suggestions.length > 0 && (
                  <ScrollView
                    style={styles.suggestionListRelative}
                    nestedScrollEnabled
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
                  onChangeText={setEnd}
                  onFocus={() => {
                    setActiveInput("end");
                    setSuggestions([]);
                    setIsModePanelVisible(false);
                    setIsCriteriaPanelVisible(false);
                  }}
                  placeholderTextColor="#888"
                />
                {activeInput === "end" && suggestions.length > 0 && (
                  <ScrollView
                    style={styles.suggestionListRelative}
                    nestedScrollEnabled
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
                style={styles.actionButton}
                onPress={() => {
                  Keyboard.dismiss();
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
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setSuggestions([]);
                  setActiveInput(null);
                  setIsModePanelVisible(true);
                }}
              >
                <Text style={styles.actionButtonText}>
                  Chế độ: {currentModeLabel}
                </Text>
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
                        selectedRouteId === route.id &&
                          styles.routeOptionSelected,
                      ]}
                      onPress={() => {
                        selectRoute(route);
                      }}
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
            {availableRoutes.length > 0 && selectedRouteId && (
              <View style={styles.routeInfoContainer}>
                {(() => {
                  const selectedRoute = availableRoutes.find(
                    (route) => route.id === selectedRouteId
                  );
                  if (!selectedRoute) return null;
                  return (
                    <>
                      {selectedRoutingCriterionId === "fastest" && (
                        <>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>
                              Thời gian:
                            </Text>
                            <Text style={styles.routeInfoValue}>
                              {Math.round(
                                selectedRoute.segmentFeatures[0].properties
                                  .duration
                              )}{" "}
                              phút
                            </Text>
                          </View>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>Ưu tiên:</Text>
                            <Text style={styles.routeInfoValue}>
                              {
                                routingCriteria.find(
                                  (c) => c.id === selectedRoutingCriterionId
                                )?.name
                              }
                            </Text>
                          </View>
                        </>
                      )}
                      {selectedRoutingCriterionId === "shortest" && (
                        <>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>Độ dài:</Text>
                            <Text style={styles.routeInfoValue}>
                              {selectedRoute.segmentFeatures[0].properties.distance.toFixed(
                                1
                              )}{" "}
                              km
                            </Text>
                          </View>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>Ưu tiên:</Text>
                            <Text style={styles.routeInfoValue}>
                              {
                                routingCriteria.find(
                                  (c) => c.id === selectedRoutingCriterionId
                                )?.name
                              }
                            </Text>
                          </View>
                        </>
                      )}
                      {selectedRoutingCriterionId === "least_pollution" && (
                        <>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>Độ dài:</Text>
                            <Text style={styles.routeInfoValue}>
                              {selectedRoute.segmentFeatures[0].properties.distance.toFixed(
                                1
                              )}{" "}
                              km
                            </Text>
                          </View>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>
                              Độ ô nhiễm:
                            </Text>
                            <Text style={styles.routeInfoValue}>
                              {(
                                selectedRoute.segmentFeatures[0].properties
                                  .pollution *
                                  (1.8 *
                                    selectedRoute.segmentFeatures[0].properties
                                      .distance) || 0
                              ).toFixed(1)}{" "}
                              µg/m³
                            </Text>
                          </View>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>Ưu tiên:</Text>
                            <Text style={styles.routeInfoValue}>
                              {
                                routingCriteria.find(
                                  (c) => c.id === selectedRoutingCriterionId
                                )?.name
                              }
                            </Text>
                          </View>
                        </>
                      )}
                      {selectedRoutingCriterionId === "emission" && (
                        <>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>Độ dài:</Text>
                            <Text style={styles.routeInfoValue}>
                              {selectedRoute.segmentFeatures[0].properties.distance.toFixed(
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
                              {
                                selectedRoute.segmentFeatures[0].properties
                                  .emissions
                              }{" "}
                              g CO2
                            </Text>
                          </View>
                          <View style={styles.routeInfoItem}>
                            <Text style={styles.routeInfoLabel}>Ưu tiên:</Text>
                            <Text style={styles.routeInfoValue}>
                              {
                                routingCriteria.find(
                                  (c) => c.id === selectedRoutingCriterionId
                                )?.name
                              }
                            </Text>
                          </View>
                        </>
                      )}
                      {selectedRoute.segmentFeatures[0].properties.mode ===
                        "motorcycle" && (
                        <View style={styles.routeInfoItem}></View>
                      )}
                    </>
                  );
                })()}
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
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModePanelVisible}
        onRequestClose={() => setIsModePanelVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModePanelVisible(false)}>
          <View style={styles.panelOverlay}>
            <View
              style={styles.panelContent}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Chọn Chế độ Di chuyển</Text>
                <TouchableOpacity
                  onPress={() => setIsModePanelVisible(false)}
                  style={styles.panelCloseButton}
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.panelScrollView}>
                {transportModes
                  .filter((item) =>
                    routingCriteria
                      .find(
                        (criterion) =>
                          criterion.id === selectedRoutingCriterionId
                      )
                      ?.allowedModes.includes(
                        item.key === "motorcycle"
                          ? "motorcycle"
                          : item.mapboxProfile
                      )
                  )
                  .map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.panelItem}
                      onPress={() => {
                        setMode(
                          item.key === "motorcycle"
                            ? "motorcycle"
                            : item.mapboxProfile
                        );
                        setIsModePanelVisible(false);
                      }}
                    >
                      <Text style={styles.panelItemText}>{item.label}</Text>
                      {(item.key === "motorcycle" && mode === "motorcycle") ||
                      (item.mapboxProfile === mode &&
                        item.key !== "motorcycle") ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#1976d2"
                        />
                      ) : null}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
              style={styles.panelContent}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Chọn Tiêu chí Định tuyến</Text>
                <TouchableOpacity
                  onPress={() => setIsCriteriaPanelVisible(false)}
                  style={styles.panelCloseButton}
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.panelScrollView}>
                {routingCriteria.map((criterion) => (
                  <TouchableOpacity
                    key={criterion.id}
                    style={styles.panelItem}
                    onPress={() => {
                      setSelectedRoutingCriterionId(criterion.id);
                      if (
                        criterion.id === "emission" &&
                        !criterion.allowedModes.includes(mode)
                      ) {
                        setMode("driving");
                      }
                      setIsCriteriaPanelVisible(false);
                      if (availableRoutes.length > 0) {
                        const sortedRoutes = sortRoutesByPreference(
                          availableRoutes,
                          criterion.id
                        );
                        setAvailableRoutes(sortedRoutes);
                        const geoJSONRoutesForMap = sortedRoutes.map((r) => ({
                          type: "FeatureCollection",
                          features: r.segmentFeatures,
                        }));
                        setSelectedRouteId(sortedRoutes[0].id);
                        onRouteSelected(
                          startCoords,
                          endCoords,
                          geoJSONRoutesForMap,
                          sortedRoutes[0].id,
                          criterion.id
                        );
                        console.log("Route selected after criterion change:", {
                          geoJSONRoutesForMap,
                          selectedRouteId: sortedRoutes[0].id,
                          criterion: criterion.id,
                        });
                      }
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
    top: Platform.OS === "android" ? 30 : 30,
    left: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: SCREEN_HEIGHT * 0.8,
    overflow: "hidden",
    zIndex: 1000,
  },
  containerCollapsedStyleForHandleOnly: {
    padding: 0,
    height: 40,
    width: 60,
    alignSelf: "center",
    overflow: "visible",
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
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
    left: 0,
    right: 0,
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2f7",
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
  modeNote: {
    fontSize: 10,
    color: "#666",
    fontStyle: "italic",
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
    maxHeight: 200,
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
  routeOptionSelected: {
    backgroundColor: "#e0f2f7",
  },
  suggestedRouteText: { fontSize: 14, color: "#555" },
  routeDetailHighlight: { fontWeight: "bold", color: "#1976d2" },
  collapseHandle: {
    position: "relative",
    alignSelf: "center",
    paddingHorizontal: 50,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  collapseHandleCollapsed: {
    position: "relative",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    paddingHorizontal: 10,
    margin: "auto",
    alignSelf: "center",
  },
  panelOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panelContent: {
    width: SCREEN_WIDTH * 0.85,
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
});

export default RouteFindingPanel;
