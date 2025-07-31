import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
  SafeAreaView,
} from "react-native";
import axios from "axios";
import * as Location from "expo-location";
import RouteFindingPanel from "../../components/RouteFindMapBox";
import MapWrapper from "../../components/MapWrapper";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../../secrets.js";

export default function CurrentStatusMapScreen({ navigation }) {
  // State for coordinates
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  // State for routes and selection
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // Backend data state
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(false);
  const [isError, setIsError] = useState(false);

  // Handle screen resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", () => {
      // Handle resize if needed
    });
    return () => {
      subscription?.remove();
    };
  }, []);

  // Route selection callbacks
  const handleRouteSelected = useCallback(
    (startCoords, endCoords, routesGeoJSON, selectedRouteId) => {
      setStartCoords(startCoords);
      setEndCoords(endCoords);
      setRoutes(routesGeoJSON);
      setSelectedRouteIndex(
        routesGeoJSON.findIndex(
          (route) => route.features[0].properties.routeId === selectedRouteId
        )
      );
    },
    []
  );

  const handleClearRoute = useCallback(() => {
    setRoutes([]);
    setSelectedRouteIndex(0);
  }, []);

  // Combined loading state
  const isLoading = isBackendGraphDataLoading;

  return (
    <SafeAreaView style={styles.container}>
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
          layersVisibility={{
            traffic: false,
            airQuality: false,
            coordinates: false,
          }}
          trafficData={{ type: "FeatureCollection", features: [] }}
          coordinatesData={{ type: "FeatureCollection", features: [] }}
          airQualityData={{ type: "FeatureCollection", features: [] }}
        />
      </View>

      {/* Route finding panel */}
      <RouteFindingPanel
        onRouteSelected={handleRouteSelected}
        onClearRoute={handleClearRoute}
        disabled={isLoading}
        supportedCriteria={[
          "fastest",
          "shortest",
          "emission",
          "least_pollution",
        ]}
      />
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
    textAlign: "center",
    marginHorizontal: 20,
  },
});
