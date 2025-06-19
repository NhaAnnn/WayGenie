import React, { useRef, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import MapboxGL from "@rnmapbox/maps";

const MapWrapper = ({
  mapboxAccessToken,
  startCoords,
  endCoords,
  routeGeoJSONs,
  initialCenter,
  initialZoom,
  styleURL,
  onMapLoaded, // CHANGED: Renamed from onMapLoadedCallback to onMapLoaded
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
    // This effect should run after onMapReady has fired at least once
    if (
      mapRef.current &&
      (startCoords || endCoords || (routeGeoJSONs && routeGeoJSONs.length > 0))
    ) {
      fitCameraToRoute();
    }
  }, [startCoords, endCoords, routeGeoJSONs, initialCenter, initialZoom]); // Dependency array includes routeGeoJSONs and camera-related props

  // This function is called when MapboxGL.MapView has finished loading its initial style and tiles.
  const onMapReady = () => {
    console.log("MapWrapper: MapboxGL.MapView finished loading!");
    if (onMapLoaded) {
      // Now onMapLoaded will correctly reference handleMapWrapperLoaded
      onMapLoaded(); // Call the callback passed from CurrentStatusMapScreen
    }
    // Set initial camera position after map is loaded if no route or points are set yet
    // This ensures the map is centered even if no route is selected initially.
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
        animationDuration: 0, // No animation on initial load to quickly show the map
      });
    }
  };

  const fitCameraToRoute = async () => {
    if (!cameraRef.current || !mapRef.current) {
      console.warn("fitCameraToRoute: cameraRef or mapRef not available.");
      return;
    }

    let allCoords = [];
    // Ensure allCoords contains [longitude, latitude] pairs
    if (startCoords) allCoords.push(startCoords);
    if (endCoords) allCoords.push(endCoords);

    // Collect all coordinates from all route GeoJSONs
    if (routeGeoJSONs && routeGeoJSONs.length > 0) {
      routeGeoJSONs.forEach((geoJSON) => {
        // Check if geoJSON is valid and has coordinates, assuming LineString type
        if (
          geoJSON &&
          geoJSON.type === "LineString" &&
          geoJSON.coordinates &&
          geoJSON.coordinates.length > 0
        ) {
          allCoords = allCoords.concat(geoJSON.coordinates);
        } else if (
          geoJSON &&
          geoJSON.type === "Feature" &&
          geoJSON.geometry &&
          geoJSON.geometry.type === "LineString" &&
          geoJSON.geometry.coordinates
        ) {
          allCoords = allCoords.concat(geoJSON.geometry.coordinates);
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
          [50, 50, 50, 50], // padding: [top, right, bottom, left] to avoid cutting off markers/lines
          1000 // animationDuration in milliseconds
        );
        console.log("MapWrapper: Camera fitted to bounds.");
      } catch (error) {
        console.error("MapWrapper: Error adjusting camera to route:", error);
      }
    } else if (initialCenter) {
      // Fallback to initial center if no route or points are set
      console.log("MapWrapper: Falling back to initial center.");
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
        onDidFinishLoadingMap={onMapReady} // This correctly triggers onMapReady
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={initialZoom}
          centerCoordinate={initialCenter}
          animationMode={"flyTo"}
          animationDuration={0} // Initial animation duration set to 0 for quicker display
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
        {/* Iterate through routeGeoJSONs to draw each route */}
        {routeGeoJSONs &&
          routeGeoJSONs.length > 0 &&
          routeGeoJSONs.map((geoJSON, index) => {
            // Determine color and line width based on if it's the primary (first) route or alternative routes
            const lineColor = routeColors[index % routeColors.length];
            const lineWidth = index === 0 ? 6 : 3; // Thicker line for the primary route

            // Ensure the GeoJSON structure is correct for ShapeSource
            // It should be a FeatureCollection or a single Feature with LineString geometry
            const shapeToRender =
              geoJSON.type === "Feature"
                ? geoJSON
                : { type: "Feature", geometry: geoJSON };

            return (
              <MapboxGL.ShapeSource
                key={`route-${index}`}
                id={`routeSource-${index}`}
                shape={shapeToRender} // Use the potentially wrapped GeoJSON
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
