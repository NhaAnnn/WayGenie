import React, { useRef, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native"; // Đã thêm Text vào import
import MapboxGL from "@rnmapbox/maps";

const MapWrapper = ({
  mapboxAccessToken,
  startCoords,
  endCoords,
  routeGeoJSONs,
  initialCenter,
  initialZoom,
  styleURL,
  onMapLoadedCallback,
  children,
}) => {
  const cameraRef = useRef(null);
  const mapRef = useRef(null); // Ref for MapboxGL.MapView itself

  // Define a set of vibrant colors for multiple routes
  const routeColors = [
    "#007BFF", // Blue (Main route)
    "#28a745", // Green
    "#fd7e14", // Orange
    "#6f42c1", // Purple
    "#dc3545", // Red
    "#17a2b8", // Cyan
    "#e83e8c", // Pink
  ];

  useEffect(() => {
    // Set Mapbox access token
    MapboxGL.setAccessToken(mapboxAccessToken);
  }, [mapboxAccessToken]);

  useEffect(() => {
    // Adjust camera when start/end/routeGeoJSONs change
    if (
      mapRef.current &&
      (startCoords || endCoords || (routeGeoJSONs && routeGeoJSONs.length > 0))
    ) {
      fitCameraToRoute();
    }
  }, [startCoords, endCoords, routeGeoJSONs, initialCenter, initialZoom]); // Dependency array bao gồm routeGeoJSONs và các props liên quan camera

  const onMapReady = () => {
    if (onMapLoadedCallback) {
      onMapLoadedCallback();
    }
    // Set initial camera position after map is loaded if no route or points are set yet
    // This is handled by fitCameraToRoute, but a fallback here ensures initial view
    if (
      cameraRef.current &&
      initialCenter &&
      !startCoords &&
      !endCoords &&
      (!routeGeoJSONs || routeGeoJSONs.length === 0)
    ) {
      cameraRef.current.setCamera({
        centerCoordinate: initialCenter,
        zoomLevel: initialZoom,
        animationDuration: 0, // No animation on initial load
      });
    }
  };

  const fitCameraToRoute = async () => {
    if (!cameraRef.current || !mapRef.current) return;

    let allCoords = [];
    // MapboxGL.PointAnnotation expects [longitude, latitude]
    // The `coords` in RouteFindingPanel were [lat, lon] then converted to [lon, lat] in onRouteSelected.
    // Ensure allCoords contains [lon, lat]
    if (startCoords) allCoords.push(startCoords); // startCoords from CurrentStatusMapScreen is already [lon, lat]
    if (endCoords) allCoords.push(endCoords); // endCoords from CurrentStatusMapScreen is already [lon, lat]

    // Collect all coordinates from all route GeoJSONs
    if (routeGeoJSONs && routeGeoJSONs.length > 0) {
      routeGeoJSONs.forEach((geoJSON) => {
        if (geoJSON && geoJSON.coordinates && geoJSON.coordinates.length > 0) {
          // GeoJSON coordinates are already [longitude, latitude]
          allCoords = allCoords.concat(geoJSON.coordinates);
        }
      });
    }

    if (allCoords.length > 0) {
      // Calculate bounding box for all coordinates (lon, lat)
      const minLon = Math.min(...allCoords.map((c) => c[0]));
      const maxLon = Math.max(...allCoords.map((c) => c[0]));
      const minLat = Math.min(...allCoords.map((c) => c[1]));
      const maxLat = Math.max(...allCoords.map((c) => c[1]));

      const bounds = {
        ne: [maxLon, maxLat], // Northeast corner [longitude, latitude]
        sw: [minLon, minLat], // Southwest corner [longitude, latitude]
      };

      try {
        await cameraRef.current.fitBounds(
          bounds.ne,
          bounds.sw,
          [50, 50, 50, 50], // padding: [top, right, bottom, left] để bản đồ không quá sát đường
          1000 // animationDuration in milliseconds
        );
      } catch (error) {
        console.error("Lỗi khi điều chỉnh camera theo lộ trình:", error);
      }
    } else if (initialCenter) {
      // Fallback to initial center if no route or points
      cameraRef.current.setCamera({
        centerCoordinate: initialCenter,
        zoomLevel: initialZoom,
        animationDuration: 1000,
      });
    }
  };

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
          animationDuration={0} // Initial animation duration should be 0 for quick setup
        />

        {/* Start Point Annotation */}
        {startCoords && (
          <MapboxGL.PointAnnotation
            id="startPoint"
            coordinate={startCoords} // [longitude, latitude]
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerText}>📍</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* End Point Annotation */}
        {endCoords && (
          <MapboxGL.PointAnnotation
            id="endPoint"
            coordinate={endCoords} // [longitude, latitude]
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerText}>🏁</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Render ALL Route Polylines */}
        {/* Lặp qua mảng routeGeoJSONs để vẽ từng tuyến đường */}
        {routeGeoJSONs &&
          routeGeoJSONs.length > 0 &&
          routeGeoJSONs.map((geoJSON, index) => {
            // Determine color based on index, cycling through routeColors array
            // Xác định màu sắc và độ dày dựa trên việc đây là tuyến đường chính (đầu tiên) hay các tuyến đường thay thế
            const lineColor = routeColors[index % routeColors.length];
            const lineWidth = index === 0 ? 6 : 3; // Độ dày lớn hơn cho tuyến chính

            return (
              <MapboxGL.ShapeSource
                key={`route-${index}`}
                id={`routeSource-${index}`}
                shape={geoJSON}
              >
                <MapboxGL.LineLayer
                  id={`routeLine-${index}`}
                  style={{
                    lineColor: lineColor,
                    lineWidth: lineWidth,
                    lineOpacity: 0.8,
                    lineJoin: "round",
                    lineCap: "round",
                  }}
                />
              </MapboxGL.ShapeSource>
            );
          })}

        {/* Children passed from parent (e.g., traffic, air quality layers) */}
        {children}
      </MapboxGL.MapView>
    </View>
  );
};

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
