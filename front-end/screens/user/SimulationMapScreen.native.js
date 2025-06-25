import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Platform, // Đảm bảo đã import Platform
  SafeAreaView,
  Image,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";

import RouteFindingPanel from "../../components/RouteFindingPanel.js";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets.js";
import { BACKEND_API_BASE_URL } from "../../secrets.js";
import AirQualityMarker from "../../components/AirQualityMarker";
import AirQualityCallout from "../../components/AirQualityCallout";

const { width, height } = Dimensions.get("window");

MapboxGL.setAccessToken(MAPBOX_PUBLIC_ACCESS_TOKEN);

const COORDINATES_API_URL = `${BACKEND_API_BASE_URL}/coordinates`;
const ROUTES_API_URL = `${BACKEND_API_BASE_URL}/routes`;
const AIR_QUALITY_API_URL = `${BACKEND_API_BASE_URL}/aqis`;

const SimulationMapScreen = () => {
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);

  const [routeStartCoords, setRouteStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [allRoutesGeoJSONs, setAllRoutesGeoJSONs] = useState(null);

  const [trafficNetworkNodesGeoJSON, setTrafficNetworkNodesGeoJSON] =
    useState(null);

  const [layersVisibility, setLayersVisibility] = useState({
    traffic: true,
    airQuality: true,
    incidents: true,
  });

  const [allCoordinates, setAllCoordinates] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [rawAirQualityData, setRawAirQualityData] = useState([]);

  const [trafficData, setTrafficData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [airQualityData, setAirQualityData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [incidentData, setIncidentData] = useState({
    type: "FeatureCollection",
    features: [],
  });

  const [selectedAqiData, setSelectedAqiData] = useState(null);

  const coordinatesMap = useMemo(() => {
    const map = new Map();
    allCoordinates.forEach((coord) => {
      map.set(coord["NODE:NO"], coord);
    });
    return map;
  }, [allCoordinates]);

  const fetchGraphData = useCallback(async () => {
    setIsBackendGraphDataLoading(true);
    setIsError(false);
    console.log("SimulationMapScreen: Starting backend data fetch...");
    try {
      const [coordsResponse, routesResponse, airQualityResponse] =
        await Promise.allSettled([
          fetch(COORDINATES_API_URL),
          fetch(ROUTES_API_URL),
          fetch(AIR_QUALITY_API_URL),
        ]);

      let errorOccurred = false;

      if (coordsResponse.status === "fulfilled" && coordsResponse.value.ok) {
        const coordsData = await coordsResponse.value.json();
        setAllCoordinates(coordsData);
        console.log(
          `SimulationMapScreen: Successfully fetched coordinates from backend. Count: ${coordsData.length}`
        );
      } else {
        errorOccurred = true;
        const errorMsg =
          coordsResponse.status === "rejected"
            ? coordsResponse.reason.message
            : `HTTP error! status: ${coordsResponse.value.status}`;
        console.error(
          `SimulationMapScreen: Error fetching coordinates from backend: ${errorMsg} from ${COORDINATES_API_URL}`
        );
      }

      if (routesResponse.status === "fulfilled" && routesResponse.value.ok) {
        const routesData = await routesResponse.value.json();
        setAllRoutes(routesData);
        console.log(
          `SimulationMapScreen: Successfully fetched routes from backend. Count: ${routesData.length}`
        );
      } else {
        errorOccurred = true;
        const errorMsg =
          routesResponse.status === "rejected"
            ? routesResponse.reason.message
            : `HTTP error! status: ${routesResponse.value.status}`;
        console.error(
          `SimulationMapScreen: Error fetching routes from backend: ${errorMsg} from ${ROUTES_API_URL}`
        );
      }

      if (
        airQualityResponse.status === "fulfilled" &&
        airQualityResponse.value.ok
      ) {
        const aqData = await airQualityResponse.value.json();
        setRawAirQualityData(aqData);
        console.log(
          `SimulationMapScreen: Successfully fetched air quality data from backend. Count: ${aqData.length}`
        );
      } else {
        errorOccurred = true;
        const errorMsg =
          airQualityResponse.status === "rejected"
            ? airQualityResponse.reason.message
            : `HTTP error! status: ${airQualityResponse.value.status}`;
        console.error(
          `SimulationMapScreen: Error fetching air quality data from backend: ${errorMsg} from ${AIR_QUALITY_API_URL}`
        );
      }

      setIsError(errorOccurred);
      console.log(
        `SimulationMapScreen: Graph data fetch complete. Error: ${errorOccurred}`
      );
    } catch (error) {
      console.error(
        "SimulationMapScreen: General network error while fetching graph data from backend:",
        error
      );
      setIsError(true);
    } finally {
      setIsBackendGraphDataLoading(false);
      console.log(
        `SimulationMapScreen: isBackendGraphDataLoading set to false.`
      );
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    console.log(
      `SimulationMapScreen: Checking to create GeoJSON. allCoordinates.length: ${allCoordinates.length}, allRoutes.length: ${allRoutes.length}, rawAirQualityData.length: ${rawAirQualityData.length}, isError: ${isError}, isBackendGraphDataLoading: ${isBackendGraphDataLoading}`
    );

    const newTrafficFeatures = [];
    const newAirQualityFeatures = [];
    const newIncidentFeatures = [];
    const networkNodesFeatures = [];

    if (
      allCoordinates.length > 0 &&
      allRoutes.length > 0 &&
      rawAirQualityData.length > 0 &&
      !isError &&
      !isBackendGraphDataLoading
    ) {
      allRoutes.forEach((route) => {
        const fromCoord = coordinatesMap.get(route.FROMNODENO);
        const toCoord = coordinatesMap.get(route.TONODENO);

        if (
          route.geometry &&
          route.geometry.type === "LineString" &&
          route.geometry.coordinates &&
          route.geometry.coordinates.length >= 2
        ) {
          newTrafficFeatures.push({
            type: "Feature",
            properties: {
              id: route.linkNo,
              VC: route.VC,
              status:
                route.VC <= 0.6
                  ? "smooth"
                  : route.VC <= 0.8
                  ? "moderate"
                  : "congested",
            },
            geometry: route.geometry,
          });
        } else if (fromCoord && toCoord && route.VC !== undefined) {
          newTrafficFeatures.push({
            type: "Feature",
            properties: {
              id: route.linkNo,
              VC: route.VC,
              status:
                route.VC <= 0.6
                  ? "smooth"
                  : route.VC <= 0.8
                  ? "moderate"
                  : "congested",
            },
            geometry: {
              type: "LineString",
              coordinates: [
                fromCoord.location.coordinates,
                toCoord.location.coordinates,
              ],
            },
          });
        }
      });

      setTrafficData({
        type: "FeatureCollection",
        features: newTrafficFeatures,
      });
      console.log(
        `SimulationMapScreen: Created GeoJSON for traffic. Feature count: ${newTrafficFeatures.length}.`
      );

      coordinatesMap.forEach((coords, nodeNo) => {
        networkNodesFeatures.push({
          type: "Feature",
          properties: {
            id: `node-${nodeNo}`,
            "NODE-NO": nodeNo,
          },
          geometry: {
            type: "Point",
            coordinates: coords.location.coordinates,
          },
        });
      });
      setTrafficNetworkNodesGeoJSON({
        type: "FeatureCollection",
        features: networkNodesFeatures,
      });
      console.log(
        `SimulationMapScreen: Generated traffic network nodes GeoJSON. Count: ${networkNodesFeatures.length}`
      );

      rawAirQualityData.forEach((aqData, index) => {
        const pm25Value =
          aqData.pm25 !== null && aqData.pm25 !== undefined ? aqData.pm25 : 0;
        const coValue =
          aqData.co !== null && aqData.co !== undefined ? aqData.co : 0;
        const no2Value =
          aqData.no2 !== null && aqData.no2 !== undefined ? aqData.no2 : 0;
        const so2Value =
          aqData.so2 !== null && aqData.so2 !== undefined ? aqData.so2 : 0;
        const o3Value =
          aqData.o3 !== null && aqData.o3 !== undefined ? aqData.o3 : 0;
        const aqiValue =
          aqData.aqi !== null && aqData.aqi !== undefined ? aqData.aqi : 0;

        let status = "good";
        if (aqiValue > 50) status = "moderate";
        else if (aqiValue > 100) status = "unhealthy_sensitive";
        else if (aqiValue > 150) status = "unhealthy";
        else if (aqiValue > 200) status = "hazardous";
        else if (aqiValue > 300) status = "very_unhealthy";

        if (aqData.location && aqData.location.coordinates) {
          const uniqueStationId =
            aqData.stationUid ||
            `unknown-station-${index}-${Math.random()
              .toString(36)
              .substr(2, 5)}`;
          if (!aqData.stationUid) {
            console.warn(
              `Backend data for station at index ${index} has no stationUid. Using fallback: ${uniqueStationId}`
            );
          }
          console.log(
            `[useEffect] Feature Index: ${index}, Raw stationUid: ${aqData.stationUid}, Assigned stationId: ${uniqueStationId}`
          );

          newAirQualityFeatures.push({
            type: "Feature",
            properties: {
              stationId: uniqueStationId,
              stationName: aqData.stationName || `Trạm ${uniqueStationId}`,
              aqi: aqiValue,
              pm25: pm25Value,
              co: coValue,
              no2: no2Value,
              so2: so2Value,
              o3: o3Value,
              status: status,
              timestamp: aqData.time,
              displayPm25: `PM2.5: ${pm25Value.toFixed(1)}`,
              icon: "air-quality-icon",
            },
            geometry: aqData.location,
          });
        }
      });
      setAirQualityData({
        type: "FeatureCollection",
        features: newAirQualityFeatures,
      });
      console.log(
        `SimulationMapScreen: Created GeoJSON for air quality from backend data. Feature count: ${newAirQualityFeatures.length}`
      );

      const availableNodeNumbers = Array.from(coordinatesMap.keys());

      if (availableNodeNumbers.length > 0) {
        const node1Index = Math.floor(
          Math.random() * availableNodeNumbers.length
        );
        let node2Index = Math.floor(
          Math.random() * availableNodeNumbers.length
        );
        while (node2Index === node1Index && availableNodeNumbers.length > 1) {
          node2Index = Math.floor(Math.random() * availableNodeNumbers.length);
        }

        const node1 = availableNodeNumbers[node1Index];
        const node2 = availableNodeNumbers[node2Index];

        const coords1 = coordinatesMap.get(node1);
        const coords2 = coordinatesMap.get(node2);

        if (coords1) {
          newIncidentFeatures.push({
            type: "Feature",
            properties: {
              type: "accident",
              description: "Tai nạn (sim)",
              severity: "high",
              icon: "fire-station",
            },
            geometry: {
              type: "Point",
              coordinates: coords1.location.coordinates,
            },
          });
        }
        if (coords2 && node1 !== node2) {
          newIncidentFeatures.push({
            type: "Feature",
            properties: {
              type: "road_closure",
              description: "Đóng đường",
              severity: "medium",
              icon: "roadblock",
            },
            geometry: {
              type: "Point", // Should be Point for incidents
              coordinates: coords2.location.coordinates,
            },
          });
        }
      }
      setIncidentData({
        type: "FeatureCollection",
        features: newIncidentFeatures,
      });
      console.log(
        `SimulationMapScreen: Created GeoJSON for incidents. Feature count: ${newIncidentFeatures.length}`
      );
    } else {
      setTrafficData({ type: "FeatureCollection", features: [] });
      setAirQualityData({ type: "FeatureCollection", features: [] });
      setIncidentData({ type: "FeatureCollection", features: [] });
      setTrafficNetworkNodesGeoJSON({
        type: "FeatureCollection",
        features: [],
      });
      console.warn(
        "SimulationMapScreen: GeoJSON states reset to empty FeatureCollections due to loading/error state."
      );
    }
  }, [
    allCoordinates,
    allRoutes,
    rawAirQualityData,
    isError,
    isBackendGraphDataLoading,
    coordinatesMap,
  ]);

  useEffect(() => {
    console.log(
      `SimulationMapScreen: Updating overall loading status. mapLoaded: ${mapLoaded}, isBackendGraphDataLoading: ${isBackendGraphDataLoading}, isError: ${isError}`
    );
    if (!mapLoaded || isBackendGraphDataLoading || isError) {
      setLoading(true);
    } else {
      setLoading(false);
      console.log(
        "SimulationMapScreen: Loading complete. Map and data are ready."
      );
    }
  }, [mapLoaded, isBackendGraphDataLoading, isError]);

  useEffect(() => {
    // Tắt popup khi tắt lớp không khí
    if (!layersVisibility.airQuality && selectedAqiData) {
      setSelectedAqiData(null);
      console.log("SimulationMapScreen: Air quality layer off, closing popup.");
    }
  }, [layersVisibility.airQuality, selectedAqiData]);

  useEffect(() => {
    // Đảm bảo render lại marker và layer theo thứ tự cố định khi thay đổi visibility
    if (mapLoaded) {
      console.log(
        "SimulationMapScreen: Re-rendering layers due to visibility change."
      );
    }
  }, [layersVisibility, mapLoaded]);

  const handleMapPress = useCallback(() => {
    if (selectedAqiData) {
      setSelectedAqiData(null);
      console.log(
        "SimulationMapScreen: Map pressed, closing air quality popup."
      );
    }
  }, [selectedAqiData]);

  const toggleLayer = (layerName) => {
    setLayersVisibility((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
    console.log(
      `SimulationMapScreen: Toggling layer ${layerName}. New state: ${!layersVisibility[
        layerName
      ]}`
    );
  };

  const handleRouteSelected = useCallback(
    (startNodeNo, endNodeNo, geoJSONs) => {
      if (allCoordinates.length === 0 || isError) {
        console.warn(
          "SimulationMapScreen: Backend graph data not fully loaded or has errors. Cannot set markers."
        );
        return;
      }

      const startCoordObj = coordinatesMap.get(startNodeNo);
      const endCoordObj = coordinatesMap.get(endNodeNo);

      setRouteStartCoords(
        startCoordObj ? startCoordObj.location.coordinates : null
      );
      setEndCoords(endCoordObj ? endCoordObj.location.coordinates : null);

      const processedRouteGeoJSONs = geoJSONs
        .map((routeGeoJSON) => {
          if (
            routeGeoJSON &&
            routeGeoJSON.geometry &&
            routeGeoJSON.geometry.type === "LineString" &&
            routeGeoJSON.geometry.coordinates &&
            routeGeoJSON.geometry.coordinates.length >= 2
          ) {
            console.log(
              "SimulationMapScreen: Route GeoJSON Coordinates (first 5):",
              routeGeoJSON.geometry.coordinates.slice(0, 5)
            );
            return routeGeoJSON;
          }
          return null;
        })
        .filter(Boolean);

      setAllRoutesGeoJSONs(processedRouteGeoJSONs);
      console.log(
        `SimulationMapScreen: Route selected from ${startNodeNo} to ${endNodeNo}. Markers and route set.`
      );
    },
    [allCoordinates, isError, coordinatesMap]
  );

  const handleClearRoute = useCallback(() => {
    setRouteStartCoords(null);
    setEndCoords(null);
    setAllRoutesGeoJSONs(null);
    console.log("SimulationMapScreen: Markers and route cleared.");
  }, []);

  const handleAirQualityFeaturePress = useCallback(
    (feature) => {
      console.log(
        "SimulationMapScreen: Air Quality Marker Pressed:",
        feature.properties
      );
      if (layersVisibility.airQuality) {
        setSelectedAqiData({
          ...feature.properties,
          coordinates: feature.geometry.coordinates,
        });
      }
    },
    [layersVisibility.airQuality]
  );

  const handleCloseAqiPanel = useCallback(() => {
    setSelectedAqiData(null);
    console.log("SimulationMapScreen: Closing air quality popup.");
  }, []);

  const mapRef = useRef(null);

  const handleMapLoaded = useCallback(() => {
    setMapLoaded(true);
    console.log("SimulationMapScreen: Map loaded!");
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.mapContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={styles.loadingText}>
                {isError
                  ? "Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối và máy chủ backend."
                  : isBackendGraphDataLoading
                  ? "Đang tải dữ liệu đồ thị và không khí từ máy chủ..."
                  : "Đang tải bản đồ..."}
              </Text>
              {isError && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchGraphData}
                >
                  <Text style={styles.retryButtonText}>Thử lại</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <MapboxGL.MapView
            ref={mapRef}
            style={styles.map}
            styleURL={MapboxGL.Style.OUTDOORS}
            onDidFinishLoadingMap={handleMapLoaded}
            onPress={handleMapPress}
          >
            <MapboxGL.Camera
              zoomLevel={12}
              centerCoordinate={[105.818, 21.0545]}
              animationMode="easeTo"
              animationDuration={1000}
            />

            {/* Layer 1: Các nút mạng giao thông (Traffic Network Nodes) - NỀN NHẤT */}
            {layersVisibility.traffic &&
              trafficNetworkNodesGeoJSON &&
              trafficNetworkNodesGeoJSON.features.length > 0 && (
                <MapboxGL.ShapeSource
                  id="trafficNetworkNodesSource"
                  shape={trafficNetworkNodesGeoJSON}
                >
                  <MapboxGL.CircleLayer
                    id="trafficNetworkNodesLayer"
                    style={{
                      circleRadius: 3,
                      circleColor: "#6A057F",
                      circleOpacity: 0.7,
                      circleStrokeColor: "white",
                      circleStrokeWidth: 0.5,
                    }}
                  />
                </MapboxGL.ShapeSource>
              )}

            {/* Layer 2: Lớp Giao thông (Line Layer) - TRÊN NÚT MẠNG */}
            {layersVisibility.traffic && trafficData.features.length > 0 && (
              <MapboxGL.ShapeSource
                key={`trafficSource`}
                id={`trafficSource`}
                shape={trafficData}
              >
                <MapboxGL.LineLayer
                  id={`trafficLayer`}
                  style={{
                    lineColor: [
                      "match",
                      ["get", "status"],
                      "congested",
                      "red",
                      "moderate",
                      "orange",
                      "smooth",
                      "green",
                      "gray",
                    ],
                    lineWidth: 5,
                    lineOpacity: 0.7,
                  }}
                  aboveLayerID={
                    layersVisibility.traffic
                      ? "trafficNetworkNodesLayer"
                      : undefined
                  }
                />
              </MapboxGL.ShapeSource>
            )}

            {/* Layer 3: Lớp Chất lượng không khí (Circle Layer) - TRÊN LỚP GIAO THÔNG */}
            {layersVisibility.airQuality &&
              airQualityData.features.length > 0 && (
                <MapboxGL.ShapeSource
                  key={`airQualityCircleSource`}
                  id={`airQualityCircleSource`}
                  shape={airQualityData}
                >
                  <MapboxGL.CircleLayer
                    id={`airQualityCircleLayer`}
                    style={{
                      circleColor: [
                        "match",
                        ["get", "status"],
                        "unhealthy_sensitive",
                        "rgba(255, 165, 0, 0.4)",
                        "hazardous",
                        "rgba(126, 0, 35, 0.4)",
                        "very_unhealthy",
                        "rgba(139, 0, 139, 0.4)",
                        "unhealthy",
                        "rgba(231, 76, 60, 0.4)",
                        "moderate",
                        "rgba(241, 196, 15, 0.4)",
                        "good",
                        "rgba(46, 204, 113, 0.4)",
                        "rgba(52, 152, 219, 0.4)",
                      ],
                      circleRadius: [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        0,
                        10,
                        5,
                        50,
                        10,
                        100,
                        15,
                        150,
                        22,
                        200,
                      ],
                      circleOpacity: 0.8,
                      circleStrokeColor: [
                        "match",
                        ["get", "status"],
                        "unhealthy",
                        "#e74c3c",
                        "moderate",
                        "#f1c40f",
                        "good",
                        "#2ecc71",
                        "#3498db",
                      ],
                      circleStrokeWidth: 1.5,
                    }}
                    aboveLayerID={
                      layersVisibility.traffic ? "trafficLayer" : undefined
                    }
                  />
                </MapboxGL.ShapeSource>
              )}

            {/* Layer 4: Lớp Sự cố (Symbol Layer) - TRÊN LỚP AQI (hoặc GIAO THÔNG) */}
            {layersVisibility.incidents && incidentData.features.length > 0 && (
              <MapboxGL.ShapeSource
                key={`incidentsSource`}
                id={`incidentsSource`}
                shape={incidentData}
                images={{
                  "fire-station": {
                    uri: "https://placehold.co/50x50/ff0000/ffffff?text=🔥",
                  },
                  roadblock: {
                    uri: "https://placehold.co/50x50/000000/ffffff?text=🚗",
                  },
                }}
              >
                <MapboxGL.SymbolLayer
                  id={`incidentsLayer`}
                  style={{
                    iconImage: ["get", "icon"],
                    iconSize: 1.5,
                    textField: ["get", "description"],
                    textColor: "black",
                    textSize: 12,
                    textHaloColor: "white",
                    textHaloWidth: 1,
                    textAnchor: "top",
                    textOffset: [0, 1],
                  }}
                  aboveLayerID={
                    layersVisibility.airQuality
                      ? "airQualityCircleLayer"
                      : layersVisibility.traffic
                      ? "trafficLayer"
                      : undefined
                  }
                />
              </MapboxGL.ShapeSource>
            )}

            {/* Layer 5: Tuyến đường được tìm (Luôn trên cùng các lớp dữ liệu MapboxGL) */}
            {allRoutesGeoJSONs &&
              allRoutesGeoJSONs.map((geoJSON, index) => (
                <MapboxGL.ShapeSource
                  key={`routeSource-${index}`}
                  id={`routeSource-${index}`}
                  shape={geoJSON}
                >
                  <MapboxGL.LineLayer
                    id={`routeLayer-${index}`}
                    style={{
                      lineColor: "#007BFF",
                      lineWidth: 4,
                      lineOpacity: 0.9,
                    }}
                    aboveLayerID={
                      layersVisibility.incidents
                        ? "incidentsLayer"
                        : layersVisibility.airQuality
                        ? "airQualityCircleLayer"
                        : layersVisibility.traffic
                        ? "trafficLayer"
                        : undefined
                    }
                  />
                </MapboxGL.ShapeSource>
              ))}

            {/*
              **** ĐÂY LÀ PHẦN SỬA LỖI QUAN TRỌNG CHO THỨ TỰ MARKER ****
              Đặt tất cả MapboxGL.PointAnnotation SAU các lớp MapboxGL.
              Thêm các thuộc tính tối ưu hóa rendering vào View bao bọc marker.
            */}

            {/* Marker bắt đầu và kết thúc */}
            {routeStartCoords && (
              <MapboxGL.PointAnnotation
                id="startPoint"
                coordinate={routeStartCoords}
                style={{ zIndex: 10000 }} // zIndex áp dụng cho native view
              >
                <View>
                  <Text style={styles.markerText}>A</Text>
                </View>
              </MapboxGL.PointAnnotation>
            )}

            {/* Marker chất lượng không khí */}
            {layersVisibility.airQuality &&
              airQualityData.features.length > 0 && (
                <>
                  {airQualityData.features.map((feature) => {
                    const { geometry, properties } = feature;
                    if (!geometry || !geometry.coordinates || !properties)
                      return null;
                    const { stationId } = properties;

                    return (
                      <MapboxGL.PointAnnotation
                        key={`aqi-annotation-${stationId}`}
                        id={`aqi-annotation-${stationId}`}
                        coordinate={geometry.coordinates}
                        onSelected={() => handleAirQualityFeaturePress(feature)}
                        style={{ zIndex: 10001 }} // zIndex cao hơn để hiển thị trên marker A/B
                      >
                        {/* Wrapper View với các thuộc tính tối ưu hóa rendering */}
                        <View>
                          <AirQualityMarker stationData={properties} />
                          {selectedAqiData &&
                            selectedAqiData.stationId === stationId && (
                              <MapboxGL.Callout
                                title={properties.stationName}
                                style={{ zIndex: 10010 }}
                              >
                                <AirQualityCallout
                                  data={selectedAqiData}
                                  onClose={handleCloseAqiPanel}
                                />
                              </MapboxGL.Callout>
                            )}
                        </View>
                      </MapboxGL.PointAnnotation>
                    );
                  })}
                </>
              )}
          </MapboxGL.MapView>
        </View>
        <RouteFindingPanel
          onRouteSelected={handleRouteSelected}
          onClearRoute={handleClearRoute}
          allCoordinates={allCoordinates}
          disabled={loading || isError}
          style={{ zIndex: 500 }}
        />
        <View style={[styles.floatingControls, { zIndex: 500 }]}>
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
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ecf0f1",
  },
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
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
    zIndex: 2000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  endMarker: {
    backgroundColor: "#e74c3c",
  },
  markerText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
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
    paddingHorizontal: 10,
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
});

export default SimulationMapScreen;
