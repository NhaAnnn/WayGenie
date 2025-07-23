import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  SafeAreaView,
  Modal,
} from "react-native";
import axios from "axios";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { transportModes } from "../../data/transportModes";
import {
  MAPBOX_PUBLIC_ACCESS_TOKEN,
  BACKEND_API_BASE_URL,
} from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";

export default function CurrentStatusMapScreen({ navigation }) {
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width
  );
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAqiData, setSelectedAqiData] = useState(null);
  const [aqiPopupVisible, setAqiPopupVisible] = useState(false);
  const [coordinatesInfo, setCoordinatesInfo] = useState(null); // Thêm state cho thông tin tọa độ

  // State for data layers
  const [layersVisibility, setLayersVisibility] = useState({
    traffic: true,
    airQuality: true,
    coordinates: true, // Thay đổi từ incidents thành coordinates để phù hợp với CoordinateManagement
  });

  // Backend data state
  const [allCoordinates, setAllCoordinates] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [rawAirQualityData, setRawAirQualityData] = useState([]);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);

  // Data for map layers
  const [trafficData, setTrafficData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [airQualityData, setAirQualityData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [coordinatesData, setCoordinatesData] = useState({
    // Thay đổi từ incidentData thành coordinatesData
    type: "FeatureCollection",
    features: [],
  });

  // API endpoints
  const COORDINATES_API_URL = `${BACKEND_API_BASE_URL}/coordinates`;
  const ROUTES_API_URL = `${BACKEND_API_BASE_URL}/routes`;
  const AIR_QUALITY_API_URL = `${BACKEND_API_BASE_URL}/aqis`;

  const debounceTimeout = useRef(null);

  // Route preference options
  const routePreferences = [
    { id: "fastest", label: "Nhanh nhất", icon: "rocket" },
    { id: "shortest", label: "Ngắn nhất", icon: "resize" },
    { id: "eco", label: "Ít ô nhiễm", icon: "leaf" },
    { id: "less_traffic", label: "Ít tắc đường", icon: "car" },
  ];

  // Fetch graph data from backend
  const fetchGraphData = useCallback(async () => {
    setIsBackendGraphDataLoading(true);
    setIsError(false);

    try {
      const [coordsResponse, routesResponse, airQualityResponse] =
        await Promise.allSettled([
          fetch(COORDINATES_API_URL),
          fetch(ROUTES_API_URL),
          fetch(AIR_QUALITY_API_URL),
        ]);

      let errorOccurred = false;

      if (coordsResponse.status === "fulfilled" && coordsResponse.value.ok) {
        const coordsData = await coordsResponse.value.json();
        setAllCoordinates(coordsData);
      } else {
        errorOccurred = true;
        console.error("Error fetching coordinates");
      }

      if (routesResponse.status === "fulfilled" && routesResponse.value.ok) {
        const routesData = await routesResponse.value.json();
        setAllRoutes(routesData);
      } else {
        errorOccurred = true;
        console.error("Error fetching routes");
      }

      if (
        airQualityResponse.status === "fulfilled" &&
        airQualityResponse.value.ok
      ) {
        const aqData = await airQualityResponse.value.json();
        setRawAirQualityData(aqData);
      } else {
        errorOccurred = true;
        console.error("Error fetching air quality data");
      }

      setIsError(errorOccurred);
    } catch (error) {
      console.error("General network error:", error);
      setIsError(true);
    } finally {
      setIsBackendGraphDataLoading(false);
    }
  }, [COORDINATES_API_URL, ROUTES_API_URL, AIR_QUALITY_API_URL]);

  // Process realtime data from backend
  const processRealtimeData = useCallback(() => {
    if (
      allCoordinates.length === 0 ||
      allRoutes.length === 0 ||
      rawAirQualityData.length === 0
    )
      return;

    // Create coordinates map
    const coordinatesMap = new Map();
    allCoordinates.forEach((coord) => {
      coordinatesMap.set(coord["NODE:NO"], coord);
    });

    // Process traffic data
    const trafficFeatures = allRoutes.map((route) => {
      const fromCoord = coordinatesMap.get(route.FROMNODENO);
      const toCoord = coordinatesMap.get(route.TONODENO);

      return {
        type: "Feature",
        properties: {
          id: route.linkNo,
          linkNo: route.linkNo ?? "N/A",
          FROMNODENO: route.FROMNODENO ?? "N/A",
          TONODENO: route.TONODENO ?? "N/A",
          VC: route.VC ?? "N/A",
          TSYSSET: route.TSYSSET ?? "N/A",
          status:
            route.VC <= 0.6
              ? "smooth"
              : route.VC <= 0.8
              ? "moderate"
              : "congested",
        },
        geometry: route.geometry || {
          type: "LineString",
          coordinates: [
            fromCoord?.location?.coordinates || [0, 0],
            toCoord?.location?.coordinates || [0, 0],
          ],
        },
      };
    });

    setTrafficData({
      type: "FeatureCollection",
      features: trafficFeatures,
    });

    // Process air quality data
    const airQualityFeatures = rawAirQualityData.map((aqData, index) => {
      const aqiValue = aqData.aqi || 0;
      let status = "good";
      if (aqiValue > 300) status = "very_unhealthy";
      else if (aqiValue > 200) status = "hazardous";
      else if (aqiValue > 150) status = "unhealthy";
      else if (aqiValue > 100) status = "unhealthy_sensitive";
      else if (aqiValue > 50) status = "moderate";

      return {
        type: "Feature",
        properties: {
          stationId: aqData.stationUid || `station-${index}`,
          stationName: aqData.stationName || `Trạm ${index}`,
          aqi: aqiValue,
          pm25: aqData.pm25 || 0,
          co: aqData.co || 0,
          no2: aqData.no2 || 0,
          so2: aqData.so2 || 0,
          o3: aqData.o3 || 0,
          status: status,
          timestamp: aqData.time || "Không rõ",
        },
        geometry: aqData.location || { type: "Point", coordinates: [0, 0] },
      };
    });

    setAirQualityData({
      type: "FeatureCollection",
      features: airQualityFeatures,
    });

    // Process coordinates data (thay thế cho incidentData)
    const coordinateFeatures = allCoordinates.map((coord) => ({
      type: "Feature",
      properties: {
        node_id: coord.node_id,
        nodeName: coord.node_name || `Node ${coord.node_id || "N/A"}`,
      },
      geometry: coord.location || { type: "Point", coordinates: [0, 0] },
    }));

    setCoordinatesData({
      type: "FeatureCollection",
      features: coordinateFeatures,
    });
  }, [allCoordinates, allRoutes, rawAirQualityData]);

  // Handle screen resize
  useEffect(() => {
    const updateDimensions = () => {
      const width = Dimensions.get("window").width;
      setScreenWidth(width);
      if (width <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    const subscription = Dimensions.addEventListener(
      "change",
      updateDimensions
    );
    updateDimensions();

    return () => {
      subscription?.remove();
    };
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Process data when loaded
  useEffect(() => {
    if (!isBackendGraphDataLoading && !isError) {
      processRealtimeData();
      const interval = setInterval(processRealtimeData, 30000); // Update every 30s
      return () => clearInterval(interval);
    }
  }, [isBackendGraphDataLoading, isError, processRealtimeData]);

  // Fetch route when mode or preference changes
  useEffect(() => {
    if (startCoords && endCoords) {
      fetchRoute();
    }
  }, [mode, routePreference, startCoords, endCoords]);

  // Toggle layer visibility
  const toggleLayer = (layerName) => {
    setLayersVisibility((prevState) => ({
      ...prevState,
      [layerName]: !prevState[layerName],
    }));

    // Close AQI popup when air quality layer is turned off
    if (layerName === "airQuality" && aqiPopupVisible) {
      setAqiPopupVisible(false);
      setSelectedAqiData(null);
    }
    // Close coordinates info when coordinates layer is turned off
    if (layerName === "coordinates" && coordinatesInfo) {
      setCoordinatesInfo(null);
    }
  };

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
      if (endCoords) {
        fetchRoute();
      }
    } else {
      setEnd(place.name);
      setEndCoords(place.coords);
      if (startCoords) {
        fetchRoute();
      }
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  // Calculate emissions for a route
  const calculateEmissions = (distance, transportMode) => {
    const distanceKm = distance / 1000;
    const emissionFactors = {
      driving: 170,
      walking: 0,
      cycling: 0,
      "driving-traffic": 200,
      transit: 90,
    };
    return (distanceKm * (emissionFactors[transportMode] || 150)).toFixed(0);
  };

  // Sort routes by preference
  const sortRoutesByPreference = (routes, preference) => {
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
        sortedRoutes.sort((a, b) => a.emissions - b.emissions);
        break;
      case "less_traffic":
        sortedRoutes.sort((a, b) => {
          const trafficFactorA = a.distance / a.duration;
          const trafficFactorB = b.distance / b.duration;
          return trafficFactorB - trafficFactorA;
        });
        break;
      default:
        break;
    }

    return sortedRoutes;
  };

  // Fetch routes from Mapbox API
  const fetchRoute = async () => {
    if (!startCoords || !endCoords) return;

    setLoading(true);
    setError("");
    setRoutes([]);
    setSelectedRouteIndex(0);

    try {
      const startLonLat = `${startCoords[1]},${startCoords[0]}`;
      const endLonLat = `${endCoords[1]},${endCoords[0]}`;

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
        }
      );

      if (res.data.routes && res.data.routes.length > 0) {
        let routesData = res.data.routes.map((route, index) => ({
          geometry: route.geometry,
          distance: route.distance,
          duration: route.duration / 60,
          emissions: calculateEmissions(route.distance, mode),
          congestion: route.congestion,
        }));

        routesData = sortRoutesByPreference(routesData, routePreference);
        setRoutes(routesData);
      } else {
        setError("Không tìm thấy tuyến đường cho các điểm đã chọn.");
      }
    } catch (error) {
      console.error("Directions API error:", error);
      setError("Không thể lấy dữ liệu tuyến đường. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Select a specific route
  const selectRoute = (index) => {
    setSelectedRouteIndex(index);
  };

  // Handle find route button press
  const handleFindRoute = () => {
    if (!startCoords || !endCoords) {
      Alert.alert("Thông báo", "Vui lòng chọn điểm đi và điểm đến từ gợi ý.");
      return;
    }
    fetchRoute();
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Change transport mode
  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  // Change route preference
  const handlePreferenceChange = (newPreference) => {
    setRoutePreference(newPreference);
  };

  // Get dynamic form container style
  const getFormContainerStyle = () => {
    if (screenWidth <= 768) {
      return {
        width: sidebarOpen ? "85%" : 0,
        opacity: sidebarOpen ? 1 : 0,
      };
    }
    return {
      width: sidebarOpen ? 450 : 0,
    };
  };

  // Handle coordinate marker press
  const handleCoordinateMarkerPress = useCallback(
    (feature) => {
      if (layersVisibility.coordinates) {
        setCoordinatesInfo({
          node_id: feature.properties.node_id,
          nodeName: feature.properties.nodeName,
          coordinates: feature.geometry.coordinates,
        });
      }
    },
    [layersVisibility.coordinates]
  );

  // Close coordinates info
  const closeCoordinatesInfo = () => {
    setCoordinatesInfo(null);
  };

  // Handle air quality marker press
  const handleAirQualityMarkerPress = useCallback(
    (feature) => {
      if (layersVisibility.airQuality) {
        setSelectedAqiData({
          ...feature.properties,
          coordinates: feature.geometry.coordinates,
        });
        setAqiPopupVisible(true);
      }
    },
    [layersVisibility.airQuality]
  );

  // Close AQI popup
  const closeAqiPopup = () => {
    setAqiPopupVisible(false);
    setSelectedAqiData(null);
  };

  // Get AQI status and color
  const getAqiStatus = (aqi) => {
    if (!aqi || isNaN(aqi))
      return { color: "#888", description: "Không có dữ liệu" };

    if (aqi >= 300) return { color: "#7e0023", description: "Nguy hiểm" };
    if (aqi >= 200) return { color: "#8b008b", description: "Rất không tốt" };
    if (aqi >= 150) return { color: "#ff0000", description: "Không tốt" };
    if (aqi >= 100)
      return { color: "#ff8c00", description: "Không tốt cho nhóm nhạy cảm" };
    if (aqi >= 50) return { color: "#ffff00", description: "Trung bình" };
    return { color: "#008000", description: "Tốt" };
  };

  // Combined loading state
  const isLoading =
    isBackendGraphDataLoading ||
    !trafficData.features.length ||
    !airQualityData.features.length ||
    !coordinatesData.features.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>
              {isError ? "Lỗi tải dữ liệu" : "Đang tải dữ liệu..."}
            </Text>
          </View>
        )}

        <MapWrapper
          startCoords={startCoords}
          endCoords={endCoords}
          routes={routes}
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
          selectedRouteIndex={selectedRouteIndex}
          initialCenter={[105.8342, 21.0278]}
          initialZoom={12}
          layersVisibility={layersVisibility}
          trafficData={trafficData}
          coordinatesData={coordinatesData} // Thay đổi từ incidentData thành coordinatesData
          airQualityData={airQualityData}
          onCoordinateMarkerPress={handleCoordinateMarkerPress} // Thêm prop xử lý click tọa độ
          coordinatesInfo={coordinatesInfo} // Thêm prop thông tin tọa độ
          onCloseCoordinatesPanel={closeCoordinatesInfo} // Thêm prop đóng panel tọa độ
          onAirQualityMarkerPress={handleAirQualityMarkerPress}
          selectedAqiData={selectedAqiData}
          onCloseAqiPanel={closeAqiPopup}
        />
      </View>

      {/* Layer controls */}
      <View style={styles.floatingLayerControls}>
        <Text style={styles.controlPanelTitle}>Lớp dữ liệu:</Text>
        <View style={styles.layerButtonsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(layersVisibility).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.layerButton,
                  layersVisibility[key] ? styles.layerButtonActive : {},
                ]}
                onPress={() => toggleLayer(key)}
              >
                <Text style={styles.layerButtonText}>
                  {key === "traffic"
                    ? "Giao thông"
                    : key === "airQuality"
                    ? "Không khí"
                    : "Tọa độ"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {sidebarOpen && (
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home" size={24} color="#3366dd" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.toggleButton,
          sidebarOpen && screenWidth > 768 && { left: 340 },
          sidebarOpen && screenWidth <= 768 && { left: "80%" },
          !sidebarOpen && { left: 10 },
        ]}
        onPress={toggleSidebar}
      >
        <Ionicons
          name={sidebarOpen ? "arrow-back" : "arrow-forward"}
          size={24}
          color="#3366dd"
        />
      </TouchableOpacity>

      {sidebarOpen && (
        <View style={[styles.formContainer, getFormContainerStyle()]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>WayGenie 🚀</Text>

            <TextInput
              style={styles.input}
              placeholder="📍 Nhập điểm đi"
              value={start}
              onChangeText={(text) => {
                setStart(text);
                handleAutocomplete(text, "start");
              }}
              onFocus={() => setActiveInput("start")}
            />
            {activeInput === "start" && suggestions.length > 0 && (
              <FlatList
                style={styles.suggestionList}
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => selectSuggestion(item)}
                    style={styles.suggestionItem}
                  >
                    <Text>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="🏁 Nhập điểm đến"
              value={end}
              onChangeText={(text) => {
                setEnd(text);
                handleAutocomplete(text, "end");
              }}
              onFocus={() => setActiveInput("end")}
            />
            {activeInput === "end" && suggestions.length > 0 && (
              <FlatList
                style={styles.suggestionList}
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => selectSuggestion(item)}
                    style={styles.suggestionItem}
                  >
                    <Text>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <View style={styles.modeContainer}>
              {transportModes.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.modeButton,
                    mode === item.mapboxProfile && styles.modeButtonSelected,
                  ]}
                  onPress={() => handleModeChange(item.mapboxProfile)}
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
            </View>

            <Text style={styles.preferenceTitle}>Ưu tiên tuyến đường:</Text>
            <View style={styles.preferenceContainer}>
              {routePreferences.map((pref) => (
                <TouchableOpacity
                  key={pref.id}
                  style={[
                    styles.preferenceButton,
                    routePreference === pref.id &&
                      styles.preferenceButtonSelected,
                  ]}
                  onPress={() => handlePreferenceChange(pref.id)}
                >
                  <Ionicons
                    name={pref.icon}
                    size={20}
                    color={routePreference === pref.id ? "#fff" : "#007BFF"}
                  />
                  <Text
                    style={[
                      styles.preferenceText,
                      routePreference === pref.id &&
                        styles.preferenceTextSelected,
                    ]}
                  >
                    {pref.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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

            {routes.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.routeOptionsTitle}>
                  Các lộ trình có thể chọn:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.routeOptionsContainer}
                >
                  {routes.map((route, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.routeOption,
                        selectedRouteIndex === index &&
                          styles.routeOptionSelected,
                      ]}
                      onPress={() => selectRoute(index)}
                    >
                      <Text style={styles.routeOptionText}>
                        Lộ trình {index + 1}
                      </Text>
                      <Text style={styles.routeOptionDetail}>
                        {(route.distance / 1000).toFixed(1)} km
                      </Text>
                      <Text style={styles.routeOptionDetail}>
                        {Math.floor(route.duration)} phút
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.routeInfoContainer}>
                  <View style={styles.routeInfoItem}>
                    <Text style={styles.routeInfoLabel}>Độ dài:</Text>
                    <Text style={styles.routeInfoValue}>
                      {(routes[selectedRouteIndex].distance / 1000).toFixed(1)}{" "}
                      km
                    </Text>
                  </View>
                  <View style={styles.routeInfoItem}>
                    <Text style={styles.routeInfoLabel}>Lượng khí thải:</Text>
                    <Text style={styles.routeInfoValue}>
                      {routes[selectedRouteIndex].emissions} g CO2
                    </Text>
                  </View>
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
                        routePreferences.find((p) => p.id === routePreference)
                          ?.label
                      }
                    </Text>
                  </View>
                </View>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  formContainer: {
    height: "100%",
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    overflow: "hidden",
    position: "absolute",
    zIndex: 10,
    left: 0,
    top: 0,
    bottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  mapContainer: {
    flex: 1,
  },
  homeButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 20,
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
  toggleButton: {
    position: "absolute",
    top: 20,
    zIndex: 20,
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  suggestionList: {
    backgroundColor: "#fff",
    maxHeight: 200,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  modeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 3,
  },
  modeButtonSelected: {
    backgroundColor: "#007BFF",
  },
  modeText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  modeTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 10,
    color: "#333",
  },
  preferenceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  preferenceButton: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  preferenceButtonSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  preferenceText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#555",
  },
  preferenceTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  findButton: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  findButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 15,
  },
  routeOptionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  routeOptionsContainer: {
    marginBottom: 15,
  },
  routeOption: {
    padding: 10,
    marginRight: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  routeOptionSelected: {
    backgroundColor: "#aeffff",
  },
  routeOptionText: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  routeOptionDetail: {
    fontSize: 12,
    color: "#666",
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
  floatingLayerControls: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 20,
    right: 15,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    padding: 10,
    flexDirection: "column",
    alignItems: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 5,
  },
  controlPanelTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#2c3e50",
    textAlign: "right",
  },
  layerButtonsContainer: {
    flexDirection: "row",
    marginBottom: 5,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  layerButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginTop: 5,
    marginLeft: 8,
    borderWidth: 0,
    alignSelf: "flex-end",
  },
  layerButtonActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  layerButtonText: {
    color: "black",
    fontWeight: "600",
    fontSize: 13,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  aqiPopup: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 10,
    padding: 15,
    zIndex: 100,
  },
  closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    padding: 5,
  },
  aqiTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  aqiValue: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 3,
  },
  aqiDetail: {
    color: "#fff",
    fontSize: 14,
  },
});
