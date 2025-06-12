// screens/SimulatedTrafficScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  SafeAreaView, // Sử dụng SafeAreaView
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import axios from "axios";

// Đảm bảo đường dẫn đến MapWrapper và secrets.js là chính xác trong dự án của bạn
// Nếu file này nằm trong `screens/admin/` thì đường dẫn `../../components/MapWrapper` là đúng.
import MapWrapper from "../../components/MapWrapper";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets";
import { useNavigation } from "@react-navigation/native";

MapboxGL.setAccessToken(MAPBOX_PUBLIC_ACCESS_TOKEN);

const { width, height } = Dimensions.get("window");

// Hook debounce để tránh gọi API quá thường xuyên
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

// Vị trí mặc định Hà Nội khi chưa có gì [vĩ độ, kinh độ]
const DEFAULT_HANOI_COORDS_LAT_LON = [21.0278, 105.8342];

const SimulatedTrafficScreen = () => {
  // Đã đổi tên component để khớp với mã bạn cung cấp
  const navigation = useNavigation();

  // Refs để lấy vị trí của TextInput cho autocomplete overlay
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  // States để lưu vị trí của TextInput trên màn hình
  const [inputLayouts, setInputLayouts] = useState({
    start: null, // {x, y, width, height}
    end: null,
  });

  const [startPointAddress, setStartPointAddress] = useState("");
  const [endPointAddress, setEndPointAddress] = useState("");
  const [startCoordsFound, setStartCoordsFound] = useState(null); // [lat, lon] from geocoding
  const [endCoordsFound, setEndCoordsFound] = useState(null); // [lat, lon] from geocoding
  const [foundRouteData, setFoundRouteData] = useState([]); // Array of routes from Mapbox Directions API

  const [activeInput, setActiveInput] = useState(null); // 'start' or 'end'
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [routeSearchError, setRouteSearchError] = useState("");
  const [isRouteFound, setIsRouteFound] = useState(false);

  const [mapLoaded, setMapLoaded] = useState(false);

  // Debounced input texts for autocomplete
  const debouncedStartText = useDebounce(startPointAddress, 300);
  const debouncedEndText = useDebounce(endPointAddress, 300);

  // Effects for Autocomplete
  useEffect(() => {
    if (activeInput === "start") {
      console.log("Debounced start text changed:", debouncedStartText);
      handleAutocomplete(debouncedStartText, "start");
    }
  }, [debouncedStartText]);

  useEffect(() => {
    if (activeInput === "end") {
      console.log("Debounced end text changed:", debouncedEndText);
      handleAutocomplete(debouncedEndText, "end");
    }
  }, [debouncedEndText]);

  /**
   * Xử lý autocomplete cho các trường nhập địa chỉ.
   * Gửi yêu cầu tới Mapbox Geocoding API và cập nhật danh sách gợi ý.
   * @param {string} text - Văn bản hiện tại trong trường nhập.
   * @param {string} inputType - Loại trường nhập ('start' hoặc 'end').
   */
  const handleAutocomplete = async (text, inputType) => {
    console.log(
      `handleAutocomplete called for ${inputType} with text: "${text}"`
    );
    if (!text) {
      setAutocompleteSuggestions([]);
      console.log("Autocomplete text is empty. Clearing suggestions.");
      return;
    }

    setIsSearchingRoute(true);
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
        // Mapbox geocoding returns [longitude, latitude], but our state stores [latitude, longitude]
        coords: [feature.center[1], feature.center[0]],
      }));

      setAutocompleteSuggestions(hits);
      setRouteSearchError("");
      console.log(
        `Found ${hits.length} autocomplete suggestions for ${inputType}.`
      );
    } catch (e) {
      console.error(
        "Lỗi Autocomplete Mapbox:",
        e.response ? e.response.data : e.message
      );
      setAutocompleteSuggestions([]);
      setRouteSearchError("Không thể lấy gợi ý địa điểm. Vui lòng thử lại.");
    } finally {
      setIsSearchingRoute(false);
    }
  };

  /**
   * Chọn một gợi ý từ danh sách autocomplete và cập nhật trường nhập tương ứng.
   * @param {object} place - Đối tượng địa điểm được chọn từ gợi ý.
   */
  const selectAutocompleteSuggestion = (place) => {
    console.log("Selected suggestion:", place.name);
    Keyboard.dismiss();
    if (activeInput === "start") {
      setStartPointAddress(place.name);
      setStartCoordsFound(place.coords); // Store as [lat, lon]
      console.log("Start Coords set to:", place.coords);
    } else {
      setEndPointAddress(place.name);
      setEndCoordsFound(place.coords); // Store as [lat, lon]
      console.log("End Coords set to:", place.coords);
    }
    setAutocompleteSuggestions([]);
    setActiveInput(null);
    console.log("Autocomplete suggestions cleared. Active input reset.");
  };

  /**
   * Tìm tuyến đường giữa điểm bắt đầu và điểm kết thúc đã chọn.
   */
  const findRoute = async () => {
    if (!startCoordsFound || !endCoordsFound) {
      Alert.alert(
        "Lỗi",
        "Vui lòng chọn điểm đi và điểm đến cho tuyến đường từ gợi ý."
      );
      return;
    }

    setIsSearchingRoute(true);
    setRouteSearchError("");
    setFoundRouteData([]);
    setIsRouteFound(false);

    try {
      // Mapbox Directions API expects [longitude, latitude] for coordinates in the URL
      const startLonLat = `${startCoordsFound[1]},${startCoordsFound[0]}`;
      const endLonLat = `${endCoordsFound[1]},${endCoordsFound[0]}`;

      const res = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startLonLat};${endLonLat}`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            geometries: "geojson",
            overview: "full",
            steps: true,
            alternatives: true, // Fetch alternative routes
          },
        }
      );

      if (res.data.routes && res.data.routes.length > 0) {
        setFoundRouteData(res.data.routes);
        setIsRouteFound(true);
        Alert.alert(
          "Thành công",
          "Đã tìm thấy tuyến đường. Bạn có thể cấu hình nó ngay bây giờ."
        );
      } else {
        setRouteSearchError("Không tìm thấy tuyến đường cho các điểm đã chọn.");
        setIsRouteFound(false);
      }
    } catch (error) {
      console.error(
        "Lỗi Mapbox Directions API:",
        error.response ? error.response.data : error.message
      );
      if (error.response && error.response.status === 401) {
        setRouteSearchError(
          "Lỗi xác thực API. Vui lòng kiểm tra lại Access Token Mapbox của bạn."
        );
      } else if (error.response && error.response.data) {
        setRouteSearchError(
          `Lỗi tìm đường: ${error.response.data.message || error.message}`
        );
      } else {
        setRouteSearchError(
          `Không thể lấy dữ liệu tuyến đường: ${error.message}. Vui lòng kiểm tra kết nối hoặc thử lại.`
        );
      }
      setIsRouteFound(false);
    } finally {
      setIsSearchingRoute(false);
    }
  };

  /**
   * Callback khi bản đồ trong MapWrapper đã tải xong.
   */
  const onMapLoadedCallback = () => {
    console.log("MapWrapper reported map loaded.");
    setMapLoaded(true);
  };

  // Xác định vị trí trung tâm ban đầu cho bản đồ:
  // Nếu có tuyến đường đã tìm thấy, lấy điểm bắt đầu của tuyến đường đó.
  // Nếu không, sử dụng vị trí mặc định của Hà Nội.
  const mapInitialCenter =
    isRouteFound &&
    foundRouteData.length > 0 &&
    foundRouteData[0].geometry &&
    foundRouteData[0].geometry.coordinates.length > 0
      ? foundRouteData[0].geometry.coordinates[0] // Điểm đầu tiên của tuyến đường [lon, lat]
      : [DEFAULT_HANOI_COORDS_LAT_LON[1], DEFAULT_HANOI_COORDS_LAT_LON[0]]; // Mặc định Hà Nội [lon, lat]

  // Hàm để đo vị trí của input
  const measureInputLayout = (ref, name) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      console.log(
        `Measured layout for ${name}: {x: ${x}, y: ${y}, width: ${width}, height: ${height}}`
      );
      setInputLayouts((prev) => ({
        ...prev,
        [name]: { x, y, width, height },
      }));
    });
  };

  // Render phần suggestions dưới dạng một overlay
  const renderSuggestionsOverlay = () => {
    console.log("Rendering suggestions overlay conditions:");
    console.log("  activeInput:", activeInput);
    console.log(
      "  autocompleteSuggestions.length:",
      autocompleteSuggestions.length
    );
    console.log("  inputLayouts[activeInput]:", inputLayouts[activeInput]);

    if (
      !activeInput ||
      autocompleteSuggestions.length === 0 ||
      !inputLayouts[activeInput]
    ) {
      return null;
    }

    const { x, y, width, height } = inputLayouts[activeInput];
    console.log(
      `Overlay position calculated: top: ${
        y + height
      }, left: ${x}, width: ${width}`
    );

    return (
      <View
        style={[
          styles.suggestionListOverlay,
          {
            top: y + height, // Đặt ngay dưới input
            left: x,
            width: width, // Chiều rộng bằng input
          },
        ]}
      >
        <ScrollView keyboardShouldPersistTaps="always">
          {autocompleteSuggestions.map((item, index) => (
            <TouchableOpacity
              key={`s_${activeInput}_${item.coords[0]}_${item.coords[1]}_${index}`}
              onPress={() => selectAutocompleteSuggestion(item)}
              style={styles.suggestionItem}
            >
              <Text style={styles.suggestionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Tìm và Cấu hình Tuyến đường</Text>
          <View style={styles.card}>
            <Text style={styles.formSubTitle}>Điểm đi và điểm đến:</Text>
            <View style={styles.inputContainerWithSuggestions}>
              <TextInput
                ref={startInputRef}
                style={styles.input}
                placeholder="📍 Điểm bắt đầu tuyến đường"
                value={startPointAddress}
                onChangeText={setStartPointAddress}
                onFocus={() => {
                  console.log("Start Input: onFocus");
                  setActiveInput("start");
                  measureInputLayout(startInputRef, "start");
                }}
                onBlur={() => {
                  console.log(
                    "Start Input: onBlur - setting timeout for null activeInput"
                  );
                  setTimeout(() => setActiveInput(null), 200);
                }}
                onLayout={() => {
                  console.log("Start Input: onLayout");
                  measureInputLayout(startInputRef, "start");
                }}
              />
            </View>

            <View style={styles.inputContainerWithSuggestions}>
              <TextInput
                ref={endInputRef}
                style={styles.input}
                placeholder="🏁 Điểm kết thúc tuyến đường"
                value={endPointAddress}
                onChangeText={setEndPointAddress}
                onFocus={() => {
                  console.log("End Input: onFocus");
                  setActiveInput("end");
                  measureInputLayout(endInputRef, "end");
                }}
                onBlur={() => {
                  console.log(
                    "End Input: onBlur - setting timeout for null activeInput"
                  );
                  setTimeout(() => setActiveInput(null), 200);
                }}
                onLayout={() => {
                  console.log("End Input: onLayout");
                  measureInputLayout(endInputRef, "end");
                }}
              />
            </View>

            <TouchableOpacity
              style={styles.findRouteButton}
              onPress={findRoute}
              disabled={
                isSearchingRoute || !startCoordsFound || !endCoordsFound
              }
            >
              {isSearchingRoute ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.findRouteButtonText}>Tìm Tuyến đường</Text>
              )}
            </TouchableOpacity>
            {routeSearchError ? (
              <Text style={styles.errorText}>{routeSearchError}</Text>
            ) : null}

            {isRouteFound && (
              <View style={styles.routeDetailsContainer}>
                <Text style={styles.routeFoundText}>
                  ✅ Tuyến đường đã được tìm thấy!
                </Text>
                {startCoordsFound && (
                  <Text style={styles.coordinateText}>
                    Điểm bắt đầu: Lat {startCoordsFound[0].toFixed(4)}, Lon{" "}
                    {startCoordsFound[1].toFixed(4)}
                  </Text>
                )}
                {endCoordsFound && (
                  <Text style={styles.coordinateText}>
                    Điểm kết thúc: Lat {endCoordsFound[0].toFixed(4)}, Lon{" "}
                    {endCoordsFound[1].toFixed(4)}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.configureButton}
                  onPress={() => {
                    navigation.navigate("ConfigureRouteScreen", {
                      foundRouteData: foundRouteData,
                      startAddress: startPointAddress,
                      endAddress: endPointAddress,
                      routeStartCoords: startCoordsFound,
                      routeEndCoords: endCoordsFound,
                    });
                    // Reset fields after navigating
                    setStartPointAddress("");
                    setEndPointAddress("");
                    setStartCoordsFound(null);
                    setEndCoordsFound(null);
                    setFoundRouteData([]);
                    setIsRouteFound(false);
                  }}
                >
                  <Text style={styles.configureButtonText}>
                    Cấu hình Tuyến đường này
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Map Section */}
        <View style={styles.mapContainer}>
          {!mapLoaded && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
            </View>
          )}
          <MapWrapper
            mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
            startCoords={
              isRouteFound && startCoordsFound
                ? [startCoordsFound[1], startCoordsFound[0]]
                : null
            } // Mapbox expects [lon, lat]
            endCoords={
              isRouteFound && endCoordsFound
                ? [endCoordsFound[1], endCoordsFound[0]]
                : null
            } // Mapbox expects [lon, lat]
            routeGeoJSONs={foundRouteData.map((route) => route.geometry)} // Truyền mảng GeoJSONs
            initialCenter={mapInitialCenter}
            initialZoom={10}
            styleURL={MapboxGL.Style.OUTDOORS} // Sử dụng phong cách ngoài trời
            onMapLoadedCallback={onMapLoadedCallback}
          />
        </View>
      </View>
      {renderSuggestionsOverlay()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  formSubTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 10,
    marginTop: 5,
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
  inputContainerWithSuggestions: {
    position: "relative",
    zIndex: 1, // Lower zIndex for container itself
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "white",
    fontSize: 16,
  },
  findRouteButton: {
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  findRouteButtonText: {
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
  routeDetailsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e6ffe6", // Light green background
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#a6e6a6",
    alignItems: "center",
  },
  routeFoundText: {
    color: "green",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  coordinateText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  configureButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
    width: "100%",
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  configureButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  mapContainer: {
    flex: 1,
    width: "100%",
    height: height * 0.5, // Chiếm nửa dưới màn hình
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
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  suggestionListOverlay: {
    position: "absolute",
    backgroundColor: "#fff",
    maxHeight: 200,
    borderRadius: 10, // Đã có bo góc
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999, // Đảm bảo nổi lên trên tất cả mọi thứ
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
});

export default SimulatedTrafficScreen;
