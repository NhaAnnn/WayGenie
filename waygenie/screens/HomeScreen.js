import React, { useState, useRef } from "react";
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
} from "react-native";
import axios from "axios";
import MapWrapper from "../screens/MapWrapper";
import { transportModes } from "../data/transportModes";

const GRAPH_HOPPER_API_KEY = "YOUR_GRAPHHOPPER_API_KEY";

export default function HomeScreen() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState("bike"); // "car", "bike", "foot"

  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);

  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);

  const debounceTimeout = useRef(null);

  const handleAutocomplete = async (text, inputType) => {
    if (!text) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.get(`https://graphhopper.com/api/1/geocode`, {
          params: {
            key: GRAPH_HOPPER_API_KEY,
            q: text,
            limit: 5,
            locale: "vi",
          },
        });
        setSuggestions(res.data.hits);
        setActiveInput(inputType);
      } catch (e) {
        console.error(e);
        setSuggestions([]);
      }
    }, 300);
  };

  const selectSuggestion = (place) => {
    const coords = [place.point.lat, place.point.lng];
    const address = place.name + ", " + (place.city || place.country || "");

    if (activeInput === "start") {
      setStart(address);
      setStartCoords(coords);
    } else {
      setEnd(address);
      setEndCoords(coords);
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const fetchRoute = async () => {
    if (!startCoords || !endCoords) return;

    try {
      const res = await axios.get(`https://graphhopper.com/api/1/route`, {
        params: {
          key: GRAPH_HOPPER_API_KEY,
          point: [
            `${startCoords[0]},${startCoords[1]}`,
            `${endCoords[0]},${endCoords[1]}`,
          ],
          vehicle: mode,
          locale: "vi",
          instructions: false,
          points_encoded: false,
        },
      });

      const coords = res.data.paths[0].points.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]);
      setRouteCoords(coords);
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể lấy dữ liệu tuyến đường.");
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
      <View style={styles.splitContainer}>
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
            />
            <TextInput
              style={styles.input}
              placeholder="🏁 Nhập điểm đến"
              value={end}
              onChangeText={(text) => {
                setEnd(text);
                handleAutocomplete(text, "end");
              }}
            />
            {suggestions.length > 0 && (
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
                    <Text>
                      {item.name}, {item.city || item.country}
                    </Text>
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
                    mode === item.key && styles.modeButtonSelected,
                  ]}
                  onPress={() => setMode(item.key)}
                >
                  <Text
                    style={[
                      styles.modeText,
                      mode === item.key && styles.modeTextSelected,
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
            >
              <Text style={styles.findButtonText}>🧭 Tìm đường</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <MapWrapper
          startCoords={startCoords}
          endCoords={endCoords}
          routeCoords={routeCoords}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  splitContainer: { flex: 1, flexDirection: "row" },
  formContainer: { flex: 1, padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  suggestionList: {
    backgroundColor: "#fff",
    maxHeight: 200,
    marginBottom: 10,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 20 },
  modeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  modeButton: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 10,
  },
  modeButtonSelected: { backgroundColor: "#007BFF" },
  modeText: { fontSize: 14, color: "#333" },
  modeTextSelected: { color: "#fff", fontWeight: "bold" },
  findButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  findButtonText: { color: "#fff", fontSize: 16 },
});
