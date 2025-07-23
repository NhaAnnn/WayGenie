import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  MAPBOX_PUBLIC_ACCESS_TOKEN,
  BACKEND_API_BASE_URL,
} from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AIR_QUALITY_API_URL = `${BACKEND_API_BASE_URL}/aqis`;

// Hàm debounce tự tạo
const debounce = (func, delay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
};

export default function StationManagement({ navigation }) {
  // State for data layers
  const [layersVisibility, setLayersVisibility] = useState({
    airQuality: true,
    coordinates: false, // Tắt layer coordinates để tránh xung đột
  });

  // Backend data state
  const [rawAirQualityData, setRawAirQualityData] = useState([]);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);

  // Data for map layers
  const [airQualityData, setAirQualityData] = useState({
    type: "FeatureCollection",
    features: [],
  });

  // Station management state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stations, setStations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [newStationForm, setNewStationForm] = useState({
    stationName: "",
    longitude: "",
    latitude: "",
    aqi: "",
    pm25: "",
    pm10: "",
    co: "",
    no2: "",
    so2: "",
    o3: "",
    description: "",
  });
  const [isSelectingPosition, setIsSelectingPosition] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  const { width: screenWidth } = Dimensions.get("window");
  const sidebarWidth = Platform.select({
    web: 500,
    default: screenWidth * 0.8,
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsBackendGraphDataLoading(true);
        const aqRes = await fetch(AIR_QUALITY_API_URL);
        const aqData = await aqRes.json();

        setRawAirQualityData(aqData);
        setStations(aqData);
        processAirQualityData(aqData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsError(true);
      } finally {
        setIsBackendGraphDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // Tự động tìm kiếm khi searchQuery thay đổi
  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoading(true);
        const url = searchQuery
          ? `${AIR_QUALITY_API_URL}?stationName=${encodeURIComponent(
              searchQuery
            )}`
          : AIR_QUALITY_API_URL;

        const response = await fetch(url);
        const data = await response.json();
        setStations(data);
      } catch (error) {
        toast.error("Không thể tải dữ liệu trạm quan trắc");
      } finally {
        setLoading(false);
      }
    };

    if (searchQuery === "") {
      fetchStations();
    } else {
      const debouncedFetch = debounce(fetchStations, 500);
      debouncedFetch();
    }
  }, [searchQuery]);

  const processAirQualityData = (aqData) => {
    const airQualityFeatures = aqData.map((station, index) => ({
      type: "Feature",
      properties: {
        stationId: station.stationUid || `station-${index}`,
        stationName: station.stationName || `Trạm ${index}`,
        aqi: station.aqi || 0,
        pm25: station.pm25 || 0,
        co: station.co || 0,
        no2: station.no2 || 0,
        so2: station.so2 || 0,
        o3: station.o3 || 0,
        status: getAqiStatus(station.aqi).description,
        timestamp: station.time || "Không rõ",
      },
      geometry: station.location || { type: "Point", coordinates: [0, 0] },
    }));

    setAirQualityData({
      type: "FeatureCollection",
      features: airQualityFeatures,
    });
  };

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

  const handleCreateStation = async () => {
    if (
      !newStationForm.stationName ||
      !newStationForm.longitude ||
      !newStationForm.latitude
    ) {
      toast.error("Vui lòng điền đầy đủ tên trạm và tọa độ");
      return;
    }
    if (
      isNaN(parseFloat(newStationForm.longitude)) ||
      isNaN(parseFloat(newStationForm.latitude))
    ) {
      toast.error("Kinh độ và vĩ độ phải là số hợp lệ");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(AIR_QUALITY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stationUid: Date.now(),
          stationName: newStationForm.stationName,
          aqi: parseFloat(newStationForm.aqi) || 0,
          pm25: parseFloat(newStationForm.pm25) || 0,
          pm10: parseFloat(newStationForm.pm10) || 0,
          co: parseFloat(newStationForm.co) || 0,
          no2: parseFloat(newStationForm.no2) || 0,
          so2: parseFloat(newStationForm.so2) || 0,
          o3: parseFloat(newStationForm.o3) || 0,
          location: {
            type: "Point",
            coordinates: [
              parseFloat(newStationForm.longitude),
              parseFloat(newStationForm.latitude),
            ],
          },
          description: newStationForm.description,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Thêm trạm mới thành công");
        setIsFormVisible(false);
        setSearchQuery("");
        resetForm();
      } else {
        throw new Error(data.message || "Failed to create station");
      }
    } catch (error) {
      toast.error(`Lỗi khi thêm trạm: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStation = async (stationData) => {
    if (
      !stationData.stationName ||
      !stationData.location.coordinates[0] ||
      !stationData.location.coordinates[1]
    ) {
      toast.error("Vui lòng điền đầy đủ tên trạm và tọa độ");
      return;
    }
    try {
      setLoading(true);
      const { stationUid, ...updateData } = stationData;

      const response = await fetch(
        `${AIR_QUALITY_API_URL}/${stationData._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Cập nhật trạm thành công");
        setIsFormVisible(false);
        setSearchQuery("");
        resetForm();
      } else {
        throw new Error(data.message || "Failed to update station");
      }
    } catch (error) {
      toast.error(`Lỗi khi cập nhật trạm: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteStation = async (id) => {
    try {
      const response = await fetch(`${AIR_QUALITY_API_URL}/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Đã xóa trạm quan trắc thành công");
        setIsFormVisible(false);
        setSearchQuery("");
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete station");
      }
    } catch (error) {
      toast.error("Không thể xóa trạm quan trắc");
    }
  };

  const resetForm = () => {
    setNewStationForm({
      stationName: "",
      longitude: "",
      latitude: "",
      aqi: "",
      pm25: "",
      pm10: "",
      co: "",
      no2: "",
      so2: "",
      o3: "",
      description: "",
    });
    setSelectedStation(null);
    setIsSelectingPosition(false);
    setSelectedPosition(null);
    setIsFormVisible(false);
  };

  const handleMapClick = useCallback(
    (event) => {
      console.log("Map clicked, isSelectingPosition:", isSelectingPosition);
      console.log("Event data:", event);
      if (isSelectingPosition) {
        // react-map-gl trả về event.lngLat dạng { lng, lat } hoặc [lng, lat]
        const lngLat = Array.isArray(event.lngLat)
          ? { lng: event.lngLat[0], lat: event.lngLat[1] }
          : event.lngLat;
        if (
          lngLat &&
          typeof lngLat.lng === "number" &&
          typeof lngLat.lat === "number"
        ) {
          setNewStationForm({
            ...newStationForm,
            longitude: lngLat.lng.toFixed(6),
            latitude: lngLat.lat.toFixed(6),
          });
          setSelectedPosition([lngLat.lng, lngLat.lat]);
          setIsSelectingPosition(false);
          toast.info("Đã chọn tọa độ từ bản đồ");
        } else {
          console.error("Invalid lngLat format:", lngLat);
          toast.error("Không thể lấy tọa độ từ bản đồ");
        }
      }
    },
    [isSelectingPosition, newStationForm]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        {isBackendGraphDataLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
          </View>
        )}

        <MapWrapper
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
          initialCenter={[105.8342, 21.0278]}
          initialZoom={12}
          layersVisibility={layersVisibility}
          airQualityData={airQualityData}
          onClick={isSelectingPosition ? handleMapClick : null}
          selectedPosition={selectedPosition}
        />
      </View>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate("AdminDashboard")}
      >
        <Ionicons name="home" size={24} color="#3366dd" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => {
          console.log("Toggle sidebar, current state:", isSidebarOpen);
          setIsSidebarOpen(!isSidebarOpen);
        }}
      >
        <MaterialIcons
          name={isSidebarOpen ? "arrow-back" : "edit-location"}
          size={24}
          color="#3366dd"
        />
      </TouchableOpacity>

      {isSidebarOpen && (
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quản Lý Trạm Quan Trắc</Text>
            <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm trạm quan trắc"
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                console.log("Opening form for new station");
                resetForm();
                setIsFormVisible(true);
              }}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {isFormVisible && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {selectedStation ? "Chỉnh sửa trạm" : "Thêm trạm mới"}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Tên trạm*"
                value={newStationForm.stationName}
                onChangeText={(text) =>
                  setNewStationForm({ ...newStationForm, stationName: text })
                }
              />

              <View style={styles.coordinateRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Kinh độ*"
                    keyboardType="numeric"
                    value={newStationForm.longitude}
                    onChangeText={(text) =>
                      setNewStationForm({ ...newStationForm, longitude: text })
                    }
                    editable={!isSelectingPosition}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Vĩ độ*"
                    keyboardType="numeric"
                    value={newStationForm.latitude}
                    onChangeText={(text) =>
                      setNewStationForm({ ...newStationForm, latitude: text })
                    }
                    editable={!isSelectingPosition}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.pickButton,
                    isSelectingPosition && styles.pickButtonActive,
                  ]}
                  onPress={() => {
                    console.log(
                      "Toggling position selection, current state:",
                      isSelectingPosition
                    );
                    setIsSelectingPosition(!isSelectingPosition);
                  }}
                  disabled={loading}
                >
                  <MaterialIcons
                    name={
                      isSelectingPosition ? "location-searching" : "location-on"
                    }
                    size={24}
                    color={isSelectingPosition ? "white" : "#1E90FF"}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Chất lượng không khí</Text>

              <View style={styles.airQualityRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Chỉ số AQI"
                    keyboardType="numeric"
                    value={newStationForm.aqi}
                    onChangeText={(text) =>
                      setNewStationForm({ ...newStationForm, aqi: text })
                    }
                  />
                  <Text style={styles.unitText}>AQI</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="PM2.5"
                    keyboardType="numeric"
                    value={newStationForm.pm25}
                    onChangeText={(text) =>
                      setNewStationForm({ ...newStationForm, pm25: text })
                    }
                  />
                  <Text style={styles.unitText}>µg/m³</Text>
                </View>
              </View>

              <View style={styles.airQualityRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="PM10"
                    keyboardType="numeric"
                    value={newStationForm.pm10}
                    onChangeText={(text) =>
                      setNewStationForm({ ...newStationForm, pm10: text })
                    }
                  />
                  <Text style={styles.unitText}>µg/m³</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="CO"
                    keyboardType="numeric"
                    value={newStationForm.co}
                    onChangeText={(text) =>
                      setNewStationForm({ ...newStationForm, co: text })
                    }
                  />
                  <Text style={styles.unitText}>ppm</Text>
                </View>
              </View>

              <View style={styles.airQualityRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="NO2"
                    keyboardType="numeric"
                    value={newStationForm.no2}
                    onChangeText={(text) =>
                      setNewStationForm({ ...newStationForm, no2: text })
                    }
                  />
                  <Text style={styles.unitText}>ppb</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="SO2"
                    keyboardType="numeric"
                    value={newStationForm.so2}
                    onChangeText={(text) =>
                      setNewStationForm({ ...newStationForm, so2: text })
                    }
                  />
                  <Text style={styles.unitText}>ppb</Text>
                </View>
              </View>

              <View style={{ marginBottom: 15 }}>
                <TextInput
                  style={styles.input}
                  placeholder="O3"
                  keyboardType="numeric"
                  value={newStationForm.o3}
                  onChangeText={(text) =>
                    setNewStationForm({ ...newStationForm, o3: text })
                  }
                />
                <Text style={styles.unitText}>ppb</Text>
              </View>

              <View style={styles.formButtonRow}>
                {selectedStation && (
                  <TouchableOpacity
                    style={[styles.formButton, styles.deleteButton]}
                    onPress={() => deleteStation(selectedStation._id)}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>Xóa</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={resetForm}
                >
                  <Text style={styles.buttonText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formButton, styles.saveButton]}
                  onPress={() => {
                    const stationData = {
                      stationName: newStationForm.stationName,
                      aqi: parseFloat(newStationForm.aqi) || 0,
                      pm25: parseFloat(newStationForm.pm25) || 0,
                      pm10: parseFloat(newStationForm.pm10) || 0,
                      co: parseFloat(newStationForm.co) || 0,
                      no2: parseFloat(newStationForm.no2) || 0,
                      so2: parseFloat(newStationForm.so2) || 0,
                      o3: parseFloat(newStationForm.o3) || 0,
                      location: {
                        type: "Point",
                        coordinates: [
                          parseFloat(newStationForm.longitude),
                          parseFloat(newStationForm.latitude),
                        ],
                      },
                      description: newStationForm.description,
                    };

                    if (selectedStation) {
                      handleUpdateStation({
                        ...stationData,
                        _id: selectedStation._id,
                      });
                    } else {
                      handleCreateStation();
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {selectedStation ? "Cập nhật" : "Thêm trạm"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView style={styles.content}>
            {loading ? (
              <ActivityIndicator size="large" color="#1E90FF" />
            ) : stations.length === 0 ? (
              <Text style={styles.noDataText}>
                {searchQuery
                  ? "Không tìm thấy trạm phù hợp"
                  : "Không có dữ liệu trạm quan trắc"}
              </Text>
            ) : (
              stations.map((station) => (
                <View key={station._id} style={styles.stationItem}>
                  <View>
                    <Text style={styles.stationText}>
                      {station.stationName.length > 50
                        ? `${station.stationName.substring(0, 47)}...`
                        : station.stationName}
                    </Text>
                    <Text style={styles.stationSubText}>
                      AQI: {station.aqi || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.iconGroup}>
                    <TouchableOpacity
                      onPress={() => {
                        console.log("Editing station:", station);
                        setSelectedStation(station);
                        setNewStationForm({
                          stationName: station.stationName,
                          longitude:
                            station.location?.coordinates[0]?.toString() || "",
                          latitude:
                            station.location?.coordinates[1]?.toString() || "",
                          aqi: station.aqi?.toString() || "",
                          pm25: station.pm25?.toString() || "",
                          pm10: station.pm10?.toString() || "",
                          co: station.co?.toString() || "",
                          no2: station.no2?.toString() || "",
                          so2: station.so2?.toString() || "",
                          o3: station.o3?.toString() || "",
                          description: station.description || "",
                        });
                        setIsFormVisible(true);
                        setSelectedPosition(
                          station.location?.coordinates
                            ? [
                                station.location.coordinates[0],
                                station.location.coordinates[1],
                              ]
                            : null
                        );
                      }}
                    >
                      <MaterialIcons name="edit" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (
                          confirm(
                            `Bạn có chắc muốn xóa trạm ${station.stationName}?`
                          )
                        ) {
                          deleteStation(station._id);
                        }
                      }}
                    >
                      <MaterialIcons name="delete" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
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
  mapContainer: {
    flex: 1,
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
  },
  sidebar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderLeftColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 200,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#1E90FF",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E90FF",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 10,
  },
  stationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#eee",
  },
  stationText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  stationSubText: {
    color: "#666",
    fontSize: 14,
  },
  iconGroup: {
    flexDirection: "row",
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
    right: 20,
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
  noDataText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
    fontSize: 16,
  },
  formContainer: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1E90FF",
  },
  input: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  coordinateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pickButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  pickButtonActive: {
    backgroundColor: "#1E90FF",
  },
  airQualityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  formButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  formButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    marginLeft: 10,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  saveButton: {
    backgroundColor: "#1E90FF",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    marginRight: "auto",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  unitText: {
    position: "absolute",
    right: 10,
    top: 10,
    color: "#666",
    fontSize: 12,
  },
});
