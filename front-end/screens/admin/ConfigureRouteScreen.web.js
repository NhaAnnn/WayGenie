import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { useNavigation, useRoute } from "@react-navigation/native";

import MapWrapper from "../../components/MapWrapper";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets";

MapboxGL.setAccessToken(MAPBOX_PUBLIC_ACCESS_TOKEN);

const ConfigureRouteScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Debug: Log all received params
  useEffect(() => {
    console.log("Params received:", route.params);
  }, []);

  // Nhận tham số với tên chính xác
  const {
    routeData = {},
    startAddress = "Không xác định",
    endAddress = "Không xác định",
    routeStartCoords = null,
    routeEndCoords = null,
    onIncidentConfigured = () => {},
  } = route.params || {};

  // Chuyển routeData thành mảng để tương thích với code hiện tại
  const foundRouteData = [routeData];

  // Hàm lấy thông tin tuyến đường
  const getRouteInfo = () => {
    // Ưu tiên sử dụng routeData từ params nếu có
    if (route.params?.routeData) {
      return route.params.routeData;
    }

    // Fallback cho các trường hợp khác
    if (!foundRouteData || foundRouteData.length === 0) return {};

    const firstItem = foundRouteData[0];
    if (firstItem.routes?.[0]) return firstItem.routes[0];
    if (firstItem.features?.[0]?.properties)
      return firstItem.features[0].properties;
    if (firstItem.properties) return firstItem.properties;
    return firstItem || {};
  };

  const routeInfo = getRouteInfo();
  console.log("Route info extracted:", routeInfo);

  // Tính toán thông tin tuyến đường
  const routeDistance = routeInfo.distance
    ? `${(routeInfo.distance / 1000).toFixed(1)} km`
    : "Không xác định";

  const routeDuration = routeInfo.duration
    ? `${Math.round(routeInfo.duration)} phút`
    : "Không xác định";

  // Incident states
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentType, setIncidentType] = useState("accident");
  const [incidentSeverity, setIncidentSeverity] = useState("medium");
  const [isAddingIncident, setIsAddingIncident] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(true);

  // Process coordinates - ensure [longitude, latitude] format
  const processCoords = (coords) => {
    if (!coords) return null;

    if (Array.isArray(coords)) {
      return coords.length >= 2 ? [coords[0], coords[1]] : null;
    }

    if (coords.longitude && coords.latitude) {
      return [coords.longitude, coords.latitude];
    }

    return null;
  };

  const startCoords = processCoords(routeStartCoords);
  const endCoords = processCoords(routeEndCoords);

  // Initial map center
  const initialMapCenter = startCoords || [105.84, 21.02]; // Default to Hanoi coordinates

  const handleAddIncidentToRoute = () => {
    if (!incidentDescription.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mô tả sự cố.");
      return;
    }

    setIsAddingIncident(true);

    if (!startCoords) {
      Alert.alert(
        "Lỗi",
        "Không thể xác định tọa độ cho sự cố. Vui lòng thử lại."
      );
      setIsAddingIncident(false);
      return;
    }

    const newIncident = {
      id: `route_incident_${Date.now()}`,
      location: `Tuyến đường từ ${startAddress} đến ${endAddress}`,
      description: incidentDescription.trim(),
      type: incidentType,
      severity: incidentSeverity,
      isActive: true,
      timestamp: new Date(),
      coordinates: startCoords,
    };

    onIncidentConfigured(newIncident);
    Alert.alert("Thành công", "Sự cố đã được thêm vào tuyến đường.");
    setIsAddingIncident(false);
    setModalVisible(false);
    navigation.goBack();
  };

  const onMapLoadedCallback = () => {
    setMapLoaded(true);
  };

  return (
    <View style={styles.container}>
      {/* Full Screen Map */}
      <View style={styles.fullScreenMap}>
        {!mapLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
          </View>
        )}
        <MapWrapper
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
          startCoords={startCoords}
          endCoords={endCoords}
          allRoutes={foundRouteData}
          initialCenter={initialMapCenter}
          initialZoom={12}
          styleURL="mapbox://styles/mapbox/dark-v10"
          onMapLoadedCallback={onMapLoadedCallback}
        />
      </View>

      {/* Centered Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          navigation.goBack();
        }}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalContentCentered}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Cấu hình Sự cố trên Tuyến đường
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  navigation.goBack();
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContainer}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.sectionTitle}>Tuyến đường đã chọn</Text>
              <View style={styles.card}>
                <Text style={styles.routeDetailText}>
                  Từ: <Text style={styles.routeAddress}>{startAddress}</Text>
                </Text>
                <Text style={styles.routeDetailText}>
                  Đến: <Text style={styles.routeAddress}>{endAddress}</Text>
                </Text>
                <Text style={styles.routeDetailText}>
                  Khoảng cách: {routeDistance}
                </Text>
                <Text style={styles.routeDetailText}>
                  Thời gian ước tính: {routeDuration}
                </Text>
                <Text style={styles.coordinatesText}>
                  Tọa độ bắt đầu:{" "}
                  {startCoords
                    ? `${startCoords[0].toFixed(6)}, ${startCoords[1].toFixed(
                        6
                      )}`
                    : "Không xác định"}
                </Text>
                <Text style={styles.coordinatesText}>
                  Tọa độ kết thúc:{" "}
                  {endCoords
                    ? `${endCoords[0].toFixed(6)}, ${endCoords[1].toFixed(6)}`
                    : "Không xác định"}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Thông tin sự cố</Text>
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="Mô tả sự cố (ví dụ: Tắc đường nặng, Tai nạn liên hoàn)"
                  value={incidentDescription}
                  onChangeText={setIncidentDescription}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.selectionContainer}>
                  <Text style={styles.pickerLabel}>Loại sự cố:</Text>
                  <View style={styles.selectionButtons}>
                    {[
                      { value: "accident", label: "Tai nạn" },
                      { value: "congestion", label: "Tắc đường" },
                      { value: "road_closure", label: "Đóng đường" },
                      { value: "natural_disaster", label: "Thiên tai" },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.selectionButton,
                          incidentType === item.value &&
                            styles.selectionButtonActive,
                        ]}
                        onPress={() => setIncidentType(item.value)}
                      >
                        <Text
                          style={[
                            styles.selectionButtonText,
                            incidentType === item.value &&
                              styles.selectionButtonTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.selectionContainer}>
                  <Text style={styles.pickerLabel}>Mức độ nghiêm trọng:</Text>
                  <View style={styles.selectionButtons}>
                    {[
                      { value: "low", label: "Thấp" },
                      { value: "medium", label: "Trung bình" },
                      { value: "high", label: "Cao" },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.selectionButton,
                          incidentSeverity === item.value &&
                            styles.selectionButtonActive,
                        ]}
                        onPress={() => setIncidentSeverity(item.value)}
                      >
                        <Text
                          style={[
                            styles.selectionButtonText,
                            incidentSeverity === item.value &&
                              styles.selectionButtonTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddIncidentToRoute}
                  disabled={isAddingIncident}
                >
                  {isAddingIncident ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      Thêm sự cố vào Tuyến đường
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreenMap: {
    flex: 1,
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContentCentered: {
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#333",
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    marginTop: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeDetailText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#555",
  },
  routeAddress: {
    fontWeight: "bold",
    color: "#333",
  },
  coordinatesText: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  selectionContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
    fontWeight: "bold",
  },
  selectionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  selectionButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginBottom: 8,
    marginRight: 5,
    flex: 1,
    minWidth: "48%",
    alignItems: "center",
  },
  selectionButtonActive: {
    backgroundColor: "#007BFF",
  },
  selectionButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  selectionButtonTextActive: {
    color: "white",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
});

export default ConfigureRouteScreen;
