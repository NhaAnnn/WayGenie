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
  Platform,
  SafeAreaView,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import MapWrapper from "../../components/MapWrapper.native.js";
import RouteFindingPanel from "../../components/RouteFindingPanel.native.js";
import {
  MAPBOX_PUBLIC_ACCESS_TOKEN,
  BACKEND_API_BASE_URL,
} from "../../secrets.js";

const { width, height } = Dimensions.get("window");

MapboxGL.setAccessToken(MAPBOX_PUBLIC_ACCESS_TOKEN);

const COORDINATES_API_URL = `${BACKEND_API_BASE_URL}/coordinates`;
const ROUTES_API_URL = `${BACKEND_API_BASE_URL}/routes`;
const AIR_QUALITY_API_URL = `${BACKEND_API_BASE_URL}/aqis`;

const CurrentStatusMapScreen = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);
  const [routeStartCoords, setRouteStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [allRoutesGeoJSONs, setAllRoutesGeoJSONs] = useState(null);
  const [highlightedRouteGeoJSONs, setHighlightedRouteGeoJSONs] =
    useState(null);
  const [trafficNetworkNodesGeoJSON, setTrafficNetworkNodesGeoJSON] =
    useState(null);

  const [layersVisibility, setLayersVisibility] = useState({
    traffic: false,
    airQuality: false,
    incidents: false,
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

  const mapRef = useRef(null);

  // Create coordinates map for quick lookup
  const coordinatesMap = useMemo(() => {
    const map = new Map();
    allCoordinates.forEach((coord) => {
      map.set(coord["NODE:NO"], coord);
    });
    return map;
  }, [allCoordinates]);

  // Fetch graph data from backend
  const fetchGraphData = useCallback(async () => {
    setIsBackendGraphDataLoading(true);
    setIsError(false);
    console.log("Fetching backend data...");

    try {
      const [coordsResponse, routesResponse, airQualityResponse] =
        await Promise.allSettled([
          fetch(COORDINATES_API_URL),
          fetch(ROUTES_API_URL),
          fetch(AIR_QUALITY_API_URL),
        ]);

      let errorOccurred = false;

      // Process coordinates response
      if (coordsResponse.status === "fulfilled" && coordsResponse.value.ok) {
        const coordsData = await coordsResponse.value.json();
        setAllCoordinates(coordsData);
      } else {
        errorOccurred = true;
        console.error(
          "Error fetching coordinates:",
          coordsResponse.reason || coordsResponse.value.status
        );
      }

      // Process routes response
      if (routesResponse.status === "fulfilled" && routesResponse.value.ok) {
        const routesData = await routesResponse.value.json();
        setAllRoutes(routesData);
      } else {
        errorOccurred = true;
        console.error(
          "Error fetching routes:",
          routesResponse.reason || routesResponse.value.status
        );
      }

      // Process air quality response
      if (
        airQualityResponse.status === "fulfilled" &&
        airQualityResponse.value.ok
      ) {
        const aqData = await airQualityResponse.value.json();
        setRawAirQualityData(aqData);
      } else {
        errorOccurred = true;
        console.error(
          "Error fetching air quality data:",
          airQualityResponse.reason || airQualityResponse.value.status
        );
      }

      setIsError(errorOccurred);
    } catch (error) {
      console.error("Network error:", error);
      setIsError(true);
    } finally {
      setIsBackendGraphDataLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Process data when loaded
  useEffect(() => {
    if (
      allCoordinates.length > 0 &&
      allRoutes.length > 0 &&
      rawAirQualityData.length > 0 &&
      !isError &&
      !isBackendGraphDataLoading
    ) {
      // Process traffic data
      const newTrafficFeatures = allRoutes
        .map((route) => {
          const fromCoord = coordinatesMap.get(route.FROMNODENO);
          const toCoord = coordinatesMap.get(route.TONODENO);

          if (
            route.geometry?.type === "LineString" &&
            route.geometry?.coordinates?.length >= 2
          ) {
            return {
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
            };
          } else if (fromCoord && toCoord && route.VC !== undefined) {
            return {
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
            };
          }
          return null;
        })
        .filter(Boolean);

      setTrafficData({
        type: "FeatureCollection",
        features: newTrafficFeatures,
      });

      // Process network nodes
      const networkNodesFeatures = Array.from(coordinatesMap.entries()).map(
        ([nodeNo, coords]) => ({
          type: "Feature",
          properties: { id: `node-${nodeNo}`, "NODE-NO": nodeNo },
          geometry: { type: "Point", coordinates: coords.location.coordinates },
        })
      );

      setTrafficNetworkNodesGeoJSON({
        type: "FeatureCollection",
        features: networkNodesFeatures,
      });

      // Process air quality data
      const newAirQualityFeatures = rawAirQualityData
        .filter((aqData) => aqData.location?.coordinates)
        .map((aqData, index) => {
          const aqiValue = aqData.aqi ?? 0;
          let status = "good";
          if (aqiValue > 300) status = "very_unhealthy";
          else if (aqiValue > 200) status = "hazardous";
          else if (aqiValue > 150) status = "unhealthy";
          else if (aqiValue > 100) status = "unhealthy_sensitive";
          else if (aqiValue > 50) status = "moderate";

          const uniqueStationId =
            aqData.stationUid ||
            `station-${index}-${Math.random().toString(36).substr(2, 5)}`;

          return {
            type: "Feature",
            properties: {
              stationId: uniqueStationId,
              stationName: aqData.stationName || `Trạm ${uniqueStationId}`,
              aqi: aqiValue,
              pm25: aqData.pm25 ?? 0,
              co: aqData.co ?? 0,
              no2: aqData.no2 ?? 0,
              so2: aqData.so2 ?? 0,
              o3: aqData.o3 ?? 0,
              status,
              timestamp: aqData.time,
              displayPm25: `PM2.5: ${(aqData.pm25 ?? 0).toFixed(1)}`,
              icon: "air-quality-icon",
            },
            geometry: aqData.location,
          };
        });

      setAirQualityData({
        type: "FeatureCollection",
        features: newAirQualityFeatures,
      });

      // Generate random incidents for demo
      const availableNodeNumbers = Array.from(coordinatesMap.keys());
      const newIncidentFeatures = [];

      if (availableNodeNumbers.length > 0) {
        const node1 =
          availableNodeNumbers[
            Math.floor(Math.random() * availableNodeNumbers.length)
          ];
        const coords1 = coordinatesMap.get(node1);

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

        if (availableNodeNumbers.length > 1) {
          let node2 =
            availableNodeNumbers[
              Math.floor(Math.random() * availableNodeNumbers.length)
            ];
          while (node2 === node1) {
            node2 =
              availableNodeNumbers[
                Math.floor(Math.random() * availableNodeNumbers.length)
              ];
          }
          const coords2 = coordinatesMap.get(node2);

          if (coords2) {
            newIncidentFeatures.push({
              type: "Feature",
              properties: {
                type: "road_closure",
                description: "Đóng đường",
                severity: "medium",
                icon: "roadblock",
              },
              geometry: {
                type: "Point",
                coordinates: coords2.location.coordinates,
              },
            });
          }
        }
      }

      setIncidentData({
        type: "FeatureCollection",
        features: newIncidentFeatures,
      });
    } else {
      // Reset data if conditions aren't met
      setTrafficData({ type: "FeatureCollection", features: [] });
      setAirQualityData({ type: "FeatureCollection", features: [] });
      setIncidentData({ type: "FeatureCollection", features: [] });
      setTrafficNetworkNodesGeoJSON({
        type: "FeatureCollection",
        features: [],
      });
    }
  }, [
    allCoordinates,
    allRoutes,
    rawAirQualityData,
    isError,
    isBackendGraphDataLoading,
    coordinatesMap,
  ]);

  // Update loading state
  useEffect(() => {
    setLoading(!mapLoaded || isBackendGraphDataLoading || isError);
  }, [mapLoaded, isBackendGraphDataLoading, isError]);

  // Handle route selection
  const handleRouteSelected = useCallback(
    (startNodeNo, endNodeNo, geoJSONs) => {
      if (geoJSONs) {
        geoJSONs.forEach((geoJSON, index) => {
          console.log(`Segment ${index + 1}:`, {
            type: geoJSON.type,
            geometryType: geoJSON.geometry?.type,
            coordinatesLength: geoJSON.geometry?.coordinates?.length || 0,
            properties: geoJSON.properties,
          });
        });
      }
      if (
        !mapLoaded ||
        !mapRef.current ||
        allCoordinates.length === 0 ||
        isError
      ) {
        console.warn("Map or data not ready for route selection");
        return;
      }

      const startCoordObj = coordinatesMap.get(startNodeNo);
      const endCoordObj = coordinatesMap.get(endNodeNo);

      setRouteStartCoords(startCoordObj?.location.coordinates ?? null);
      setEndCoords(endCoordObj?.location.coordinates ?? null);

      // Process and validate route GeoJSONs
      const processedRouteGeoJSONs = (geoJSONs || [])
        .map((routeGeoJSON) => {
          if (
            !routeGeoJSON?.geometry ||
            routeGeoJSON.geometry.type !== "LineString" ||
            !routeGeoJSON.geometry.coordinates ||
            routeGeoJSON.geometry.coordinates.length < 2
          ) {
            console.warn("Invalid route GeoJSON:", routeGeoJSON);
            return null;
          }
          return routeGeoJSON;
        })
        .filter(Boolean);

      if (processedRouteGeoJSONs.length > 0) {
        const featureCollection = {
          type: "FeatureCollection",
          features: processedRouteGeoJSONs.map((geoJSON) =>
            geoJSON.type === "Feature"
              ? geoJSON
              : {
                  type: "Feature",
                  properties: geoJSON.properties || {},
                  geometry: geoJSON.geometry,
                }
          ),
        };
        setAllRoutesGeoJSONs(featureCollection);
        setHighlightedRouteGeoJSONs(
          processedRouteGeoJSONs.length === 1 ? featureCollection : null
        );
      } else {
        // Fallback test route
        const testRoute = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [105.83502456756739, 21.039980986978126],
                  [105.8470139835348, 21.03552884439553],
                ],
              },
            },
          ],
        };
        setAllRoutesGeoJSONs(testRoute);
        setRouteStartCoords([105.83502456756739, 21.039980986978126]);
        setEndCoords([105.8470139835348, 21.03552884439553]);
      }

      // Adjust camera to show the route
      if (
        mapRef.current &&
        (startCoordObj || endCoordObj || processedRouteGeoJSONs.length > 0)
      ) {
        const allCoords = [];
        if (startCoordObj) allCoords.push(startCoordObj.location.coordinates);
        if (endCoordObj) allCoords.push(endCoordObj.location.coordinates);

        processedRouteGeoJSONs.forEach((geoJSON) => {
          if (geoJSON.geometry?.coordinates) {
            allCoords.push(...geoJSON.geometry.coordinates);
          }
        });

        if (allCoords.length > 0) {
          const lons = allCoords.map((c) => c[0]);
          const lats = allCoords.map((c) => c[1]);

          mapRef.current.fitBounds(
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
            [50, 50, 50, 50], // padding
            1000 // animation duration
          );
        }
      }
    },
    [allCoordinates, isError, coordinatesMap, mapLoaded]
  );

  // Clear route
  const handleClearRoute = useCallback(() => {
    setRouteStartCoords(null);
    setEndCoords(null);
    setAllRoutesGeoJSONs(null);
    setHighlightedRouteGeoJSONs(null);
  }, []);

  // Air quality marker interactions
  const handleAirQualityFeaturePress = useCallback(
    (feature) => {
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
  }, []);

  // Map event handlers
  const handleMapLoaded = useCallback(() => {
    setMapLoaded(true);
    console.log("Map loaded successfully");
  }, []);

  const handleMapPress = useCallback(() => {
    if (selectedAqiData) {
      setSelectedAqiData(null);
    }
  }, [selectedAqiData]);

  // Toggle layer visibility
  const toggleLayer = useCallback((layerName) => {
    setLayersVisibility((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.mapContainer}>
          <MapWrapper
            mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
            startCoords={routeStartCoords}
            endCoords={endCoords}
            routeGeoJSONs={highlightedRouteGeoJSONs || allRoutesGeoJSONs}
            initialCenter={[105.818, 21.0545]}
            initialZoom={12}
            styleURL={MapboxGL.StyleURL.OUTDOORS}
            onMapLoaded={handleMapLoaded}
          >
            {mapLoaded && (
              <>
                {/* Traffic Network Nodes */}
                {layersVisibility.traffic &&
                  trafficNetworkNodesGeoJSON?.features?.length > 0 && (
                    <MapboxGL.ShapeSource
                      id="trafficNetworkNodesSource"
                      shape={trafficNetworkNodesGeoJSON}
                    >
                      <MapboxGL.CircleLayer
                        id="trafficNetworkNodesLayer"
                        style={styles.trafficNodesLayer}
                      />
                    </MapboxGL.ShapeSource>
                  )}

                {/* Traffic Layer */}
                {layersVisibility.traffic &&
                  trafficData.features.length > 0 && (
                    <MapboxGL.ShapeSource
                      id="trafficSource"
                      shape={trafficData}
                    >
                      <MapboxGL.LineLayer
                        id="trafficLayer"
                        style={styles.trafficLayer}
                      />
                    </MapboxGL.ShapeSource>
                  )}

                {/* Air Quality Layer */}
                {layersVisibility.airQuality &&
                  airQualityData.features.length > 0 && (
                    <MapboxGL.ShapeSource
                      id="airQualitySource"
                      shape={airQualityData}
                    >
                      <MapboxGL.CircleLayer
                        id="airQualityLayer"
                        style={styles.airQualityLayer}
                      />
                    </MapboxGL.ShapeSource>
                  )}

                {/* Incidents Layer */}
                {layersVisibility.incidents &&
                  incidentData.features.length > 0 && (
                    <MapboxGL.ShapeSource
                      id="incidentsSource"
                      shape={incidentData}
                    >
                      <MapboxGL.SymbolLayer
                        id="incidentsLayer"
                        style={styles.incidentsLayer}
                      />
                    </MapboxGL.ShapeSource>
                  )}

                {/* Air Quality Markers */}
                {layersVisibility.airQuality &&
                  airQualityData.features.map((feature) => (
                    <MapboxGL.MarkerView
                      key={`aqi-${feature.properties.stationId}`}
                      coordinate={feature.geometry.coordinates}
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                      <TouchableOpacity
                        onPress={() => handleAirQualityFeaturePress(feature)}
                        style={styles.aqiMarkerContainer}
                      >
                        {/* <AirQualityMarker stationData={feature.properties} /> */}
                      </TouchableOpacity>
                    </MapboxGL.MarkerView>
                  ))}

                {/* Selected Air Quality Callout */}
                {selectedAqiData && (
                  <MapboxGL.MarkerView
                    coordinate={selectedAqiData.coordinates}
                    anchor={{ x: 0.5, y: 0 }}
                  >
                    {/* <AirQualityCallout
                      data={selectedAqiData}
                      onClose={handleCloseAqiPanel}
                    /> */}
                  </MapboxGL.MarkerView>
                )}
              </>
            )}
          </MapWrapper>

          {/* Loading/Error Overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={styles.loadingText}>
                {isError
                  ? "Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối và máy chủ backend."
                  : "Đang tải dữ liệu đồ thị và không khí từ máy chủ..."}
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
        </View>

        {/* Route Finding Panel */}
        <RouteFindingPanel
          onRouteSelected={handleRouteSelected}
          onClearRoute={handleClearRoute}
          allCoordinates={allCoordinates}
          disabled={loading || isError}
          style={styles.routePanel}
        />

        {/* Layer Controls */}
        <View style={styles.floatingControls}>
          <Text style={styles.controlPanelTitle}>Lớp:</Text>
          <View style={styles.layerButtonsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.keys(layersVisibility).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.layerButton,
                    layersVisibility[key] && styles.layerButtonActive,
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

// Styles
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
    ...StyleSheet.absoluteFillObject,
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
  trafficNodesLayer: {
    circleRadius: 3,
    circleColor: "#6A057F",
    circleOpacity: 0.7,
    circleStrokeColor: "white",
    circleStrokeWidth: 0.5,
  },
  trafficLayer: {
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
  },
  airQualityLayer: {
    circleColor: [
      "match",
      ["get", "status"],
      "very_unhealthy",
      "rgba(126, 0, 35, 0.4)",
      "hazardous",
      "rgba(139, 0, 139, 0.4)",
      "unhealthy",
      "rgba(231, 76, 60, 0.4)",
      "unhealthy_sensitive",
      "rgba(255, 165, 0, 0.4)",
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
  },
  incidentsLayer: {
    iconImage: ["get", "icon"],
    iconSize: 1.5,
    textField: ["get", "description"],
    textColor: "black",
    textSize: 12,
    textHaloColor: "white",
    textHaloWidth: 1,
    textAnchor: "top",
    textOffset: [0, 1],
  },
  aqiMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
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
  routePanel: {
    position: "absolute",
    top: Platform.OS === "android" ? 30 : 30,
    left: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: height * 0.4,
    overflow: "hidden",
    zIndex: 1000,
  },
});

export default CurrentStatusMapScreen;
