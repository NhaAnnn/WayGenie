import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Alert,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import MapWrapper from "../../components/SimulationMapWraper.native.js";
import RouteFindingPanel from "../../components/RouteFindingPanel.native.js";
import AirQualityMarker from "../../components/SimulationAirQualityMarker";
import AirQualityCallout from "../../components/SimulationAirQualityCallout";
import RouteCallout from "../../components/SimulationRouteCallout";
import SimulationTrafficCallout from "../../components/SimulationTrafficCallout";
import SimulationTrafficPanel from "../../components/SimulationTrafficPanel";
import {
  MAPBOX_PUBLIC_ACCESS_TOKEN,
  BACKEND_API_BASE_URL,
} from "../../secrets.js";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import SimulationAqiPanel from "../../components/SimulationAqiPanel.js";

const { width, height } = Dimensions.get("window");

MapboxGL.setAccessToken(MAPBOX_PUBLIC_ACCESS_TOKEN);

const COORDINATES_API_URL = `${BACKEND_API_BASE_URL}/coordinates`;
const ROUTES_API_URL = `${BACKEND_API_BASE_URL}/routes`;
const AIR_QUALITY_API_URL = `${BACKEND_API_BASE_URL}/aqis`;
const SIMULATIONS_API_URL = `${BACKEND_API_BASE_URL}/simulate`;

const SimulationMapScreen = () => {
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [routeStartCoords, setRouteStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [layersVisibility, setLayersVisibility] = useState({
    traffic: false,
    airQuality: false,
  });
  const [allCoordinates, setAllCoordinates] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [rawAirQualityData, setRawAirQualityData] = useState([]);
  const [simulatedAqiData, setSimulatedAqiData] = useState([]);
  const [simulatedTrafficData, setSimulatedTrafficData] = useState(new Map());
  const [trafficData, setTrafficData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [airQualityData, setAirQualityData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [selectedAqiData, setSelectedAqiData] = useState(null);
  const [selectedRouteData, setSelectedRouteData] = useState(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [mapRefInitialized, setMapRefInitialized] = useState(false);
  const [routeFeatures, setRouteFeatures] = useState([]);
  const [isHighlightedRouteId, setHighlightedRouteId] = useState(null);
  const [topLayerId, setTopLayerId] = useState("road-label");
  const [routeLabelData, setRouteLabelData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [selectedTrafficData, setSelectedTrafficData] = useState(null);
  const [isTrafficPanelVisible, setTrafficPanelVisible] = useState(false);
  const [isAqiPanelVisible, setAqiPanelVisible] = useState(false);
  const { authToken, logout } = useAuth();

  const mapRef = useRef(null);

  const coordinatesMap = useMemo(() => {
    const map = new Map();
    allCoordinates.forEach((coord) => {
      map.set(coord["node_id"], coord);
    });
    return map;
  }, [allCoordinates]);

  useEffect(() => {
    const checkMapRef = setInterval(() => {
      if (
        mapRef.current &&
        mapRef.current.getMapRef &&
        mapRef.current.getMapRef() &&
        mapRef.current.fitBounds &&
        mapRef.current.calculateBoundingBox
      ) {
        console.log("SimulationMapScreen: mapRef.current is fully initialized");
        setMapRefInitialized(true);
        clearInterval(checkMapRef);
      } else {
        console.warn(
          "SimulationMapScreen: Waiting for mapRef.current initialization"
        );
      }
    }, 100);
    return () => clearInterval(checkMapRef);
  }, []);

  useEffect(() => {
    if (mapRef.current?.getMapRef() && mapLoaded) {
      const map = mapRef.current.getMapRef();
      if (map && typeof map.getStyle === "function") {
        map.getStyle((err, style) => {
          if (!err && style?.layers) {
            const layers = style.layers;
            if (layers.length > 0) {
              const labelLayer = layers.find(
                (layer) =>
                  layer.id.includes("label") || layer.id.includes("road-name")
              );
              const topRelevantLayerId = labelLayer
                ? labelLayer.id
                : layers[layers.length - 1].id;
              setTopLayerId(topRelevantLayerId);
              console.log("Top layer ID set to:", topRelevantLayerId);
            }
          } else {
            console.warn(
              "Failed to get style, using fallback topLayerId:",
              topLayerId
            );
          }
        });
      }
    }
  }, [mapLoaded]);

  const fetchGraphData = useCallback(async () => {
    setIsBackendGraphDataLoading(true);
    setIsError(false);
    setErrorMessage("");
    console.log("Fetching backend data...");
    try {
      const [
        coordsResponse,
        routesResponse,
        airQualityResponse,
        simulationsResponse,
      ] = await Promise.allSettled([
        fetch(COORDINATES_API_URL),
        fetch(ROUTES_API_URL),
        fetch(AIR_QUALITY_API_URL),
        axios.get(SIMULATIONS_API_URL, getAuthHeaders()),
      ]);

      let errorOccurred = false;
      let errorDetails = [];

      if (coordsResponse.status === "fulfilled" && coordsResponse.value.ok) {
        const coordsData = await coordsResponse.value.json();
        setAllCoordinates(coordsData);
      } else {
        errorOccurred = true;
        errorDetails.push(
          `Coordinates: ${
            coordsResponse.reason ||
            coordsResponse.value?.statusText ||
            "Unknown error"
          }`
        );
      }

      if (routesResponse.status === "fulfilled" && routesResponse.value.ok) {
        const routesData = await routesResponse.value.json();
        setAllRoutes(routesData);
      } else {
        errorOccurred = true;
        errorDetails.push(
          `Routes: ${
            routesResponse.reason ||
            routesResponse.value?.statusText ||
            "Unknown error"
          }`
        );
      }

      if (
        airQualityResponse.status === "fulfilled" &&
        airQualityResponse.value.ok
      ) {
        const aqData = await airQualityResponse.value.json();
        setRawAirQualityData(aqData);
      } else {
        errorOccurred = true;
        errorDetails.push(
          `Air Quality: ${
            airQualityResponse.reason ||
            airQualityResponse.value?.statusText ||
            "Unknown error"
          }`
        );
      }

      if (
        simulationsResponse.status === "fulfilled" &&
        simulationsResponse.value.data.success
      ) {
        const simulations = simulationsResponse.value.data.simulations;
        const aqiSimulations = simulations
          .filter((sim) => sim.simulation_type === "aqi" && sim.is_active)
          .map((sim) => {
            const data = sim.simulation_data;
            if (
              !data.lon ||
              !data.lat ||
              !data.aqi ||
              !data.pm25 ||
              isNaN(parseFloat(data.lon)) ||
              isNaN(parseFloat(data.lat)) ||
              isNaN(parseFloat(data.aqi)) ||
              isNaN(parseFloat(data.pm25))
            ) {
              console.warn(
                `Invalid AQI simulation data for simulation ${sim._id}:`,
                data
              );
              return null;
            }
            return {
              _id: sim._id,
              simulation_name: sim.simulation_name,
              stationId: data.stationId,
              lon: parseFloat(data.lon),
              lat: parseFloat(data.lat),
              pm25: parseFloat(data.pm25),
              pm10: parseFloat(data.pm10 || 0),
              co: parseFloat(data.co || 0),
              no2: parseFloat(data.no2 || 0),
              so2: parseFloat(data.so2 || 0),
              o3: parseFloat(data.o3 || 0),
              aqi: parseFloat(data.aqi),
              radiusKm: parseFloat(data.radiusKm || 1),
              location: {
                type: "Point",
                coordinates: [parseFloat(data.lon), parseFloat(data.lat)],
              },
              isSimulated: true,
            };
          })
          .filter(Boolean);
        const trafficSimulations = new Map();
        simulations
          .filter((sim) => sim.simulation_type === "traffic" && sim.is_active)
          .forEach((sim) => {
            const data = sim.simulation_data;
            const trafficImpact = {
              _id: sim._id,
              simulation_name: sim.simulation_name,
              fromNode: data.fromNode,
              toNode: data.toNode,
              VC: parseFloat(data.VC),
              incident: data.incident,
              isBlocked: data.isBlocked || false,
              isSimulated: true,
            };
            trafficSimulations.set(data.segmentKey, trafficImpact);
            trafficSimulations.set(data.reverseSegmentKey, trafficImpact);
          });
        setSimulatedAqiData(aqiSimulations);
        setSimulatedTrafficData(trafficSimulations);
      } else {
        errorOccurred = true;
        errorDetails.push(
          `Simulations: ${
            simulationsResponse.reason ||
            simulationsResponse.value?.statusText ||
            "Unknown error"
          }`
        );
      }

      if (errorOccurred) {
        setIsError(true);
        setErrorMessage(`Lỗi tải dữ liệu: ${errorDetails.join("; ")}`);
      }
    } catch (error) {
      console.error("Network error:", error);
      setIsError(true);
      setErrorMessage(`Lỗi mạng: ${error.message}`);
    } finally {
      setIsBackendGraphDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      mapLoaded &&
      mapRefInitialized &&
      allCoordinates.length > 0 &&
      !isBackendGraphDataLoading &&
      !isError
    ) {
      setInitialDataLoaded(true);
    } else {
      setInitialDataLoaded(false);
    }
  }, [
    mapLoaded,
    mapRefInitialized,
    allCoordinates,
    isBackendGraphDataLoading,
    isError,
  ]);

  useEffect(() => {
    MapboxGL.setTelemetryEnabled(true);
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    if (
      allCoordinates.length > 0 &&
      allRoutes.length > 0 &&
      rawAirQualityData.length > 0 &&
      !isError &&
      !isBackendGraphDataLoading
    ) {
      const newTrafficFeatures = allRoutes
        .map((route) => {
          const fromCoord = coordinatesMap.get(route.FROMNODENO);
          const toCoord = coordinatesMap.get(route.TONODENO);
          const segmentKey = `${route.FROMNODENO}-${route.TONODENO}`;
          const reverseSegmentKey = `${route.TONODENO}-${route.FROMNODENO}`;
          const simulatedTraffic =
            simulatedTrafficData.get(segmentKey) ||
            simulatedTrafficData.get(reverseSegmentKey);

          const properties = {
            id: route.linkNo,
            VC: simulatedTraffic ? simulatedTraffic.VC : route.VC,
            status: simulatedTraffic
              ? simulatedTraffic.incident !== "Không"
                ? simulatedTraffic.incident.toLowerCase()
                : simulatedTraffic.VC <= 0.6
                ? "smooth"
                : simulatedTraffic.VC <= 0.8
                ? "moderate"
                : "congested"
              : route.VC <= 0.6
              ? "smooth"
              : route.VC <= 0.8
              ? "moderate"
              : "congested",
            fromNode: route.FROMNODENO,
            toNode: route.TONODENO,
            length: route.LENGTH || 0,
            incidentType: simulatedTraffic ? simulatedTraffic.incident : null,
            incidentDescription: simulatedTraffic
              ? simulatedTraffic.incident !== "Không"
                ? `${simulatedTraffic.incident} (sim)`
                : null
              : null,
            incidentSeverity: simulatedTraffic
              ? simulatedTraffic.incident !== "Không"
                ? "high"
                : null
              : null,
            isSimulated: !!simulatedTraffic,
          };

          if (
            route.geometry?.type === "LineString" &&
            Array.isArray(route.geometry.coordinates) &&
            route.geometry.coordinates.length >= 2
          ) {
            return {
              type: "Feature",
              properties,
              geometry: route.geometry,
            };
          } else if (fromCoord && toCoord && route.VC !== undefined) {
            return {
              type: "Feature",
              properties,
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

      const newAirQualityFeatures = [...rawAirQualityData, ...simulatedAqiData]
        .filter((aqData) => {
          if (!aqData.location?.coordinates) {
            console.warn(
              "Skipping air quality data with invalid location:",
              aqData
            );
            return false;
          }
          if (
            !Array.isArray(aqData.location.coordinates) ||
            aqData.location.coordinates.length !== 2 ||
            isNaN(aqData.location.coordinates[0]) ||
            isNaN(aqData.location.coordinates[1])
          ) {
            console.warn(
              "Skipping air quality data with invalid coordinates:",
              aqData
            );
            return false;
          }
          return true;
        })
        .map((aqData, index) => {
          const aqiValue = parseFloat(aqData.aqi) || 0;
          let status = "good";
          if (aqiValue > 300) status = "very_unhealthy";
          else if (aqiValue > 200) status = "hazardous";
          else if (aqiValue > 150) status = "unhealthy";
          else if (aqiValue > 100) status = "unhealthy_sensitive";
          else if (aqiValue > 50) status = "moderate";

          const uniqueStationId = aqData.stationId
            ? `${aqData.stationId}-${
                aqData.isSimulated ? "sim" : "real"
              }-${index}`
            : `station-${index}-${Math.random().toString(36).substr(2, 5)}`;

          return {
            type: "Feature",
            properties: {
              stationUid: uniqueStationId,
              stationName:
                aqData.simulation_name ||
                aqData.stationName ||
                `Trạm ${uniqueStationId}`,
              aqi: aqiValue,
              pm25: parseFloat(aqData.pm25) || 0,
              co: parseFloat(aqData.co) || 0,
              no2: parseFloat(aqData.no2) || 0,
              so2: parseFloat(aqData.so2) || 0,
              o3: parseFloat(aqData.o3) || 0,
              status,
              timestamp: aqData.time || new Date().toISOString(),
              displayPm25: `PM2.5: ${(parseFloat(aqData.pm25) || 0).toFixed(
                1
              )}`,
              icon: "air-quality-icon",
              isSimulated: aqData.isSimulated || false,
            },
            geometry: {
              type: "Point",
              coordinates: [
                parseFloat(aqData.location.coordinates[0]),
                parseFloat(aqData.location.coordinates[1]),
              ],
            },
          };
        });

      console.log(
        `Processed ${newAirQualityFeatures.length} air quality features`
      );

      setAirQualityData({
        type: "FeatureCollection",
        features: newAirQualityFeatures,
      });
    } else {
      setTrafficData({ type: "FeatureCollection", features: [] });
      setAirQualityData({ type: "FeatureCollection", features: [] });
    }
  }, [
    allCoordinates,
    allRoutes,
    rawAirQualityData,
    simulatedAqiData,
    simulatedTrafficData,
    isError,
    isBackendGraphDataLoading,
    coordinatesMap,
  ]);

  useEffect(() => {
    if (routeFeatures.length > 0) {
      const newLabelFeatures = routeFeatures.flatMap((featureCollection) =>
        featureCollection.features
          .filter(
            (f) =>
              f.geometry.type === "LineString" && f.properties?.recommendedMode
          )
          .map((routeFeature) => {
            const coordinates = routeFeature.geometry.coordinates;
            let midPoint = null;
            if (coordinates.length > 1) {
              const midIndex = Math.floor(coordinates.length / 2);
              midPoint = coordinates[midIndex];
            } else if (coordinates.length === 1) {
              midPoint = coordinates[0];
            }

            if (midPoint) {
              return {
                type: "Feature",
                properties: {
                  id: `label-${routeFeature.properties.routeId}`,
                  labelText: `PT: ${routeFeature.properties.recommendedMode}`,
                  routeId: routeFeature.properties.routeId,
                  isHighlighted:
                    routeFeature.properties.routeId === isHighlightedRouteId,
                },
                geometry: {
                  type: "Point",
                  coordinates: midPoint,
                },
              };
            }
            return null;
          })
          .filter(Boolean)
      );

      setRouteLabelData({
        type: "FeatureCollection",
        features: newLabelFeatures,
      });
    } else {
      setRouteLabelData({ type: "FeatureCollection", features: [] });
    }
  }, [routeFeatures, isHighlightedRouteId]);

  useEffect(() => {
    setLoading(
      !mapLoaded || !mapRefInitialized || isBackendGraphDataLoading || isError
    );
  }, [mapLoaded, mapRefInitialized, isBackendGraphDataLoading, isError]);

  const handleRouteSelected = useCallback(
    (
      startCoords,
      endCoords,
      allRoutesGeoJSON, // This is an Array<FeatureCollection>
      selectedRouteId,
      selectedRoutingCriterionId // This parameter is actually not needed here anymore for feature processing, but kept for consistency
    ) => {
      console.log(
        "Received allRoutesGeoJSON in handleRouteSelected:",
        JSON.stringify(allRoutesGeoJSON, null, 2)
      ); // Add this log

      setHighlightedRouteId(selectedRouteId);
      setRouteStartCoords(startCoords);
      setEndCoords(endCoords);
      setSelectedRouteData(null);

      if (!startCoords || !endCoords) {
        console.error("Invalid startCoords or endCoords:", {
          startCoords,
          endCoords,
        });
        return;
      }

      let processedRouteFeatures = [];
      if (allRoutesGeoJSON && allRoutesGeoJSON.length > 0) {
        allRoutesGeoJSON.forEach((featureCollection) => {
          // 'featureCollection' is an object like { type: "FeatureCollection", features: [...] }
          if (
            !featureCollection ||
            !Array.isArray(featureCollection.features)
          ) {
            console.warn(
              "Skipping invalid FeatureCollection in handleRouteSelected:",
              featureCollection
            );
            return; // Skip this item if it's not a valid FeatureCollection
          }

          featureCollection.features.forEach((feature) => {
            // All features are processed here. The necessary properties (like healthScore,
            // recommendedMode, pollution) should already be present in feature.properties
            // because fetchRoute already mapped them into the 'features' array.
            processedRouteFeatures.push({
              ...feature,
              properties: {
                ...feature.properties,
                // Ensure routeId and isHighlighted are correctly set
                routeId: feature.properties.routeId || featureCollection.id, // Use featureCollection.id if feature.properties.routeId isn't there
                isHighlighted:
                  (feature.properties.routeId || featureCollection.id) ===
                  selectedRouteId, // Check against feature's own routeId or the collection's ID
                recommendedMode: feature.properties.recommendedMode || null,
                healthScore: feature.properties.healthScore || -1,
              },
            });
          });
        });

        const allFeatures = processedRouteFeatures.filter(
          (f) => f.geometry && f.geometry.type === "LineString"
        );
        console.log(
          "Final features for map drawing (allFeatures in handleRouteSelected):",
          JSON.stringify(allFeatures, null, 2)
        ); // Add this log

        setRouteFeatures([
          { type: "FeatureCollection", features: allFeatures },
        ]);

        if (mapRef.current?.fitBounds && mapRef.current?.calculateBoundingBox) {
          // Ensure that allFeatures is not empty before trying to calculate bounds
          if (allFeatures.length > 0) {
            const bounds = mapRef.current.calculateBoundingBox(allFeatures);
            if (bounds) {
              const [sw, ne] = bounds;
              mapRef.current.fitBounds(sw, ne, [50, 50, 50, 50], 1000);
            } else {
              console.warn(
                "calculateBoundingBox returned null/undefined bounds."
              );
            }
          } else {
            console.warn("No LineString features to fit bounds on.");
          }
        }
      } else {
        console.warn(
          "allRoutesGeoJSON is empty or invalid in handleRouteSelected."
        );
      }
    },
    []
  );

  const handleClearRoute = useCallback(() => {
    setRouteStartCoords(null);
    setEndCoords(null);
    setHighlightedRouteId(null);
    setRouteFeatures([]);
    setSelectedRouteData(null);
  }, []);

  const handleAirQualityFeaturePress = useCallback(
    (feature) => {
      if (layersVisibility.airQuality) {
        setSelectedAqiData({
          ...feature.properties,
          coordinates: feature.geometry.coordinates,
        });
        setSelectedRouteData(null);
        setSelectedTrafficData(null);
      }
    },
    [layersVisibility.airQuality]
  );

  const handleCloseAqiPanel = useCallback(() => {
    setSelectedAqiData(null);
  }, []);

  const handleRouteFeaturePress = useCallback(
    (e) => {
      if (e.features && e.features.length > 0) {
        const tappedFeature = e.features[0];
        if (tappedFeature.properties?.routeId === isHighlightedRouteId) {
          setSelectedRouteData({
            ...tappedFeature.properties,
            coordinates: tappedFeature.geometry.coordinates[0],
          });
          setSelectedAqiData(null);
          setSelectedTrafficData(null);
        }
      }
    },
    [isHighlightedRouteId]
  );

  const handleCloseRouteCallout = useCallback(() => {
    setSelectedRouteData(null);
  }, []);

  const handleTrafficFeaturePress = useCallback(
    (e) => {
      if (layersVisibility.traffic && e.features && e.features.length > 0) {
        const tappedFeature = e.features[0];
        const coordinates = tappedFeature.geometry.coordinates;
        const midPoint =
          coordinates[Math.floor(coordinates.length / 2)] || coordinates[0];
        setSelectedTrafficData({
          ...tappedFeature.properties,
          coordinates: midPoint,
        });
        setSelectedAqiData(null);
        setSelectedRouteData(null);
      }
    },
    [layersVisibility.traffic]
  );

  const handleCloseTrafficCallout = useCallback(() => {
    setSelectedTrafficData(null);
  }, []);

  const handleTrafficSimulation = useCallback((routeId) => {
    console.log(`Configuring simulation for route ID: ${routeId}`);
    setTrafficPanelVisible(true);
  }, []);

  const handleAqisSimulation = useCallback((routeId) => {
    console.log(`Configuring simulation for route ID: ${routeId}`);
    setAqiPanelVisible(true);
  }, []);

  const handleMapLoaded = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const handleMapPress = useCallback(() => {
    if (selectedAqiData) {
      setSelectedAqiData(null);
    }
    if (selectedRouteData) {
      setSelectedRouteData(null);
    }
    if (selectedTrafficData) {
      setSelectedTrafficData(null);
    }
  }, [selectedAqiData, selectedRouteData, selectedTrafficData]);

  const getAuthHeaders = () => {
    if (!authToken) {
      throw new Error("No token found");
    }
    return {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
  };

  const handleApplyAqiSimulation = useCallback(
    async ({
      lon,
      lat,
      aqi,
      pm25,
      pm10,
      co,
      no2,
      so2,
      o3,
      radiusKm,
      simulationName,
    }) => {
      console.log(
        `Applying AQI simulation at [${lon}, ${lat}] with PM2.5: ${pm25}, Radius: ${radiusKm}km, Name: ${simulationName}`
      );
      const payload = {
        lon,
        lat,
        aqi,
        pm25,
        pm10,
        co,
        no2,
        so2,
        o3,
        radiusKm,
        simulationName,
      };
      try {
        await axios.post(`${BACKEND_API_BASE_URL}/simulate/aqis`, payload, {
          headers: getAuthHeaders(),
        });
        Alert.alert(
          "Thành công",
          "Mô phỏng chất lượng không khí đã được thêm."
        );
        fetchGraphData();
      } catch (apiError) {
        console.error("Error calling air quality simulation API:", apiError);
        Alert.alert(
          "Lỗi",
          "Đã xảy ra lỗi khi kết nối đến máy chủ mô phỏng chất lượng không khí."
        );
      }
      setAqiPanelVisible(false);
    },
    [fetchGraphData]
  );

  const handleApplyTrafficSimulation = useCallback(
    async ({ routeId, fromnode, tonode, VC, incident, simulationName }) => {
      console.log(
        `Applying traffic simulation for segment ID: ${routeId} with VC: ${VC}, Incident: ${incident}, Name: ${simulationName}`
      );
      const payload = {
        segmentId: routeId,
        fromnode,
        tonode,
        VC,
        incident,
        simulationName,
      };
      try {
        await axios.post(`${BACKEND_API_BASE_URL}/simulate/traffic`, payload, {
          headers: getAuthHeaders(),
        });
        Alert.alert("Thành công", "Mô phỏng giao thông đã được thêm.");
        fetchGraphData();
      } catch (apiError) {
        console.error("Error calling traffic simulation API:", apiError);
        Alert.alert(
          "Lỗi",
          "Đã xảy ra lỗi khi kết nối đến máy chủ mô phỏng giao thông."
        );
      }
      setTrafficPanelVisible(false);
    },
    [fetchGraphData]
  );

  const handleSimulationApplied = useCallback(() => {
    console.log("Simulation applied, refreshing map data...");
    fetchGraphData();
  }, [fetchGraphData]);

  const toggleLayer = useCallback(
    (layerName) => {
      setLayersVisibility((prev) => ({
        ...prev,
        [layerName]: !prev[layerName],
      }));
      if (layerName === "airQuality" && layersVisibility.airQuality) {
        setSelectedAqiData(null);
      }
      if (layerName === "traffic" && layersVisibility.traffic) {
        setSelectedTrafficData(null);
      }
    },
    [layersVisibility]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.mapContainer}>
          <MapWrapper
            mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
            ref={mapRef}
            startCoords={routeStartCoords}
            endCoords={endCoords}
            initialCenter={[105.818, 21.0545]}
            initialZoom={12}
            styleURL={MapboxGL.StyleURL.Street}
            onMapLoaded={handleMapLoaded}
            layersVisibility={layersVisibility}
            onPress={handleMapPress}
          >
            {mapLoaded && (
              <>
                {layersVisibility.traffic &&
                  trafficData.features.length > 0 && (
                    <MapboxGL.ShapeSource
                      id="trafficSource"
                      shape={trafficData}
                      onPress={handleTrafficFeaturePress}
                    >
                      <MapboxGL.LineLayer
                        id="trafficLayer"
                        style={styles.trafficLayer}
                        belowLayer={topLayerId}
                      />
                    </MapboxGL.ShapeSource>
                  )}
                {layersVisibility.airQuality &&
                  airQualityData.features.length > 0 && (
                    <MapboxGL.ShapeSource
                      id="airQualitySource"
                      shape={airQualityData}
                    >
                      <MapboxGL.CircleLayer
                        id="airQualityLayer"
                        style={styles.airQualityLayer}
                        belowLayer={topLayerId}
                      />
                    </MapboxGL.ShapeSource>
                  )}
                {layersVisibility.airQuality &&
                  airQualityData.features.map((feature) => (
                    <MapboxGL.MarkerView
                      key={`aqi-${feature.properties.stationUid}`}
                      coordinate={feature.geometry.coordinates}
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                      <TouchableOpacity
                        onPress={() => handleAirQualityFeaturePress(feature)}
                        style={styles.aqiMarkerContainer}
                      >
                        <AirQualityMarker stationData={feature.properties} />
                      </TouchableOpacity>
                    </MapboxGL.MarkerView>
                  ))}
                {selectedAqiData && (
                  <MapboxGL.MarkerView
                    coordinate={selectedAqiData.coordinates}
                    anchor={{ x: 0.5, y: 1 }}
                  >
                    <AirQualityCallout
                      data={selectedAqiData}
                      onClose={handleCloseAqiPanel}
                      onConfigureAqiSimulation={handleAqisSimulation}
                    />
                  </MapboxGL.MarkerView>
                )}
                {selectedRouteData && (
                  <MapboxGL.MarkerView
                    coordinate={selectedRouteData.coordinates}
                    anchor={{ x: 0.5, y: 0 }}
                  >
                    <RouteCallout
                      data={selectedRouteData}
                      onClose={handleCloseRouteCallout}
                    />
                  </MapboxGL.MarkerView>
                )}
                {selectedTrafficData && (
                  <MapboxGL.MarkerView
                    coordinate={selectedTrafficData.coordinates}
                    anchor={{ x: 0.5, y: 0 }}
                  >
                    <SimulationTrafficCallout
                      data={selectedTrafficData}
                      onClose={handleCloseTrafficCallout}
                      onConfigureSimulation={handleTrafficSimulation}
                    />
                  </MapboxGL.MarkerView>
                )}
                {routeFeatures.map((featureCollection, index) => (
                  <MapboxGL.ShapeSource
                    key={`route-source-${index}`}
                    id={`route-source-${index}`}
                    shape={featureCollection}
                    onPress={handleRouteFeaturePress}
                  >
                    <MapboxGL.LineLayer
                      id={`route-layer-${index}-default`}
                      filter={[
                        "all",
                        ["!=", ["get", "routeId"], isHighlightedRouteId],
                      ]}
                      style={{
                        lineColor: [
                          "interpolate",
                          ["linear"],
                          ["get", "healthScore"],
                          -1,
                          "gray",
                          0,
                          "red",
                          50,
                          "orange",
                          100,
                          "green",
                        ],
                        lineWidth: 3,
                        lineOpacity: 0.7,
                      }}
                      belowLayer={topLayerId}
                    />
                    <MapboxGL.LineLayer
                      id={`highlighted-route-layer-${index}`}
                      filter={[
                        "all",
                        ["==", ["get", "routeId"], isHighlightedRouteId],
                      ]}
                      style={{
                        lineColor: [
                          "interpolate",
                          ["linear"],
                          ["get", "healthScore"],
                          -1,
                          "blue",
                          0,
                          "#FF0000",
                          50,
                          "#FFA500",
                          100,
                          "#00FF00",
                        ],
                        lineWidth: 6,
                        lineOpacity: 1,
                      }}
                      aboveLayer={topLayerId}
                    />
                    <MapboxGL.LineLayer
                      id={`route-overlay-layer-${index}`}
                      filter={[
                        "all",
                        ["==", ["get", "routeId"], isHighlightedRouteId],
                      ]}
                      style={{
                        lineColor: [
                          "interpolate",
                          ["linear"],
                          ["get", "healthScore"],
                          0,
                          "rgba(255, 0, 0, 0.3)",
                          50,
                          "rgba(255, 165, 0, 0.3)",
                          100,
                          "rgba(0, 255, 0, 0.3)",
                        ],
                        lineWidth: 8,
                        lineOpacity: 0.3,
                      }}
                      aboveLayer={topLayerId}
                    />
                    {routeStartCoords && (
                      <MapboxGL.MarkerView
                        coordinate={routeStartCoords}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <View style={[styles.markerCircle, styles.startMarker]}>
                          <Text style={styles.markerText}>S</Text>
                        </View>
                      </MapboxGL.MarkerView>
                    )}
                    {endCoords && (
                      <MapboxGL.MarkerView
                        coordinate={endCoords}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <View style={[styles.markerCircle, styles.endMarker]}>
                          <Text style={styles.markerText}>E</Text>
                        </View>
                      </MapboxGL.MarkerView>
                    )}
                  </MapboxGL.ShapeSource>
                ))}
                {routeLabelData.features.length > 0 && (
                  <MapboxGL.ShapeSource
                    id="routeLabelSource"
                    shape={routeLabelData}
                  >
                    <MapboxGL.SymbolLayer
                      id="routeLabelLayer"
                      filter={["==", ["get", "isHighlighted"], true]}
                      style={styles.routeLabelLayer}
                      aboveLayer={topLayerId}
                    />
                  </MapboxGL.ShapeSource>
                )}
              </>
            )}
          </MapWrapper>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={styles.loadingText}>
                {isError
                  ? errorMessage ||
                    "Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối và máy chủ backend."
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
        <RouteFindingPanel
          onRouteSelected={handleRouteSelected}
          onClearRoute={handleClearRoute}
          allCoordinates={allCoordinates}
          disabled={!initialDataLoaded || loading || isError}
          mapLoaded={mapLoaded && mapRefInitialized}
          onSimulationApplied={handleSimulationApplied}
          style={styles.routePanel}
        />
        <Modal
          animationType="slide"
          transparent={true}
          visible={isTrafficPanelVisible}
          onRequestClose={() => setTrafficPanelVisible(false)}
        >
          <View style={styles.modalOverlay}>
            {selectedTrafficData && (
              <SimulationTrafficPanel
                data={selectedTrafficData}
                onClose={() => setTrafficPanelVisible(false)}
                onApplySimulation={handleApplyTrafficSimulation}
              />
            )}
          </View>
        </Modal>
        <Modal
          animationType="slide"
          transparent={true}
          visible={isAqiPanelVisible}
          onRequestClose={() => setAqiPanelVisible(false)}
        >
          <View style={styles.modalOverlay}>
            {selectedAqiData && (
              <SimulationAqiPanel
                data={selectedAqiData}
                onClose={() => setAqiPanelVisible(false)}
                onApplyAqiSimulation={handleApplyAqiSimulation}
              />
            )}
          </View>
        </Modal>
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
                    {key === "traffic" ? "Giao thông" : "Không khí"}
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
  safeArea: { flex: 1, backgroundColor: "#ecf0f1" },
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
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
  retryButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  trafficLayer: {
    lineColor: [
      "match",
      ["get", "status"],
      "congested",
      "#e13c00",
      "moderate",
      "#e1c600",
      "smooth",
      "green",
      "tai nạn",
      "#ff0000",
      "đóng đường",
      "black",
      "gray",
    ],
    lineWidth: ["match", ["get", "status"], "tai nạn", 7, "đóng đường", 8, 5],
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
      "very_unhealthy",
      "#7e0023",
      "hazardous",
      "#8b008b",
      "unhealthy",
      "#e74c3c",
      "unhealthy_sensitive",
      "#f39c12",
      "moderate",
      "#f1c40f",
      "good",
      "#2ecc71",
      "#3498db",
    ],
    circleStrokeWidth: 1.5,
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
  layerButtonText: { color: "black", fontWeight: "600", fontSize: 13 },
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
  markerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  startMarker: {
    backgroundColor: "#4CAF50",
    borderColor: "#388E3C",
  },
  endMarker: {
    backgroundColor: "#F44336",
    borderColor: "#D32F2F",
  },
  markerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  routeLabelLayer: {
    textField: ["get", "labelText"],
    textSize: 14,
    textColor: "#2c3e50",
    textHaloColor: "white",
    textHaloWidth: 1.5,
    textAnchor: "top",
    textJustify: "center",
    textAllowOverlap: true,
    textIgnorePlacement: true,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default SimulationMapScreen;
