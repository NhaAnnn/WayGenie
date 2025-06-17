import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  SafeAreaView,
  FlatList,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import MapWrapper from "../../components/MapWrapper";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets";

// Kiểm tra token Mapbox
if (!MAPBOX_PUBLIC_ACCESS_TOKEN) {
  console.error("Mapbox token is missing!");
}

const DEFAULT_HANOI_COORDS = [105.8342, 21.0278]; // [lon, lat]

// Mảng màu sắc cho các tuyến đường
const ROUTE_COLORS = [
  "#3366FF", // Xanh dương
  "#FF5733", // Cam
  "#33FF57", // Xanh lá
  "#FF33F1", // Hồng
  "#33FFF5", // Xanh ngọc
];

const SimulatedTrafficScreen = ({ navigation }) => {
  // Refs
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const abortControllerRef = useRef(new AbortController());

  // State
  const [inputLayouts, setInputLayouts] = useState({ start: null, end: null });
  const [startPoint, setStartPoint] = useState({ address: "", coords: null });
  const [endPoint, setEndPoint] = useState({ address: "", coords: null });
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [activeInput, setActiveInput] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState({
    search: false,
    route: false,
    map: true,
  });
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width
  );

  // Debounce hooks
  const debouncedStartText = useDebounce(startPoint.address, 300);
  const debouncedEndText = useDebounce(endPoint.address, 300);

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

  // Cleanup effect
  useEffect(() => {
    return () => {
      abortControllerRef.current.abort();
    };
  }, []);

  // Autocomplete effect
  useEffect(() => {
    if (
      activeInput &&
      (activeInput === "start" ? debouncedStartText : debouncedEndText)
    ) {
      handleAutocomplete(
        activeInput === "start" ? debouncedStartText : debouncedEndText
      );
    }
  }, [debouncedStartText, debouncedEndText, activeInput]);

  const handleAutocomplete = async (text) => {
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    if (!text) {
      setSuggestions([]);
      return;
    }

    setLoading((prev) => ({ ...prev, search: true }));

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
          signal: abortControllerRef.current.signal,
        }
      );

      setSuggestions(
        res.data.features.map((feature) => ({
          name: feature.place_name,
          coords: feature.center, // [lon, lat]
        }))
      );
      setError("");
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error("Autocomplete error:", err);
        setError("Không thể lấy gợi ý địa điểm. Vui lòng thử lại.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, search: false }));
    }
  };

  const selectSuggestion = (place) => {
    Keyboard.dismiss();
    const point = { address: place.name, coords: place.coords };

    if (activeInput === "start") {
      setStartPoint(point);
    } else {
      setEndPoint(point);
    }

    setSuggestions([]);
    setActiveInput(null);
  };

  const findRoute = async () => {
    if (!startPoint.coords || !endPoint.coords) {
      Alert.alert("Lỗi", "Vui lòng chọn điểm đi và điểm đến từ gợi ý.");
      return;
    }

    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading((prev) => ({ ...prev, route: true }));
    setError("");
    setRoutes([]);
    setSelectedRouteIndex(0);

    try {
      const start = startPoint.coords.join(",");
      const end = endPoint.coords.join(",");

      const res = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            geometries: "geojson",
            overview: "full",
            alternatives: true,
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (res.data?.routes?.length > 0) {
        const routesData = res.data.routes.map((route, index) => ({
          geometry: route.geometry,
          distance: route.distance,
          duration: route.duration / 60,
          color: ROUTE_COLORS[index % ROUTE_COLORS.length], // Thêm màu sắc
        }));

        setRoutes(routesData);
      } else {
        setError("Không tìm thấy tuyến đường phù hợp");
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error("Route error:", err);
        setError("Lỗi khi tìm tuyến đường. Vui lòng thử lại.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, route: false }));
    }
  };

  const selectRoute = (index) => {
    setSelectedRouteIndex(index);
  };

  const measureInputLayout = (ref, name) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setInputLayouts((prev) => ({ ...prev, [name]: { x, y, width, height } }));
    });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

  const mapCenter =
    routes[selectedRouteIndex]?.geometry?.coordinates?.[0] ||
    startPoint.coords ||
    DEFAULT_HANOI_COORDS;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapWrapper
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
          startCoords={startPoint.coords}
          endCoords={endPoint.coords}
          routes={routes.map((r) => ({
            geometry: r.geometry,
            color: r.color,
          }))}
          selectedRouteIndex={selectedRouteIndex}
          initialCenter={mapCenter}
          initialZoom={12}
          onMapLoadedCallback={() =>
            setLoading((prev) => ({ ...prev, map: false }))
          }
        />
      </View>

      {sidebarOpen && (
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("AdminDashboard")}
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
            <Text style={styles.title}>Cấu hình Tuyến đường</Text>

            <View style={styles.card}>
              <Text style={styles.subtitle}>Điểm đi và điểm đến:</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={startInputRef}
                  style={styles.input}
                  placeholder="📍 Điểm bắt đầu"
                  value={startPoint.address}
                  onChangeText={(text) =>
                    setStartPoint((p) => ({ ...p, address: text }))
                  }
                  onFocus={() => {
                    setActiveInput("start");
                    measureInputLayout(startInputRef, "start");
                  }}
                  onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={endInputRef}
                  style={styles.input}
                  placeholder="🏁 Điểm kết thúc"
                  value={endPoint.address}
                  onChangeText={(text) =>
                    setEndPoint((p) => ({ ...p, address: text }))
                  }
                  onFocus={() => {
                    setActiveInput("end");
                    measureInputLayout(endInputRef, "end");
                  }}
                  onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                />
              </View>

              {activeInput && suggestions.length > 0 && (
                <FlatList
                  style={[
                    styles.suggestionList,
                    { top: inputLayouts[activeInput]?.y + 50 },
                  ]}
                  data={suggestions}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(item)}
                    >
                      <Text style={styles.suggestionText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  keyboardShouldPersistTaps="always"
                />
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  (!startPoint.coords || !endPoint.coords) &&
                    styles.buttonDisabled,
                ]}
                onPress={findRoute}
                disabled={
                  loading.route || !startPoint.coords || !endPoint.coords
                }
              >
                {loading.route ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Tìm Tuyến đường</Text>
                )}
              </TouchableOpacity>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {routes.length > 0 && (
                <View style={styles.routeFound}>
                  <Text style={styles.routeFoundText}>
                    ✅ Tuyến đường đã được tìm thấy!
                  </Text>

                  <View style={styles.routeOptionsContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {routes.map((route, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.routeOption,
                            selectedRouteIndex === index &&
                              styles.routeOptionSelected,
                            { backgroundColor: route.color + "40" }, // Màu với opacity 25%
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
                  </View>

                  <View style={styles.routeInfoContainer}>
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
                      <Text style={styles.routeInfoLabel}>Thời gian:</Text>
                      <Text style={styles.routeInfoValue}>
                        {Math.floor(routes[selectedRouteIndex].duration)} phút
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() =>
                      navigation.navigate("ConfigureRouteScreen", {
                        routeData: routes[selectedRouteIndex],
                        startAddress: startPoint.address,
                        endAddress: endPoint.address,
                        routeStartCoords: [
                          startPoint.coords[1],
                          startPoint.coords[0],
                        ], // [lat, lon]
                        routeEndCoords: [
                          endPoint.coords[1],
                          endPoint.coords[0],
                        ], // [lat, lon]
                      })
                    }
                  >
                    <Text style={styles.detailsButtonText}>
                      Cấu hình Tuyến đường này
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

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
    transform: [{ translateX: 40 }],

    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 10,
  },
  inputContainer: {
    position: "relative",
    zIndex: 1,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "white",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
  routeFound: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e6ffe6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#a6e6a6",
  },
  routeFoundText: {
    color: "green",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  coordinateText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
    textAlign: "center",
  },
  detailsButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    width: "100%",
  },
  detailsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  suggestionList: {
    position: "absolute",
    backgroundColor: "#fff",
    maxHeight: 200,
    width: "100%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 100,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  suggestionText: {
    fontSize: 16,
    color: "#333",
  },
  routeOptionsContainer: {
    marginBottom: 15,
  },
  routeOption: {
    padding: 10,
    marginRight: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  routeOptionSelected: {
    borderWidth: 2,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
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

export default SimulatedTrafficScreen;
