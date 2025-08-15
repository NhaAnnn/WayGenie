import React, {
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { StyleSheet, View, Text, LogBox } from "react-native";
import MapboxGL from "@rnmapbox/maps";

// Bỏ qua cảnh báo ViewTagResolver
LogBox.ignoreLogs(["ViewTagResolver"]);

const routeColors = [
  "#007BFF",
  "#28a745",
  "#fd7e14",
  "#6f42c1",
  "#dc3545",
  "#17a2b8",
  "#e83e8c",
];

const MapWrapper = forwardRef(
  (
    {
      initialCenter,
      initialZoom,
      styleURL,
      onMapLoaded,
      startCoords,
      endCoords,
      routeGeoJSONs,
      selectedRouteId,
      children,
    },
    ref
  ) => {
    const cameraRef = useRef(null);
    const mapRef = useRef(null);

    const debounce = (func, delay) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
      };
    };

    const fitCameraToRoute = debounce(async () => {
      if (!cameraRef.current || !mapRef.current) return;

      let allCoords = [];
      if (startCoords) allCoords.push(startCoords);
      if (endCoords) allCoords.push(endCoords);

      if (routeGeoJSONs) {
        const features =
          routeGeoJSONs.type === "FeatureCollection"
            ? routeGeoJSONs.features
            : Array.isArray(routeGeoJSONs)
            ? routeGeoJSONs.flatMap((g) => g.features || [])
            : [];
        features.forEach((feature) => {
          if (
            feature.geometry?.type === "LineString" &&
            feature.geometry.coordinates
          ) {
            allCoords = allCoords.concat(feature.geometry.coordinates);
          }
        });
      }

      if (allCoords.length > 0) {
        const lons = allCoords.map((c) => c[0]).filter((n) => !isNaN(n));
        const lats = allCoords.map((c) => c[1]).filter((n) => !isNaN(n));
        if (lons.length > 0 && lats.length > 0) {
          const ne = [Math.max(...lons), Math.max(...lats)];
          const sw = [Math.min(...lons), Math.min(...lats)];
          try {
            await cameraRef.current.fitBounds(ne, sw, [50, 50, 50, 50], 1000);
          } catch (error) {
            console.error("Camera fitBounds error:", error);
          }
        }
      } else if (initialCenter) {
        cameraRef.current.setCamera({
          centerCoordinate: initialCenter,
          zoomLevel: initialZoom,
          animationDuration: 0,
        });
      }
    }, 500);

    useEffect(() => {
      if (mapRef.current && (startCoords || endCoords || routeGeoJSONs)) {
        fitCameraToRoute();
      }
    }, [startCoords, endCoords, routeGeoJSONs]);

    const onMapReady = () => {
      if (onMapLoaded) onMapLoaded();
      if (cameraRef.current && initialCenter) {
        cameraRef.current.setCamera({
          centerCoordinate: initialCenter,
          zoomLevel: initialZoom,
          animationDuration: 0,
        });
      }
    };

    const renderRoutes = useMemo(() => {
      const features =
        routeGeoJSONs?.type === "FeatureCollection"
          ? routeGeoJSONs.features
          : Array.isArray(routeGeoJSONs)
          ? routeGeoJSONs.flatMap((g) => g.features || [])
          : [];

      return features.map((feature, index) => {
        if (
          !feature ||
          !feature.geometry ||
          feature.geometry.type !== "LineString" ||
          !feature.geometry.coordinates ||
          feature.geometry.coordinates.length < 2
        ) {
          console.warn("Invalid route feature skipped:", feature);
          return null;
        }
        const lineColor = routeColors[index % routeColors.length];
        const isSelected = feature.properties?.routeId === selectedRouteId;
        const lineWidth = isSelected ? 6 : 3;
        const lineOpacity = isSelected ? 0.8 : 0.5;

        return (
          <MapboxGL.ShapeSource
            key={`route-${feature.properties?.routeId || index}`}
            id={`routeSource-${feature.properties?.routeId || index}`}
            shape={feature}
          >
            <MapboxGL.LineLayer
              id={`routeLine-${feature.properties?.routeId || index}`}
              style={{
                lineColor,
                lineWidth,
                lineOpacity,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          </MapboxGL.ShapeSource>
        );
      });
    }, [routeGeoJSONs, selectedRouteId]);

    // Expose fitCameraToRoute cho component cha
    useImperativeHandle(ref, () => ({
      fitCameraToRoute,
    }));

    return (
      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={styleURL}
          onDidFinishLoadingMap={onMapReady}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={initialZoom}
            centerCoordinate={initialCenter}
            animationMode={"flyTo"}
            animationDuration={0}
          />
          {renderRoutes}
          {startCoords && !isNaN(startCoords[0]) && !isNaN(startCoords[1]) && (
            <MapboxGL.PointAnnotation
              id="startMarker"
              coordinate={startCoords}
              style={{ zIndex: 1000 }}
            >
              <View style={styles.markerContainer}>
                <Text style={styles.markerText}>📍</Text>
              </View>
            </MapboxGL.PointAnnotation>
          )}
          {endCoords && !isNaN(endCoords[0]) && !isNaN(endCoords[1]) && (
            <MapboxGL.PointAnnotation
              id="endMarker"
              coordinate={endCoords}
              style={{ zIndex: 1000 }}
            >
              <View style={styles.markerContainer}>
                <Text style={styles.markerText}>🏁</Text>
              </View>
            </MapboxGL.PointAnnotation>
          )}
          {children}
        </MapboxGL.MapView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  markerText: {
    fontSize: 24,
  },
});

export default MapWrapper;
