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
// Removed proj4 - assuming backend returns WGS84 (EPSG:4326) coordinates

import RouteFindingPanel from "../../components/RouteFindingPanel.js";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";

const { width, height } = Dimensions.get("window");

// --- API Endpoints (REPLACE WITH YOUR ACTUAL BACKEND URLs) ---
const API_BASE_URL = "http://10.13.137.143:3000/api";
const COORDINATES_API_URL = `${API_BASE_URL}/coordinates`;
const ROUTES_API_URL = `${API_BASE_URL}/routes`;
// --- END API Endpoints ---

const SimulationMapScreen = () => {
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);

  const [routeStartCoords, setRouteStartCoords] = useState(null); // WGS84: [lon, lat]
  const [endCoords, setEndCoords] = useState(null); // WGS84: [lon, lat]
  const [allRoutesGeoJSONs, setAllRoutesGeoJSONs] = useState(null); // Array of GeoJSONs for found routes (WGS84)

  const [trafficNetworkNodesGeoJSON, setTrafficNetworkNodesGeoJSON] =
    useState(null);

  const [layersVisibility, setLayersVisibility] = useState({
    traffic: true,
    airQuality: true,
    incidents: true,
  });

  const [allCoordinates, setAllCoordinates] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);

  // GeoJSON data for map layers
  const [trafficData, setTrafficData] = useState(null);
  const [airQualityData, setAirQualityData] = useState(null);
  const [incidentData, setIncidentData] = useState(null);

  // --- Map allCoordinates to a Map for efficient lookup ---
  const coordinatesMap = useMemo(() => {
    const map = new Map();
    allCoordinates.forEach((coord) => {
      // Use the actual field name from your MongoDB model for nodes
      // which is "NODE-NO" based on your schema.
      map.set(coord["NODE-NO"], coord);
    });
    return map;
  }, [allCoordinates]);

  const fetchGraphData = useCallback(async () => {
    setIsBackendGraphDataLoading(true);
    setIsError(false);
    console.log("SimulationMapScreen: Starting backend graph data fetch...");
    try {
      const [coordsResponse, routesResponse] = await Promise.allSettled([
        fetch(COORDINATES_API_URL),
        fetch(ROUTES_API_URL),
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

  // Effect to process allRoutes and allCoordinates into GeoJSONs for map layers
  useEffect(() => {
    console.log(
      `SimulationMapScreen: Checking to create GeoJSON. allCoordinates.length: ${allCoordinates.length}, allRoutes.length: ${allRoutes.length}, isError: ${isError}, isBackendGraphDataLoading: ${isBackendGraphDataLoading}`
    );

    if (
      allCoordinates.length > 0 &&
      allRoutes.length > 0 &&
      !isError &&
      !isBackendGraphDataLoading
    ) {
      // --- Generate Traffic Data GeoJSON ---
      const newTrafficFeatures = allRoutes
        .map((route) => {
          // Use `coordinatesMap` for efficient lookup
          const fromCoord = coordinatesMap.get(route.FROMNODENO);
          const toCoord = coordinatesMap.get(route.TONODENO);

          // IMPORTANT: Check if route.geometry exists and is a valid LineString
          // If your backend provides `route.geometry` directly, use that.
          // Otherwise, construct a simple LineString from FROMNODENO and TONODENO.
          // Assuming `route.geometry` is provided by the backend and is WGS84.
          if (
            route.geometry &&
            route.geometry.type === "LineString" &&
            route.geometry.coordinates &&
            route.geometry.coordinates.length >= 2
          ) {
            return {
              type: "Feature",
              properties: {
                id: route.linkNo, // Using `linkNo` from Mongoose schema
                VC: route.VC,
                status:
                  route.VC <= 0.6
                    ? "smooth"
                    : route.VC <= 0.8
                    ? "moderate"
                    : "congested",
                // Add any other route properties from your schema if needed for styling/display
                // e.g., length: route.length, numLanes: route.NUMLANES
              },
              geometry: route.geometry, // Use the geometry directly from backend
            };
          } else if (fromCoord && toCoord && route.VC !== undefined) {
            // Fallback: If `route.geometry` is missing or invalid,
            // create a straight line from node coordinates.
            // Use `location.coordinates` which is already [lon, lat] (WGS84)
            return {
              type: "Feature",
              properties: {
                id: route.linkNo, // Using `linkNo` from Mongoose schema
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
                  fromCoord.location.coordinates, // [lon, lat]
                  toCoord.location.coordinates, // [lon, lat]
                ],
              },
            };
          }
          return null;
        })
        .filter(Boolean); // Remove null entries

      setTrafficData({
        type: "FeatureCollection",
        features: newTrafficFeatures,
      });
      console.log(
        `SimulationMapScreen: Created GeoJSON for traffic. Feature count: ${newTrafficFeatures.length}.`
      );
      console.log(
        "SimulationMapScreen: If traffic lines are straight, ensure your backend 'routes' data provides the `geometry` field with intermediate coordinates."
      );

      // --- Generate Traffic Network Nodes GeoJSON ---
      const networkNodesFeatures = [];
      coordinatesMap.forEach((coords, nodeNo) => {
        // Use `location.coordinates` which is already [lon, lat] (WGS84)
        networkNodesFeatures.push({
          type: "Feature",
          properties: {
            id: `node-${nodeNo}`,
            // Add any other node properties if available/relevant for display
            "NODE-NO": nodeNo, // Include the node number
          },
          geometry: {
            type: "Point",
            coordinates: coords.location.coordinates, // [lon, lat]
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

      // --- Generate Air Quality Data GeoJSON (from nodes with pollutionFactor) ---
      const nodePollutionData = new Map();
      allRoutes.forEach((route) => {
        if (route.pollutionFactor !== undefined) {
          const fromNode = route.FROMNODENO;
          const toNode = route.TONODENO;
          const pollution = route.pollutionFactor;

          // Aggregate pollution factor for both ends of the route
          if (!nodePollutionData.has(fromNode))
            nodePollutionData.set(fromNode, { sumPollution: 0, count: 0 });
          const fromNodeData = nodePollutionData.get(fromNode);
          fromNodeData.sumPollution += pollution;
          fromNodeData.count += 1;

          if (!nodePollutionData.has(toNode))
            nodePollutionData.set(toNode, { sumPollution: 0, count: 0 });
          const toNodeData = nodePollutionData.get(toNode);
          toNodeData.sumPollution += pollution;
          toNodeData.count += 1;
        }
      });

      const newAirQualityFeatures = [];
      nodePollutionData.forEach((data, nodeNo) => {
        const coords = coordinatesMap.get(nodeNo);
        if (coords && data.count > 0) {
          const averagePollution = data.sumPollution / data.count;
          let status = "good";
          if (averagePollution > 20) status = "unhealthy";
          else if (averagePollution > 10) status = "moderate";

          newAirQualityFeatures.push({
            type: "Feature",
            properties: {
              nodeId: nodeNo,
              pm25: averagePollution,
              status: status,
            },
            geometry: {
              type: "Point",
              coordinates: coords.location.coordinates, // Use WGS84 coordinates from `location` field
            },
          });
        }
      });
      setAirQualityData({
        type: "FeatureCollection",
        features: newAirQualityFeatures,
      });
      console.log(
        `SimulationMapScreen: Created GeoJSON for air quality. Feature count: ${newAirQualityFeatures.length}`
      );

      // --- Generate Incident Data GeoJSON (using a subset of transformed coordinates and mock properties) ---
      const newIncidentFeatures = [];
      const availableNodeNumbers = Array.from(coordinatesMap.keys());

      // Add a couple of mock incidents using actual node coordinates
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
              coordinates: coords1.location.coordinates, // Use WGS84 coordinates from `location` field
            },
          });
        }
        if (coords2 && node1 !== node2) {
          newIncidentFeatures.push({
            type: "Feature",
            properties: {
              type: "road_closure",
              description: "Đóng đường (sim)",
              severity: "medium",
              icon: "roadblock",
            },
            geometry: {
              type: "Point",
              coordinates: coords2.location.coordinates, // Use WGS84 coordinates from `location` field
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
    } else if (isError) {
      console.warn(
        "SimulationMapScreen: Not creating GeoJSON due to backend data loading error."
      );
    } else if (isBackendGraphDataLoading) {
      console.log(
        "SimulationMapScreen: GeoJSON not created because backend data is still loading."
      );
    } else {
      console.warn(
        "SimulationMapScreen: Not creating GeoJSON because allCoordinates or allRoutes are empty or there's an error after loading.",
        {
          allCoordinatesLength: allCoordinates.length,
          allRoutesLength: allRoutes.length,
          isError,
          isBackendGraphDataLoading,
        }
      );
    }
  }, [
    allCoordinates,
    allRoutes,
    isError,
    isBackendGraphDataLoading,
    coordinatesMap,
  ]); // Added coordinatesMap to dependency array

  // Set overall loading status
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

  const handleMapWrapperLoaded = useCallback(() => {
    setMapLoaded(true);
    console.log("SimulationMapScreen: MapWrapper reported map loaded!");
  }, []);

  const toggleLayer = (layerName) => {
    setLayersVisibility((prevState) => ({
      ...prevState,
      [layerName]: !prevState[layerName],
    }));
    console.log(
      `SimulationMapScreen: Toggling layer ${layerName}. New state: ${!layersVisibility[
        layerName
      ]}`
    );
  };

  // Callback from RouteFindingPanel when a route is found
  const handleRouteSelected = useCallback(
    (startNodeNo, endNodeNo, geoJSONs) => {
      if (allCoordinates.length === 0 || isError) {
        console.warn(
          "SimulationMapScreen: Backend graph data not fully loaded or has errors. Cannot set markers."
        );
        return;
      }

      // Set marker coordinates directly from the coordinatesMap
      const startCoordObj = coordinatesMap.get(startNodeNo);
      const endCoordObj = coordinatesMap.get(endNodeNo);

      setRouteStartCoords(
        startCoordObj ? startCoordObj.location.coordinates : null
      );
      setEndCoords(endCoordObj ? endCoordObj.location.coordinates : null);

      // The `geoJSONs` from RouteFindingPanel should ideally already be in WGS84
      // if your backend is consistent. Removed proj4 transformation here.
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
            // Assuming routeGeoJSON.geometry.coordinates are already WGS84 [lon, lat]
            return routeGeoJSON;
          }
          return null; // Return null for invalid LineStrings to filter them out
        })
        .filter(Boolean); // Filter out any null entries

      setAllRoutesGeoJSONs(processedRouteGeoJSONs);
      console.log(
        `SimulationMapScreen: Route selected from ${startNodeNo} to ${endNodeNo}. Markers and route set.`
      );
    },
    [allCoordinates, isError, coordinatesMap] // Added coordinatesMap to dependency array
  );

  const handleClearRoute = useCallback(() => {
    setRouteStartCoords(null);
    setEndCoords(null);
    setAllRoutesGeoJSONs(null);
    console.log("SimulationMapScreen: Markers and route cleared.");
  }, []);

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
        dataMap[layerKey].features &&
        dataMap[layerKey].features.length > 0
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
            layerStyleProps.circleRadius = [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              ["interpolate", ["linear"], ["get", "pm25"], 0, 3, 60, 8],
              15,
              ["interpolate", ["linear"], ["get", "pm25"], 0, 8, 60, 15],
            ];
            layerStyleProps.circleOpacity = 0.8;
            layerStyleProps.circleStrokeColor = "white";
            layerStyleProps.circleStrokeWidth = 1;
            break;
          case "incidents":
            MapboxGLLayerComponent = MapboxGL.SymbolLayer;
            layerStyleProps.iconImage = ["get", "icon"];
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
            images={
              layerKey === "incidents"
                ? {
                    "fire-station": {
                      uri: "https://placehold.co/50x50/ff0000/ffffff?text=🔥",
                    },
                    roadblock: {
                      uri: "https://placehold.co/50x50/000000/ffffff?text=🚧",
                    },
                  }
                : undefined
            }
          >
            <MapboxGLLayerComponent
              id={`${layerKey}Layer`}
              style={layerStyleProps}
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
        <View style={styles.mapContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={styles.loadingText}>
                {isError
                  ? "Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối và máy chủ backend."
                  : isBackendGraphDataLoading
                  ? "Đang tải dữ liệu đồ thị từ máy chủ..."
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
          <MapWrapper
            mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
            startCoords={routeStartCoords}
            endCoords={endCoords}
            routeGeoJSONs={allRoutesGeoJSONs}
            initialCenter={[105.8342, 21.0278]} // Hanoi center coordinates: [Longitude, Latitude]
            initialZoom={12}
            styleURL={MapboxGL.Style.OUTDOORS}
            onMapLoaded={handleMapWrapperLoaded}
          >
            {/* Markers for start and end points */}
            {routeStartCoords && (
              <MapboxGL.PointAnnotation
                id="startPoint"
                coordinate={routeStartCoords}
              >
                <View style={styles.marker}>
                  <Text style={styles.markerText}>A</Text>
                </View>
              </MapboxGL.PointAnnotation>
            )}
            {endCoords && (
              <MapboxGL.PointAnnotation id="endPoint" coordinate={endCoords}>
                <View style={[styles.marker, styles.endMarker]}>
                  <Text style={styles.markerText}>B</Text>
                </View>
              </MapboxGL.PointAnnotation>
            )}

            {/* Layer for all traffic network nodes, visible with traffic layer */}
            {layersVisibility.traffic && trafficNetworkNodesGeoJSON && (
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

            {/* Pass dynamic data layers as children */}
            {["traffic", "airQuality", "incidents"].map(renderLayer)}
          </MapWrapper>
        </View>

        <RouteFindingPanel
          onRouteSelected={handleRouteSelected}
          onClearRoute={handleClearRoute}
          allCoordinates={allCoordinates} // Pass allCoordinates for dropdown/input
          disabled={loading || isError}
        />

        <View style={styles.floatingControls}>
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
    backgroundColor: "#e74c3c", // Red for end marker
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
});

export default SimulationMapScreen;
