import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import axios from "axios";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { transportModes } from "../../data/transportModes";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets.js";
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

  // State for data layers
  const [layersVisibility, setLayersVisibility] = useState({
    traffic: true,
    airQuality: false,
    incidents: true,
  });

  const [trafficData, setTrafficData] = useState(null);
  const [airQualityData, setAirQualityData] = useState(null);
  const [incidentData, setIncidentData] = useState(null);

  const debounceTimeout = useRef(null);

  // Route preference options
  const routePreferences = [
    { id: "fastest", label: "Nhanh nhất", icon: "rocket" },
    { id: "shortest", label: "Ngắn nhất", icon: "resize" },
    { id: "eco", label: "Ít ô nhiễm", icon: "leaf" },
    { id: "less_traffic", label: "Ít tắc đường", icon: "car" },
  ];

  // Fetch realtime data for layers
  const fetchRealtimeData = () => {
    // Traffic data
    setTrafficData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { status: "congested" },
          geometry: {
            type: "LineString",
            coordinates: [
              [105.84, 21.02],
              [105.85, 21.03],
              [105.86, 21.04],
            ],
          },
        },
        {
          type: "Feature",
          properties: { status: "moderate" },
          geometry: {
            type: "LineString",
            coordinates: [
              [105.82, 21.01],
              [105.83, 21.0],
            ],
          },
        },
      ],
    });

    // Air quality data
    setAirQualityData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { pm25: 60, status: "unhealthy" },
          geometry: { type: "Point", coordinates: [105.83, 21.03] },
        },
        {
          type: "Feature",
          properties: { pm25: 25, status: "moderate" },
          geometry: { type: "Point", coordinates: [105.85, 21.01] },
        },
      ],
    });

    // Incident data
    setIncidentData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            type: "accident",
            description: "Tai nạn",
            severity: "high",
            icon: "fire",
          },
          geometry: { type: "Point", coordinates: [105.845, 21.025] },
        },
        {
          type: "Feature",
          properties: {
            type: "road_closure",
            description: "Đóng đường",
            severity: "medium",
            icon: "roadblock",
          },
          geometry: { type: "Point", coordinates: [105.835, 21.015] },
        },
      ],
    });
  };

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

  // Fetch route when mode or preference changes
  useEffect(() => {
    if (startCoords && endCoords) {
      fetchRoute();
    }
  }, [mode, routePreference]);

  // Initialize realtime data
  useEffect(() => {
    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toggle layer visibility
  const toggleLayer = (layerName) => {
    setLayersVisibility((prevState) => ({
      ...prevState,
      [layerName]: !prevState[layerName],
    }));
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapWrapper
          startCoords={startCoords}
          endCoords={endCoords}
          routes={routes}
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
          selectedRouteIndex={selectedRouteIndex}
          initialCenter={[105.8342, 21.0278]} // Hà Nội
          initialZoom={12}
          layersVisibility={layersVisibility}
          trafficData={trafficData}
          airQualityData={airQualityData}
          incidentData={incidentData}
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
                    : "Sự cố"}
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
});
