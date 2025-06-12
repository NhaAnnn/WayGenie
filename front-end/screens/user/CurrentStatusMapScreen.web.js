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
} from "react-native";
import axios from "axios";

import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { transportModes } from "../../data/transportModes";

import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";

export default function HomeScreen({ navigation }) {
  // State for addresses and coordinates
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  // State for routes and selection
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [mode, setMode] = useState("driving");

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width
  );
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const debounceTimeout = useRef(null);

  // Get user's current location on mount
  useEffect(() => {
    const getUserLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền truy cập vị trí bị từ chối",
          "Ứng dụng cần quyền truy cập vị trí để hoạt động."
        );
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        setStartCoords([latitude, longitude]);
        setStart("Vị trí hiện tại của bạn");
      } catch (e) {
        console.error("Lỗi lấy vị trí hiện tại:", e);
        Alert.alert("Lỗi", "Không thể lấy vị trí hiện tại của bạn.");
      }
    };
    getUserLocation();
  }, []);

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
        console.error(
          "Lỗi Autocomplete Mapbox:",
          e.response ? e.response.data : e.message
        );
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
  const calculateEmissions = (distance, transportMode) => {
    const distanceKm = distance / 1000;
    const emissionFactors = {
      driving: 170,
      walking: 0,
      cycling: 0,
      "driving-traffic": 200,
    };
    return (distanceKm * (emissionFactors[transportMode] || 150)).toFixed(0);
  };

  // Fetch routes from Mapbox API
  const fetchRoute = async () => {
    if (!startCoords || !endCoords) {
      setError("Vui lòng chọn điểm đi và điểm đến.");
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
            overview: "full",
            steps: false,
            alternatives: true,
          },
        }
      );

      if (res.data.routes && res.data.routes.length > 0) {
        const routesData = res.data.routes.map((route, index) => ({
          geometry: route.geometry,
          distance: route.distance,
          duration: route.duration / 60,
          emissions: calculateEmissions(route.distance, mode),
        }));
        setRoutes(routesData);
      } else {
        setError("Không tìm thấy tuyến đường cho các điểm đã chọn.");
      }
    } catch (error) {
      console.error(
        "Lỗi Mapbox Directions API:",
        error.response ? error.response.data : error.message
      );
      setError(
        "Không thể lấy dữ liệu tuyến đường. Vui lòng kiểm tra kết nối hoặc thử lại."
      );
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

  // Get dynamic form container style based on screen width
  const getFormContainerStyle = () => {
    if (screenWidth <= 768) {
      return {
        width: sidebarOpen ? "80%" : 0,
        opacity: sidebarOpen ? 1 : 0,
      };
    }
    return {
      width: sidebarOpen ? 400 : 0,
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapWrapper
          startCoords={startCoords}
          endCoords={endCoords}
          routes={routes}
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
          selectedRouteIndex={selectedRouteIndex}
        />
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
                </View>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
        </View>
      )}
    </View>
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
});
