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
} from "react-native";
import axios from "axios";
import MapWrapper from "./MapWrapper";
import * as Location from "expo-location";

// Giả định file này chứa dữ liệu phương tiện
import { transportModes } from "../../data/transportModes";

const MAPBOX_PUBLIC_ACCESS_TOKEN =
  "pk.eyJ1IjoiYjIxMTAxMzQiLCJhIjoiY21iNHdrOXhtMWFrNjJpcTNubjJpMm1ubiJ9.vNGTPpbwgT8y67WhexdpJg";

export default function HomeScreen() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState("driving");

  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const debounceTimeout = useRef(null);

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

  const fetchRoute = async () => {
    if (!startCoords || !endCoords) {
      setError("Vui lòng chọn điểm đi và điểm đến.");
      return;
    }

    setLoading(true);
    setError("");
    setRouteGeoJSON(null);

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
          },
        }
      );

      if (res.data.routes && res.data.routes.length > 0) {
        setRouteGeoJSON(res.data.routes[0].geometry);
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

  const handleFindRoute = () => {
    if (!startCoords || !endCoords) {
      Alert.alert("Thông báo", "Vui lòng chọn điểm đi và điểm đến từ gợi ý.");
      return;
    }
    fetchRoute();
  };

  return (
    <View style={styles.container}>
      {/* Form Container (Control Panel) */}
      <View style={styles.formContainer}>
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
              <Text style={styles.findButtonText}>🧭 Tìm đường</Text>
            )}
          </TouchableOpacity>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapWrapper
          startCoords={startCoords}
          endCoords={endCoords}
          routeGeoJSON={routeGeoJSON}
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Thay đổi từ "column" sang "row" để chia 2 cột trên Web/lớn hơn
    flexDirection:
      Platform.OS === "web" || window.innerWidth > 768 ? "row" : "column",
  },
  formContainer: {
    flex: 1, // Chiếm 1 phần
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: Platform.OS === "web" || window.innerWidth > 768 ? 0 : 1, // Bỏ border dưới trên web
    borderRightWidth: Platform.OS === "web" || window.innerWidth > 768 ? 1 : 0, // Thêm border phải trên web
    borderBottomColor: "#eee",
    borderRightColor: "#eee",
    paddingTop: Platform.OS === "android" ? 40 : 60,
  },
  mapContainer: {
    flex: 3, // Chiếm 1 phần còn lại
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
});
