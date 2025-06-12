// screens/admin/ConfigureRouteScreen.js
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
  Dimensions,
  Platform,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { useNavigation, useRoute } from "@react-navigation/native";

// Đảm bảo đường dẫn đúng
import MapWrapper from "../../components/MapWrapper";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets";

MapboxGL.setAccessToken(MAPBOX_PUBLIC_ACCESS_TOKEN);

const { width, height } = Dimensions.get("window");

const ConfigureRouteScreen = () => {
  const navigation = useNavigation();
  const route = useRoute(); // Hook để lấy params từ route

  // Lấy dữ liệu tuyến đường và callback từ params
  const {
    foundRouteData,
    startAddress,
    endAddress,
    routeStartCoords,
    routeEndCoords,
    onIncidentConfigured,
  } = route.params;

  // States cho thông tin sự cố
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentType, setIncidentType] = useState("accident");
  const [incidentSeverity, setIncidentSeverity] = useState("medium");
  const [isAddingIncident, setIsAddingIncident] = useState(false);

  const [mapLoaded, setMapLoaded] = useState(false);

  // Hiển thị vị trí ban đầu của bản đồ là điểm bắt đầu của tuyến đường
  const initialMapCenter = routeStartCoords
    ? [routeStartCoords[1], routeStartCoords[0]]
    : [105.84, 21.02]; // [lon, lat]

  const handleAddIncidentToRoute = () => {
    if (!incidentDescription) {
      Alert.alert("Lỗi", "Vui lòng nhập mô tả sự cố.");
      return;
    }

    setIsAddingIncident(true);

    // Sử dụng tọa độ điểm bắt đầu của tuyến đường làm tọa độ sự cố
    // `routeStartCoords` là [lat, lon], Mapbox cần [lon, lat]
    const incidentCoords = routeStartCoords
      ? [routeStartCoords[1], routeStartCoords[0]]
      : null;

    if (!incidentCoords) {
      Alert.alert(
        "Lỗi",
        "Không thể xác định tọa độ cho sự cố. Vui lòng thử lại."
      );
      setIsAddingIncident(false);
      return;
    }

    const newIncident = {
      id: `route_incident_${Date.now()}`,
      location: `Tuyến đường từ ${startAddress} đến ${endAddress}`, // Địa điểm dựa trên tuyến đường
      description: incidentDescription,
      type: incidentType,
      severity: incidentSeverity,
      isActive: true,
      timestamp: new Date(),
      coordinates: incidentCoords, // Tọa độ của sự cố sẽ là điểm bắt đầu tuyến đường
    };

    // Gọi callback để thêm sự cố vào danh sách trên màn hình trước đó
    if (onIncidentConfigured) {
      onIncidentConfigured(newIncident);
    }

    Alert.alert("Thành công", "Sự cố đã được thêm vào tuyến đường.");
    setIsAddingIncident(false);
    navigation.goBack(); // Quay lại màn hình SimulatedTrafficScreen
  };

  const onMapLoadedCallback = () => {
    setMapLoaded(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>{"< Quay lại"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cấu hình Sự cố trên Tuyến đường</Text>
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
          {foundRouteData.length > 0 && (
            <Text style={styles.routeDetailText}>
              Khoảng cách: {(foundRouteData[0].distance / 1000).toFixed(1)} km
            </Text>
          )}
          {foundRouteData.length > 0 && (
            <Text style={styles.routeDetailText}>
              Thời gian ước tính: {(foundRouteData[0].duration / 60).toFixed(0)}{" "}
              phút
            </Text>
          )}
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
          {/* Custom selection for Incident Type */}
          <View style={styles.selectionContainer}>
            <Text style={styles.pickerLabel}>Loại sự cố:</Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  incidentType === "accident" && styles.selectionButtonActive,
                ]}
                onPress={() => setIncidentType("accident")}
              >
                <Text
                  style={[
                    styles.selectionButtonText,
                    incidentType === "accident" &&
                      styles.selectionButtonTextActive,
                  ]}
                >
                  Tai nạn
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  incidentType === "congestion" && styles.selectionButtonActive,
                ]}
                onPress={() => setIncidentType("congestion")}
              >
                <Text
                  style={[
                    styles.selectionButtonText,
                    incidentType === "congestion" &&
                      styles.selectionButtonTextActive,
                  ]}
                >
                  Tắc đường
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  incidentType === "road_closure" &&
                    styles.selectionButtonActive,
                ]}
                onPress={() => setIncidentType("road_closure")}
              >
                <Text
                  style={[
                    styles.selectionButtonText,
                    incidentType === "road_closure" &&
                      styles.selectionButtonTextActive,
                  ]}
                >
                  Đóng đường
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  incidentType === "natural_disaster" &&
                    styles.selectionButtonActive,
                ]}
                onPress={() => setIncidentType("natural_disaster")}
              >
                <Text
                  style={[
                    styles.selectionButtonText,
                    incidentType === "natural_disaster" &&
                      styles.selectionButtonTextActive,
                  ]}
                >
                  Thiên tai
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Custom selection for Incident Severity */}
          <View style={styles.selectionContainer}>
            <Text style={styles.pickerLabel}>Mức độ nghiêm trọng:</Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  incidentSeverity === "low" && styles.selectionButtonActive,
                ]}
                onPress={() => setIncidentSeverity("low")}
              >
                <Text
                  style={[
                    styles.selectionButtonText,
                    incidentSeverity === "low" &&
                      styles.selectionButtonTextActive,
                  ]}
                >
                  Thấp
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  incidentSeverity === "medium" && styles.selectionButtonActive,
                ]}
                onPress={() => setIncidentSeverity("medium")}
              >
                <Text
                  style={[
                    styles.selectionButtonText,
                    incidentSeverity === "medium" &&
                      styles.selectionButtonTextActive,
                  ]}
                >
                  Trung bình
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  incidentSeverity === "high" && styles.selectionButtonActive,
                ]}
                onPress={() => setIncidentSeverity("high")}
              >
                <Text
                  style={[
                    styles.selectionButtonText,
                    incidentSeverity === "high" &&
                      styles.selectionButtonTextActive,
                  ]}
                >
                  Cao
                </Text>
              </TouchableOpacity>
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
            routeStartCoords ? [routeStartCoords[1], routeStartCoords[0]] : null
          } // Mapbox expects [lon, lat]
          endCoords={
            routeEndCoords ? [routeEndCoords[1], routeEndCoords[0]] : null
          } // Mapbox expects [lon, lat]
          allRoutes={foundRouteData} // Truyền tất cả các tuyến đường tìm thấy để MapWrapper hiển thị
          initialCenter={initialMapCenter}
          initialZoom={12}
          styleURL={MapboxGL.Style.DARK}
          onMapLoadedCallback={onMapLoadedCallback}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#007BFF",
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center title by default
    paddingHorizontal: 15,
  },
  backButton: {
    position: "absolute",
    left: 15,
    paddingTop: Platform.OS === "android" ? 20 : 0, // Adjust for status bar
    paddingBottom: 5,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  formContainer: {
    flex: 1, // Chiếm một nửa màn hình cho form
    padding: 16,
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
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
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
  mapContainer: {
    flex: 1, // Map chiếm phần còn lại của màn hình
    height: height * 0.5, // Điều chỉnh chiều cao map cho phù hợp
    borderTopWidth: 1,
    borderTopColor: "#ddd",
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
