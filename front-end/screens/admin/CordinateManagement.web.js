import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  MAPBOX_PUBLIC_ACCESS_TOKEN,
  BACKEND_API_BASE_URL,
} from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";

export default function CoordinateManagement({ navigation }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [mode, setMode] = useState("driving");
  const [routePreference, setRoutePreference] = useState("fastest");
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width
  );
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coordinatesInfo, setCoordinatesInfo] = useState(null);
  const [layersVisibility, setLayersVisibility] = useState({
    traffic: true,
    coordinates: true,
  });
  const [allCoordinates, setAllCoordinates] = useState([]);
  const [filteredCoordinates, setFilteredCoordinates] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);
  const [trafficData, setTrafficData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [coordinatesData, setCoordinatesData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingCoordinate, setIsAddingCoordinate] = useState(false);
  const [currentCoordinate, setCurrentCoordinate] = useState(null);
  const [formData, setFormData] = useState({
    node_id: "",
    longitude: "",
    latitude: "",
    volprt: "",
  });
  const [isSelectingCoordinate, setIsSelectingCoordinate] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [coordinateToDelete, setCoordinateToDelete] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);

  const COORDINATES_API_URL = `${BACKEND_API_BASE_URL}/coordinates`;
  const ROUTES_API_URL = `${BACKEND_API_BASE_URL}/routes`;
  const debounceTimeout = useRef(null);

  const sidebarWidth = Platform.select({
    web: 500,
    default: Dimensions.get("window").width * 0.8,
  });

  const fetchGraphData = useCallback(async () => {
    setIsBackendGraphDataLoading(true);
    setIsError(false);

    try {
      const [coordsResponse, routesResponse] = await Promise.allSettled([
        fetch(COORDINATES_API_URL),
        fetch(ROUTES_API_URL),
      ]);

      let errorOccurred = false;

      if (coordsResponse.status === "fulfilled" && coordsResponse.value.ok) {
        const coordsData = await coordsResponse.value.json();
        setAllCoordinates(coordsData);
        setFilteredCoordinates(coordsData);
        setCoordinatesData({
          type: "FeatureCollection",
          features: coordsData.map((coord) => ({
            type: "Feature",
            properties: {
              node_id: coord.node_id,
              nodeName: coord.node_name || `Node ${coord.node_id || "N/A"}`,
            },
            geometry: coord.location || { type: "Point", coordinates: [0, 0] },
          })),
        });
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

      setIsError(errorOccurred);
    } catch (error) {
      console.error("General network error:", error);
      setIsError(true);
    } finally {
      setIsBackendGraphDataLoading(false);
    }
  }, [COORDINATES_API_URL, ROUTES_API_URL]);

  const processRealtimeData = useCallback(() => {
    if (allCoordinates.length === 0 || allRoutes.length === 0) return;

    const coordinatesMap = new Map();
    allCoordinates.forEach((coord) => {
      coordinatesMap.set(coord.node_id, coord);
    });

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

    if (!searchQuery) {
      setCoordinatesData({
        type: "FeatureCollection",
        features: allCoordinates.map((coord) => ({
          type: "Feature",
          properties: {
            node_id: coord.node_id,
            nodeName: coord.node_name || `Node ${coord.node_id || "N/A"}`,
          },
          geometry: coord.location || { type: "Point", coordinates: [0, 0] },
        })),
      });
    }
  }, [allCoordinates, allRoutes, searchQuery]);

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      const filtered = query
        ? allCoordinates.filter((coord) =>
            coord.node_id.toString().includes(query)
          )
        : allCoordinates;

      setFilteredCoordinates(filtered);

      setCoordinatesData({
        type: "FeatureCollection",
        features: filtered.map((coord) => ({
          type: "Feature",
          properties: {
            node_id: coord.node_id,
            nodeName: coord.node_name || `Node ${coord.node_id || "N/A"}`,
          },
          geometry: coord.location || { type: "Point", coordinates: [0, 0] },
        })),
      });
    },
    [allCoordinates]
  );

  const openAddEditForm = (coordinate = null) => {
    setCurrentCoordinate(coordinate);
    setFormData({
      node_id: coordinate?.node_id?.toString() || "",
      longitude: coordinate?.location?.coordinates[0]?.toString() || "",
      latitude: coordinate?.location?.coordinates[1]?.toString() || "",
      volprt: coordinate?.volprt?.toString() || "",
    });
    setIsAddingCoordinate(true);
    setIsSidebarOpen(true);
    setIsSelectingCoordinate(false);
    setSelectedPosition(null);
  };

  const closeAddEditForm = () => {
    setIsAddingCoordinate(false);
    setCurrentCoordinate(null);
    setFormData({
      node_id: "",
      longitude: "",
      latitude: "",
      volprt: "",
    });
    setIsSelectingCoordinate(false);
    setSelectedPosition(null);
  };

  const validateForm = () => {
    if (!formData.node_id || isNaN(formData.node_id)) {
      toast.error("Node ID phải là số hợp lệ");
      return false;
    }
    if (!formData.longitude || isNaN(formData.longitude)) {
      toast.error("Kinh độ phải là số hợp lệ");
      return false;
    }
    if (!formData.latitude || isNaN(formData.latitude)) {
      toast.error("Vĩ độ phải là số hợp lệ");
      return false;
    }
    return true;
  };

  const saveCoordinate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const method = currentCoordinate ? "PUT" : "POST";
      const url = currentCoordinate
        ? `${COORDINATES_API_URL}/${formData.node_id}`
        : COORDINATES_API_URL;

      const payload = {
        node_id: parseInt(formData.node_id),
        location: {
          type: "Point",
          coordinates: [
            parseFloat(formData.longitude),
            parseFloat(formData.latitude),
          ],
        },
        volprt: parseInt(formData.volprt) || 0,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Không thể lưu tọa độ");
      }

      toast.success(
        currentCoordinate
          ? "Cập nhật tọa độ thành công"
          : "Thêm tọa độ mới thành công"
      );
      closeAddEditForm();
      fetchGraphData();
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCoordinate = async (nodeId) => {
    const coordinate = allCoordinates.find((c) => c.node_id === nodeId);
    if (!coordinate) {
      toast.error("Không tìm thấy tọa độ");
      return;
    }
    setCoordinateToDelete(coordinate);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteCoordinate = async () => {
    try {
      setLoading(true);
      const url = `${COORDINATES_API_URL}/${coordinateToDelete.node_id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Không thể xóa tọa độ");
      }

      toast.success("Đã xóa tọa độ thành công");
      setIsDeleteModalVisible(false);
      setCoordinateToDelete(null);
      fetchGraphData();
    } catch (error) {
      toast.error(`Lỗi khi xóa tọa độ: ${error.message}`);
      console.error("Delete coordinate error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = useCallback(
    (event) => {
      if (isSelectingCoordinate) {
        const { lng, lat } = event.lngLat;
        setFormData((prev) => ({
          ...prev,
          longitude: lng.toFixed(6),
          latitude: lat.toFixed(6),
        }));
        setSelectedPosition([lng, lat]);
        setIsSelectingCoordinate(false);
        toast.success(`Đã chọn tọa độ: [${lng.toFixed(6)}, ${lat.toFixed(6)}]`);
      }
    },
    [isSelectingCoordinate]
  );

  const toggleLayer = (layerName) => {
    setLayersVisibility((prevState) => ({
      ...prevState,
      [layerName]: !prevState[layerName],
    }));
  };

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

  const closeCoordinatesInfo = () => {
    setCoordinatesInfo(null);
  };

  useEffect(() => {
    const updateDimensions = () => {
      const width = Dimensions.get("window").width;
      setScreenWidth(width);
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

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    if (!isBackendGraphDataLoading && !isError) {
      processRealtimeData();
    }
  }, [isBackendGraphDataLoading, isError, processRealtimeData]);

  useEffect(() => {
    if (startCoords && endCoords) {
      // fetchRoute(); // Uncomment and implement if needed
    }
  }, [mode, routePreference, startCoords, endCoords]);

  const isLoading =
    isBackendGraphDataLoading ||
    !trafficData.features.length ||
    !coordinatesData.features.length;

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
          coordinatesData={coordinatesData}
          onCoordinateMarkerPress={handleCoordinateMarkerPress}
          coordinatesInfo={coordinatesInfo}
          onCloseCoordinatesPanel={closeCoordinatesInfo}
          onClick={handleMapClick}
          selectedPosition={selectedPosition}
        />
      </View>

      <TouchableWithoutFeedback
        onPress={() => navigation.navigate("AdminDashboard")}
      >
        <View style={styles.homeButton}>
          <Ionicons name="home" size={24} color="#3366dd" />
        </View>
      </TouchableWithoutFeedback>

      {!isSidebarOpen && (
        <TouchableWithoutFeedback onPress={() => setIsSidebarOpen(true)}>
          <View style={styles.coordinateButton}>
            <MaterialIcons name="arrow-back" size={24} color="#3366dd" />
          </View>
        </TouchableWithoutFeedback>
      )}

      {isSidebarOpen && (
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {isAddingCoordinate
                ? currentCoordinate
                  ? "Chỉnh sửa tọa độ"
                  : "Thêm tọa độ mới"
                : "Quản Lý Tọa Độ"}
            </Text>
            <TouchableWithoutFeedback onPress={() => setIsSidebarOpen(false)}>
              <View>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </View>
            </TouchableWithoutFeedback>
          </View>

          {isAddingCoordinate ? (
            <ScrollView style={styles.content}>
              {isSelectingCoordinate && (
                <View style={styles.selectingNodeContainer}>
                  <Text style={styles.selectingNodeText}>
                    Đang chọn tọa độ trên bản đồ...
                  </Text>
                  <TouchableWithoutFeedback
                    onPress={() => {
                      setIsSelectingCoordinate(false);
                      setSelectedPosition(null);
                    }}
                  >
                    <View style={styles.cancelSelectButton}>
                      <MaterialIcons name="close" size={20} color="#F44336" />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              )}
              <Text style={styles.inputLabel}>Node ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Node ID*"
                keyboardType="numeric"
                value={formData.node_id}
                onChangeText={(text) =>
                  setFormData({ ...formData, node_id: text })
                }
                editable={!currentCoordinate}
              />
              <Text style={styles.inputLabel}>Tọa độ</Text>
              <View style={styles.coordRow}>
                <View style={styles.nodeInputContainer}>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="Kinh độ*"
                    keyboardType="numeric"
                    value={formData.longitude}
                    onChangeText={(text) =>
                      setFormData({ ...formData, longitude: text })
                    }
                    editable={!isSelectingCoordinate}
                  />
                </View>
                <View style={styles.nodeInputContainer}>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="Vĩ độ*"
                    keyboardType="numeric"
                    value={formData.latitude}
                    onChangeText={(text) =>
                      setFormData({ ...formData, latitude: text })
                    }
                    editable={!isSelectingCoordinate}
                  />
                </View>
                <TouchableWithoutFeedback
                  onPress={() => {
                    setIsSelectingCoordinate(true);
                  }}
                  disabled={isSelectingCoordinate}
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
              <Text style={styles.inputLabel}>Lưu lượng qua nút (số xe)</Text>
              <TextInput
                style={styles.input}
                placeholder="Volrpt"
                keyboardType="numeric"
                value={formData.volprt}
                onChangeText={(text) =>
                  setFormData({ ...formData, volprt: text })
                }
              />
              <View style={styles.formButtons}>
                <TouchableWithoutFeedback onPress={closeAddEditForm}>
                  <View style={[styles.formButton, styles.cancelButton]}>
                    <Text style={styles.buttonText}>Hủy</Text>
                  </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback
                  onPress={saveCoordinate}
                  disabled={loading}
                >
                  <View style={[styles.formButton, styles.saveButton]}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {currentCoordinate ? "Cập nhật" : "Lưu"}
                      </Text>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm theo Node ID..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <TouchableWithoutFeedback onPress={() => openAddEditForm()}>
                  <View style={styles.addButton}>
                    <MaterialIcons name="add" size={24} color="#fff" />
                  </View>
                </TouchableWithoutFeedback>
              </View>

              <ScrollView style={styles.content}>
                {isBackendGraphDataLoading ? (
                  <ActivityIndicator size="large" color="#1E90FF" />
                ) : filteredCoordinates.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "Không tìm thấy kết quả"
                      : "Không có dữ liệu"}
                  </Text>
                ) : (
                  filteredCoordinates.map((coord) => (
                    <View key={coord.node_id} style={styles.coordItem}>
                      <View style={styles.coordInfo}>
                        <Text style={styles.coordTitle}>
                          ID: {coord.node_id}
                        </Text>
                        <Text style={styles.coordSubtitle}>
                          [{coord.location?.coordinates[0] || 0},{" "}
                          {coord.location?.coordinates[1] || 0}]
                        </Text>
                        <Text style={styles.coordSubtitle}>
                          Volrpt: {coord.volprt || "N/A"}
                        </Text>
                      </View>
                      <View style={styles.coordActions}>
                        <TouchableWithoutFeedback
                          onPress={() => openAddEditForm(coord)}
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
                          onPress={() => deleteCoordinate(coord.node_id)}
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
            </>
          )}
        </View>
      )}

      {isDeleteModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>
              Bạn có chắc muốn xóa tọa độ Node ID {coordinateToDelete?.node_id}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableWithoutFeedback onPress={confirmDeleteCoordinate}>
                <View style={[styles.modalButton, styles.deleteButton]}>
                  <Text style={styles.buttonText}>Xóa</Text>
                </View>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <View style={[styles.modalButton, styles.cancelButton]}>
                  <Text style={styles.buttonText}>Hủy</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </View>
      )}

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
                    {key === "traffic" ? "Giao thông" : "Tọa độ"}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
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
  coordinateButton: {
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
  headerText: {
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
  coordItem: {
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
  coordInfo: {
    flex: 1,
  },
  coordTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  coordSubtitle: {
    color: "#666",
    fontSize: 14,
  },
  coordActions: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 10,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
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
    marginBottom: 15,
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  nodeInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  nodeInput: {
    flex: 1,
    marginRight: 5,
  },
  selectNodeButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginBottom: 15,
    marginRight: 10,
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
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
});
