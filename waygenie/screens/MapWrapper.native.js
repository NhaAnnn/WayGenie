import React, { useRef, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import MapboxGL from "@rnmapbox/maps";

const DEFAULT_POSITION = [10.762622, 106.660172]; // [Lat, Long] - TP.HCM

const MapWrapper = ({
  startCoords,
  endCoords,
  routeGeoJSON,
  mapboxAccessToken,
}) => {
  const cameraRef = useRef(null);

  useEffect(() => {
    if (mapboxAccessToken) {
      MapboxGL.setAccessToken(mapboxAccessToken);
    }
  }, [mapboxAccessToken]);

  useEffect(() => {
    if (cameraRef.current) {
      const allCoords = [];
      if (startCoords) allCoords.push(startCoords);
      if (endCoords) allCoords.push(endCoords);

      if (routeGeoJSON && routeGeoJSON.coordinates) {
        routeGeoJSON.coordinates.forEach(([lng, lat]) =>
          allCoords.push([lat, lng])
        );
      }

      if (allCoords.length > 0) {
        let minLon = Infinity,
          maxLon = -Infinity;
        let minLat = Infinity,
          maxLat = -Infinity;

        allCoords.forEach(([lat, lon]) => {
          minLon = Math.min(minLon, lon);
          maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });

        const padding = 0.01;
        cameraRef.current.fitBounds(
          [maxLat + padding, maxLon + padding],
          [minLat - padding, minLon - padding],
          0,
          1000
        );
      } else if (startCoords) {
        cameraRef.current.setCamera({
          centerCoordinate: [startCoords[1], startCoords[0]],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }
    }
  }, [startCoords, endCoords, routeGeoJSON]);

  return (
    <MapboxGL.MapView style={styles.map}>
      <MapboxGL.Camera
        ref={cameraRef}
        zoomLevel={10}
        centerCoordinate={DEFAULT_POSITION.reverse()}
        animationMode={"flyTo"}
        animationDuration={0}
      />

      {startCoords && (
        <MapboxGL.PointAnnotation
          id="startPoint"
          coordinate={[startCoords[1], startCoords[0]]}
        >
          <View style={styles.markerContainer}>
            <Text style={styles.markerText}>📍</Text>
          </View>
        </MapboxGL.PointAnnotation>
      )}

      {endCoords && (
        <MapboxGL.PointAnnotation
          id="endPoint"
          coordinate={[endCoords[1], endCoords[0]]}
        >
          <View style={styles.markerContainer}>
            <Text style={styles.markerText}>🏁</Text>
          </View>
        </MapboxGL.PointAnnotation>
      )}

      {routeGeoJSON && (
        <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
          <MapboxGL.LineLayer
            id="routeLine"
            style={{
              lineWidth: 5,
              lineColor: "#007AFF",
              lineOpacity: 0.8,
              lineJoin: "round",
              lineCap: "round",
            }}
          />
        </MapboxGL.ShapeSource>
      )}
    </MapboxGL.MapView>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 30,
  },
});

export default MapWrapper;
