import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Platform,
  SafeAreaView,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";

import RouteFindingPanel from "../../components/RouteFindingPanel.js";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";

const { width, height } = Dimensions.get("window");

const CurrentStatusMapScreen = () => {
  const [loading, setLoading] = useState(true); // Trạng thái loading chung
  const [mapLoaded, setMapLoaded] = useState(false); // Trạng thái bản đồ đã tải xong trong MapWrapper

  const [routeStartCoords, setRouteStartCoords] = useState(null);

  const [endCoords, setEndCoords] = useState(null);

  const [allRoutesGeoJSONs, setAllRoutesGeoJSONs] = useState(null);

  const [layersVisibility, setLayersVisibility] = useState({
    traffic: true,
    airQuality: false,
    incidents: true,
  });

  // Dữ liệu giả lập cho các lớp
  const [trafficData, setTrafficData] = useState(null);
  const [airQualityData, setAirQualityData] = useState(null);
  const [incidentData, setIncidentData] = useState(null);

  useEffect(() => {
    // Hàm này mô phỏng việc lấy dữ liệu thời gian thực
    // Trong ứng dụng thực tế, bạn sẽ thay thế bằng các cuộc gọi API thực
    const fetchRealtimeData = () => {
      // Dữ liệu giao thông (ví dụ: các đoạn đường tắc nghẽn)
      setTrafficData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { status: "congested" },
            geometry: {
              type: "LineString",
              coordinates: [
                [105.84, 21.02], // Ví dụ tọa độ tại Hà Nội
                [105.85, 21.03],
                [105.86, 21.04],
              ],
            },
          },
          {
            type: "Feature",
            properties: { status: "moderate" },
            geometry: {
              type: "LineString",
              coordinates: [
                [105.82, 21.01],
                [105.83, 21.0],
              ],
            },
          },
        ],
      });

      // Dữ liệu chất lượng không khí (ví dụ: các điểm cảm biến)
      setAirQualityData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { pm25: 60, status: "unhealthy" },
            geometry: { type: "Point", coordinates: [105.83, 21.03] },
          },
          {
            type: "Feature",
            properties: { pm25: 25, status: "moderate" },
            geometry: { type: "Point", coordinates: [105.85, 21.01] },
          },
        ],
      });

      // Dữ liệu sự cố (ví dụ: tai nạn, đóng đường)
      setIncidentData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              type: "accident",
              description: "Tai nạn",
              severity: "high",
              icon: "fire", // Sử dụng tên icon từ Mapbox GL Native
            },
            geometry: { type: "Point", coordinates: [105.845, 21.025] },
          },
          {
            type: "Feature",
            properties: {
              type: "road_closure",
              description: "Đóng đường",
              severity: "medium",
              icon: "roadblock", // Sử dụng tên icon từ Mapbox GL Native
            },
            geometry: { type: "Point", coordinates: [105.835, 21.015] },
          },
        ],
      });

      setLoading(false); // Đặt loading thành false sau khi tải dữ liệu mock
    };

    fetchRealtimeData();
    // Cập nhật dữ liệu mỗi 30 giây (trong ứng dụng thực tế, có thể sử dụng WebSocket hoặc push notification)
    const interval = setInterval(fetchRealtimeData, 30000);
    return () => clearInterval(interval); // Xóa interval khi component unmount
  }, []);

  // Callback được gọi từ MapWrapper khi bản đồ tải xong
  const handleMapWrapperLoaded = () => {
    setMapLoaded(true);
    setLoading(false); // Dừng loading khi bản đồ đã tải xong và dữ liệu cũng đã tải
  };

  // Chức năng bật/tắt hiển thị lớp dữ liệu
  const toggleLayer = (layerName) => {
    setLayersVisibility((prevState) => ({
      ...prevState,
      [layerName]: !prevState[layerName],
    }));
  };

  // Callback từ RouteFindingPanel khi tìm được tuyến đường
  // Bây giờ geoJSONs sẽ là một MẢNG các GeoJSONs tuyến đường
  const handleRouteSelected = (start, end, geoJSONs) => {
    setRouteStartCoords(start);
    setEndCoords(end);
    setAllRoutesGeoJSONs(geoJSONs); // Lưu toàn bộ mảng GeoJSONs
  };

  // Callback để xóa tuyến đường
  const handleClearRoute = () => {
    setRouteStartCoords(null);
    setEndCoords(null);
    setAllRoutesGeoJSONs(null); // Xóa toàn bộ mảng GeoJSONs
  };

  // Hàm renderLayer trả về các thành phần MapboxGL để truyền làm children cho MapWrapper
  const renderLayer = useMemo(
    () => (layerKey) => {
      const dataMap = {
        traffic: trafficData,
        airQuality: airQualityData,
        incidents: incidentData,
      };

      if (
        layersVisibility[layerKey] &&
        dataMap[layerKey] &&
        dataMap[layerKey].features
      ) {
        const layerStyleProps = {};
        let MapboxGLLayerComponent = null;

        switch (layerKey) {
          case "traffic":
            MapboxGLLayerComponent = MapboxGL.LineLayer;
            layerStyleProps.lineColor = [
              "match",
              ["get", "status"],
              "congested",
              "red",
              "moderate",
              "orange",
              "smooth",
              "green",
              "gray", // default color
            ];
            layerStyleProps.lineWidth = 5;
            layerStyleProps.lineOpacity = 0.7;
            break;
          case "airQuality":
            MapboxGLLayerComponent = MapboxGL.CircleLayer;
            layerStyleProps.circleColor = [
              "match",
              ["get", "status"],
              "unhealthy",
              "#e74c3c", // Red
              "moderate",
              "#f1c40f", // Yellow
              "good",
              "#2ecc71", // Green
              "#3498db", // default blue
            ];
            layerStyleProps.circleRadius = 7;
            layerStyleProps.circleOpacity = 0.8;
            layerStyleProps.circleStrokeColor = "white";
            layerStyleProps.circleStrokeWidth = 1;
            break;
          case "incidents":
            MapboxGLLayerComponent = MapboxGL.SymbolLayer;
            layerStyleProps.iconImage = ["get", "icon"]; // Lấy tên icon từ thuộc tính 'icon' của feature
            layerStyleProps.iconSize = 1.5;
            layerStyleProps.textField = ["get", "description"];
            layerStyleProps.textColor = "black";
            layerStyleProps.textSize = 12;
            layerStyleProps.textHaloColor = "white";
            layerStyleProps.textHaloWidth = 1;
            layerStyleProps.textAnchor = "top";
            layerStyleProps.textOffset = [0, 1];
            break;
          default:
            return null;
        }

        return (
          <MapboxGL.ShapeSource
            key={`${layerKey}Source`}
            id={`${layerKey}Source`}
            shape={dataMap[layerKey]}
          >
            <MapboxGLLayerComponent
              id={`${layerKey}Layer`}
              style={layerStyleProps} // Áp dụng style dynamic
            />
          </MapboxGL.ShapeSource>
        );
      }
      return null;
    },
    [trafficData, airQualityData, incidentData, layersVisibility]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Khu vực hiển thị bản đồ */}
        <View style={styles.mapContainer}>
          {!mapLoaded && ( // Chỉ hiển thị loading overlay nếu bản đồ chưa tải xong
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
            </View>
          )}
          <MapWrapper
            mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
            startCoords={routeStartCoords}
            endCoords={endCoords}
            routeGeoJSONs={allRoutesGeoJSONs}
            initialCenter={[105.8342, 21.0278]} // Tọa độ trung tâm Hà Nội: [Longitude, Latitude]
            initialZoom={12}
            styleURL={MapboxGL.Style.OUTDOORS} // Kiểu bản đồ
            onMapLoadedCallback={handleMapWrapperLoaded} // Callback khi MapWrapper tải xong bản đồ
          >
            {/* Truyền các lớp dữ liệu động làm children */}
            {["traffic", "airQuality", "incidents"].map(renderLayer)}
          </MapWrapper>
        </View>

        {/* Route Finding Panel cố định ở trên cùng (đặt lên trên MapContainer bằng absolute positioning) */}
        <View style={styles.topPanel}>
          <RouteFindingPanel
            onRouteSelected={handleRouteSelected}
            onClearRoute={handleClearRoute}
          />
        </View>

        {/* Floating Controls for Layers (Đã loại bỏ các điều khiển tiêu chí định tuyến) */}
        <View style={styles.floatingControls}>
          {/* Layer Controls */}
          <Text style={styles.controlPanelTitle}>Lớp:</Text>
          <View style={styles.layerButtonsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.keys(layersVisibility).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.layerButton,
                    layersVisibility[key] ? styles.layerButtonActive : {},
                  ]}
                  onPress={() => toggleLayer(key)}
                >
                  <Text style={styles.layerButtonText}>
                    {key === "traffic"
                      ? "Giao thông"
                      : key === "airQuality"
                      ? "Không khí"
                      : "Sự cố"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {/* Điều khiển tiêu chí định tuyến đã được chuyển vào RouteFindingPanel */}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ecf0f1", // Nền màu xám nhạt hiện đại hơn
  },
  container: {
    flex: 1,
  },
  topPanel: {
    position: "absolute", // Đặt vị trí tuyệt đối
    top: Platform.OS === "ios" ? 0 : 0, // Bắt đầu từ đầu SafeAreaView
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingVertical: 12,
    // Thêm padding top để tránh notch/status bar (đặt bên trong RouteFindingPanel nếu nó có content)
    paddingTop: Platform.OS === "ios" ? 40 : 12, // Điều chỉnh thêm padding cho iOS để tránh notch
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10, // Đảm bảo panel nằm trên cùng để tương tác
  },
  mapContainer: {
    flex: 1, // Bản đồ chiếm toàn bộ không gian còn lại
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
  floatingControls: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 20,
    right: 15,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    padding: 10,
    flexDirection: "column",
    alignItems: "flex-end",
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
    textAlign: "right",
  },
  layerButtonsContainer: {
    flexDirection: "row",
    marginBottom: 5,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  layerButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginTop: 5,
    marginLeft: 8,
    borderWidth: 0,
    alignSelf: "flex-end",
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
  routingCriteriaScroll: {
    maxHeight: 40,
    marginBottom: 0,
  },
  routingCriterionButton: {
    // Styles from layerButton are applied
  },
});

export default CurrentStatusMapScreen;
