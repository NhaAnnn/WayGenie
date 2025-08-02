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
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  MAPBOX_PUBLIC_ACCESS_TOKEN,
  BACKEND_API_BASE_URL,
} from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AIR_QUALITY_API_URL = `${BACKEND_API_BASE_URL}/aqis`;

const debounce = (func, delay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
};

export default function StationManagement({ navigation }) {
  // State management
  const [layersVisibility, setLayersVisibility] = useState({
    airQuality: true,
    coordinates: false,
  });
  const [rawAirQualityData, setRawAirQualityData] = useState([]);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);
  const [airQualityData, setAirQualityData] = useState({
    type: "FeatureCollection",
    features: [],
  });
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

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsBackendGraphDataLoading(true);
      let url = AIR_QUALITY_API_URL;

      if (searchQuery) {
        url += `?stationName=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể tải dữ liệu");
      }

      setRawAirQualityData(data);
      setStations(data);
      processAirQualityData(data);
      setIsError(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsError(true);
      toast.error(`Lỗi khi tải dữ liệu: ${error.message}`);
    } finally {
      setIsBackendGraphDataLoading(false);
    }
  }, [searchQuery]);

  // Process air quality data for map
  const processAirQualityData = useCallback((aqData) => {
    const airQualityFeatures = aqData.map((station, index) => ({
      type: "Feature",
      properties: {
        stationUid: station.stationUid || `station-${index}`,
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
  }, []);

  // Get AQI status
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

  // Handle form submission for new station
  const handleCreateStation = async () => {
    if (
      !newStationForm.stationName ||
      !newStationForm.longitude ||
      !newStationForm.latitude
    ) {
      toast.error("Vui lòng điền đầy đủ tên trạm và tọa độ");
      return;
    }

    const longitude = parseFloat(newStationForm.longitude);
    const latitude = parseFloat(newStationForm.latitude);

    if (isNaN(longitude) || isNaN(latitude)) {
      toast.error("Kinh độ và vĩ độ phải là số hợp lệ");
      return;
    }

    try {
      setLoading(true);

      const stationUid = Date.now();
      const response = await fetch(AIR_QUALITY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stationUid: stationUid,
          stationName: newStationForm.stationName,
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          aqi: parseFloat(newStationForm.aqi) || 0,
          pm25: parseFloat(newStationForm.pm25) || 0,
          pm10: parseFloat(newStationForm.pm10) || 0,
          co: parseFloat(newStationForm.co) || 0,
          no2: parseFloat(newStationForm.no2) || 0,
          so2: parseFloat(newStationForm.so2) || 0,
          o3: parseFloat(newStationForm.o3) || 0,
          time: new Date().toISOString(),
          description: newStationForm.description || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể tạo trạm mới");
      }

      toast.success("Thêm trạm mới thành công");
      setIsFormVisible(false);
      setSearchQuery("");
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(`Lỗi khi thêm trạm: ${error.message}`);
      console.error("Create station error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle station update
  const handleUpdateStation = async (stationData) => {
    if (!stationData._id || !stationData.stationUid) {
      toast.error("Thiếu ID trạm");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${AIR_QUALITY_API_URL}/${stationData._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stationName: stationData.stationName,
            location: {
              type: "Point",
              coordinates: [
                parseFloat(stationData.location.coordinates[0]),
                parseFloat(stationData.location.coordinates[1]),
              ],
            },
            aqi: parseFloat(stationData.aqi) || 0,
            pm25: parseFloat(stationData.pm25) || 0,
            pm10: parseFloat(stationData.pm10) || 0,
            co: parseFloat(stationData.co) || 0,
            no2: parseFloat(stationData.no2) || 0,
            so2: parseFloat(stationData.so2) || 0,
            o3: parseFloat(stationData.o3) || 0,
            time: new Date().toISOString(),
            description: stationData.description || "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể cập nhật trạm");
      }

      toast.success("Cập nhật trạm thành công");
      setIsFormVisible(false);
      setSearchQuery("");
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(`Lỗi khi cập nhật trạm: ${error.message}`);
      console.error("Update station error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle station deletion
  const deleteStation = async (id) => {
    if (!id) {
      toast.error("Thiếu ID trạm");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${AIR_QUALITY_API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Không thể xóa trạm");
      }

      toast.success("Đã xóa trạm quan trắc thành công");
      setIsFormVisible(false);
      setSearchQuery("");
      fetchData();
    } catch (error) {
      toast.error(`Lỗi khi xóa trạm: ${error.message}`);
      console.error("Delete station error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
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

  // Handle map click for position selection
  const handleMapClick = useCallback(
    (event) => {
      if (isSelectingPosition) {
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
          toast.success(
            `Đã chọn tọa độ: [${lngLat.lng.toFixed(6)}, ${lngLat.lat.toFixed(
              6
            )}]`
          );
        } else {
          console.error("Invalid lngLat format:", lngLat);
          toast.error("Không thể lấy tọa độ từ bản đồ");
        }
      }
    },
    [isSelectingPosition, newStationForm]
  );

  // Toggle layer visibility
  const toggleLayer = (layerName) => {
    setLayersVisibility((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  // Initialize data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <SafeAreaView style={styles.container}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <View style={styles.mapContainer}>
        {isBackendGraphDataLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>
              {isError ? "Lỗi tải dữ liệu" : "Đang tải dữ liệu..."}
            </Text>
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

      {/* Navigation buttons */}
      <TouchableWithoutFeedback
        onPress={() => navigation.navigate("AdminDashboard")}
      >
        <View style={styles.homeButton}>
          <Ionicons name="home" size={24} color="#3366dd" />
        </View>
      </TouchableWithoutFeedback>

      <TouchableWithoutFeedback
        onPress={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <View style={styles.toggleButton}>
          <MaterialIcons
            name={isSidebarOpen ? "arrow-back" : "arrow-back"}
            size={24}
            color="#3366dd"
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Sidebar content */}
      {isSidebarOpen && (
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isFormVisible
                ? selectedStation
                  ? "Chỉnh sửa trạm"
                  : "Thêm trạm mới"
                : "Quản Lý Trạm Quan Trắc"}
            </Text>
            <TouchableWithoutFeedback onPress={() => setIsSidebarOpen(false)}>
              <View>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </View>
            </TouchableWithoutFeedback>
          </View>

          {/* Ẩn thanh tìm kiếm và nút thêm khi ở chế độ form */}
          {!isFormVisible && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm theo tên trạm..."
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text)}
                placeholderTextColor="#999"
              />
              <TouchableWithoutFeedback
                onPress={() => {
                  resetForm();
                  setIsFormVisible(true);
                }}
              >
                <View style={styles.addButton}>
                  <MaterialIcons name="add" size={24} color="#fff" />
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}

          {isFormVisible ? (
            <ScrollView style={styles.content}>
              {isSelectingPosition && (
                <View style={styles.selectingNodeContainer}>
                  <Text style={styles.selectingNodeText}>
                    Đang chọn tọa độ trên bản đồ...
                  </Text>
                  <TouchableWithoutFeedback
                    onPress={() => {
                      setIsSelectingPosition(false);
                      setSelectedPosition(null);
                    }}
                  >
                    <View style={styles.cancelSelectButton}>
                      <MaterialIcons name="close" size={20} color="#F44336" />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              )}

              {/* Form fields */}
              <Text style={styles.inputLabel}>Tên trạm</Text>
              <TextInput
                style={styles.input}
                placeholder="Tên trạm*"
                value={newStationForm.stationName}
                onChangeText={(text) =>
                  setNewStationForm({ ...newStationForm, stationName: text })
                }
              />

              <Text style={styles.inputLabel}>Tọa độ</Text>
              <View style={styles.coordinateRow}>
                <View style={styles.nodeInputContainer}>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="Kinh độ*"
                    keyboardType="numeric"
                    value={newStationForm.longitude}
                    onChangeText={(text) =>
                      /^-?\d*\.?\d*$/.test(text) &&
                      setNewStationForm({ ...newStationForm, longitude: text })
                    }
                    editable={!isSelectingPosition}
                  />
                </View>
                <View style={styles.nodeInputContainer}>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="Vĩ độ*"
                    keyboardType="numeric"
                    value={newStationForm.latitude}
                    onChangeText={(text) =>
                      /^-?\d*\.?\d*$/.test(text) &&
                      setNewStationForm({ ...newStationForm, latitude: text })
                    }
                    editable={!isSelectingPosition}
                  />
                </View>
                <TouchableWithoutFeedback
                  onPress={() => setIsSelectingPosition(true)}
                  disabled={isSelectingPosition}
                >
                  <View style={styles.selectNodeButton}>
                    <MaterialIcons
                      name="location-pin"
                      size={20}
                      color="#1E90FF"
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>

              <Text style={styles.inputLabel}>Chỉ số AQI</Text>
              <TextInput
                style={styles.input}
                placeholder="Chỉ số AQI"
                keyboardType="numeric"
                value={newStationForm.aqi}
                onChangeText={(text) =>
                  /^\d*\.?\d*$/.test(text) &&
                  setNewStationForm({ ...newStationForm, aqi: text })
                }
              />

              <Text style={styles.inputLabel}>Chất lượng không khí</Text>
              <View style={styles.airQualityRow}>
                <View style={styles.nodeInputContainer}>
                  <Text style={styles.airQualityLabel}>PM2.5</Text>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="PM2.5"
                    keyboardType="numeric"
                    value={newStationForm.pm25}
                    onChangeText={(text) =>
                      /^\d*\.?\d*$/.test(text) &&
                      setNewStationForm({ ...newStationForm, pm25: text })
                    }
                  />
                </View>
                <View style={styles.nodeInputContainer}>
                  <Text style={styles.airQualityLabel}>PM10</Text>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="PM10"
                    keyboardType="numeric"
                    value={newStationForm.pm10}
                    onChangeText={(text) =>
                      /^\d*\.?\d*$/.test(text) &&
                      setNewStationForm({ ...newStationForm, pm10: text })
                    }
                  />
                </View>
              </View>

              <View style={styles.airQualityRow}>
                <View style={styles.nodeInputContainer}>
                  <Text style={styles.airQualityLabel}>CO</Text>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="CO"
                    keyboardType="numeric"
                    value={newStationForm.co}
                    onChangeText={(text) =>
                      /^\d*\.?\d*$/.test(text) &&
                      setNewStationForm({ ...newStationForm, co: text })
                    }
                  />
                </View>
                <View style={styles.nodeInputContainer}>
                  <Text style={styles.airQualityLabel}>NO2</Text>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="NO2"
                    keyboardType="numeric"
                    value={newStationForm.no2}
                    onChangeText={(text) =>
                      /^\d*\.?\d*$/.test(text) &&
                      setNewStationForm({ ...newStationForm, no2: text })
                    }
                  />
                </View>
              </View>

              <View style={styles.airQualityRow}>
                <View style={styles.nodeInputContainer}>
                  <Text style={styles.airQualityLabel}>SO2</Text>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="SO2"
                    keyboardType="numeric"
                    value={newStationForm.so2}
                    onChangeText={(text) =>
                      /^\d*\.?\d*$/.test(text) &&
                      setNewStationForm({ ...newStationForm, so2: text })
                    }
                  />
                </View>
                <View style={styles.nodeInputContainer}>
                  <Text style={styles.airQualityLabel}>O3</Text>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="O3"
                    keyboardType="numeric"
                    value={newStationForm.o3}
                    onChangeText={(text) =>
                      /^\d*\.?\d*$/.test(text) &&
                      setNewStationForm({ ...newStationForm, o3: text })
                    }
                  />
                </View>
              </View>

              <View style={styles.formButtons}>
                <TouchableWithoutFeedback onPress={resetForm}>
                  <View style={[styles.formButton, styles.cancelButton]}>
                    <Text style={styles.buttonText}>Hủy</Text>
                  </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback
                  onPress={() => {
                    const stationData = {
                      ...newStationForm,
                      _id: selectedStation?._id,
                      stationUid: selectedStation?.stationUid || Date.now(),
                      location: {
                        type: "Point",
                        coordinates: [
                          parseFloat(newStationForm.longitude),
                          parseFloat(newStationForm.latitude),
                        ],
                      },
                      time: new Date().toISOString(),
                    };

                    if (selectedStation) {
                      handleUpdateStation(stationData);
                    } else {
                      handleCreateStation();
                    }
                  }}
                  disabled={loading}
                >
                  <View style={[styles.formButton, styles.saveButton]}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {selectedStation ? "Cập nhật" : "Lưu"}
                      </Text>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </ScrollView>
          ) : (
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stationText}>
                        {station.stationName?.length > 30
                          ? `${station.stationName.substring(0, 27)}...`
                          : station.stationName}
                      </Text>
                      <Text style={styles.stationSubText}>
                        AQI: {station.aqi || "N/A"} | ID: {station.stationUid}
                      </Text>
                    </View>
                    <View style={styles.iconGroup}>
                      <TouchableWithoutFeedback
                        onPress={() => {
                          setSelectedStation(station);
                          setNewStationForm({
                            stationName: station.stationName,
                            longitude:
                              station.location?.coordinates[0]?.toString() ||
                              "",
                            latitude:
                              station.location?.coordinates[1]?.toString() ||
                              "",
                            aqi: station.aqi?.toString() || "",
                            pm25: station.pm25?.toString() || "",
                            pm10: station.pm10?.toString() || "",
                            co: station.co?.toString() || "",
                            no2: station.no2?.toString() || "",
                            so2: station.so2?.toString() || "",
                            o3: station.o3?.toString() || "",
                            description: station.description || "",
                          });
                          setSelectedPosition(
                            station.location?.coordinates
                              ? [...station.location.coordinates]
                              : null
                          );
                          setIsFormVisible(true);
                        }}
                      >
                        <View style={styles.actionButton}>
                          <MaterialIcons
                            name="edit"
                            size={20}
                            color="#4CAF50"
                          />
                        </View>
                      </TouchableWithoutFeedback>
                      <TouchableWithoutFeedback
                        onPress={() => deleteStation(station._id)}
                      >
                        <View style={styles.actionButton}>
                          <MaterialIcons
                            name="delete"
                            size={20}
                            color="#F44336"
                          />
                        </View>
                      </TouchableWithoutFeedback>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Layer controls */}
      <View style={styles.floatingLayerControlsLeft}>
        <Text style={styles.controlPanelTitle}>Lớp dữ liệu:</Text>
        <View style={styles.layerButtonsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(layersVisibility).map((key) => (
              <TouchableWithoutFeedback
                key={key}
                onPress={() => toggleLayer(key)}
              >
                <View
                  style={[
                    styles.layerButton,
                    layersVisibility[key] ? styles.layerButtonActive : {},
                  ]}
                >
                  <Text style={styles.layerButtonText}>
                    {key === "airQuality" ? "Chất lượng không khí" : "Tọa độ"}
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Styles
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
    backgroundColor: "#fff",
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
  actionButton: {
    marginLeft: 10,
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
  selectingNodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  selectingNodeText: {
    fontSize: 14,
    color: "#1E90FF",
    fontWeight: "bold",
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  coordinateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  airQualityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    justifyContent: "space-between",
  },
  nodeInputContainer: {
    flex: 1,
    height: 50,
    marginRight: 10,
  },
  nodeInput: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
  selectNodeButton: {
    width: 40,
    height: 40,
    marginBottom: 15,
    marginRight: 10,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelSelectButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  formButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#1E90FF",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  airQualityLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
  },
  floatingLayerControlsLeft: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 20,
    left: 15,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    padding: 10,
    flexDirection: "column",
    alignItems: "flex-start",
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
    textAlign: "left",
  },
  layerButtonsContainer: {
    flexDirection: "row",
    marginBottom: 5,
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  layerButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginTop: 5,
    marginRight: 8,
    borderWidth: 0,
    alignSelf: "flex-start",
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
