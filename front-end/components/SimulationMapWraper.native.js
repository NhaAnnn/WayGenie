import React, {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import MapboxGL from "@rnmapbox/maps";
import { View, StyleSheet, Text } from "react-native";

/**
 * Calculates the bounding box for an array of GeoJSON Features.
 * It iterates through all coordinates within Point and LineString geometries
 * to find the min/max longitude and latitude.
 *
 * @param {Array<Object>} features An array of GeoJSON Feature objects.
 * @returns {Array<Array<number>>|null} A bounding box as [[minLon, minLat], [maxLon, maxLat]] or null if no valid coordinates found.
 */

const calculateBoundingBox = (features) => {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  if (!Array.isArray(features) || features.length === 0) {
    console.warn(
      "calculateBoundingBox: No GeoJSON features provided. Returning null."
    );
    return null;
  }

  features.forEach((feature) => {
    // Skip if feature or its geometry/coordinates are invalid
    if (!feature || !feature.geometry || !feature.geometry.coordinates) {
      console.warn(
        "calculateBoundingBox: Skipping invalid feature or geometry:",
        feature
      );
      return;
    }

    const coords = feature.geometry.coordinates;
    const type = feature.geometry.type;

    if (type === "Point") {
      // For Point, coords is [lon, lat]
      if (
        Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === "number" &&
        typeof coords[1] === "number" &&
        !isNaN(coords[0]) &&
        !isNaN(coords[1])
      ) {
        minLon = Math.min(minLon, coords[0]);
        minLat = Math.min(minLat, coords[1]);
        maxLon = Math.max(maxLon, coords[0]);
        maxLat = Math.max(maxLat, coords[1]);
      } else {
        console.warn(
          "calculateBoundingBox: Invalid Point coordinates found:",
          coords
        );
      }
    } else if (type === "LineString") {
      // For LineString, coords is an array of [lon, lat] arrays
      if (Array.isArray(coords)) {
        coords.forEach((coord) => {
          if (
            Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === "number" &&
            typeof coord[1] === "number" &&
            !isNaN(coord[0]) &&
            !isNaN(coord[1])
          ) {
            minLon = Math.min(minLon, coord[0]);
            minLat = Math.min(minLat, coord[1]);
            maxLon = Math.max(maxLon, coord[0]);
            maxLat = Math.max(maxLat, coord[1]);
          } else {
            console.warn(
              "calculateBoundingBox: Invalid LineString segment coordinate found:",
              coord
            );
          }
        });
      } else {
        console.warn(
          "calculateBoundingBox: LineString coordinates are not an array:",
          coords
        );
      }
    }
    // Add logic for other geometry types (e.g., Polygon, MultiPoint, etc.) if needed
  });

  if (minLon === Infinity) {
    console.warn(
      "calculateBoundingBox: No valid numeric coordinates found in any feature. Returning null."
    );
    return null; // No valid coordinates were processed
  }

  return [
    [minLon, minLat], // SW corner [lon, lat]
    [maxLon, maxLat], // NE corner [lon, lat]
  ];
};

const MapWrapper = forwardRef(
  (
    {
      mapboxAccessToken,
      startCoords,
      endCoords,
      initialCenter,
      initialZoom,
      styleURL = MapboxGL.StyleURL.Street,
      onMapLoaded,
      children,
      layersVisibility = {}, // This prop is not directly used in MapWrapper but passed down
    },
    ref
  ) => {
    const mapViewRef = useRef(null);
    const cameraRef = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);

    useImperativeHandle(ref, () => ({
      /**
       * Fits the map camera to a given bounding box.
       * @param {Array<number>} ne Northeast coordinate [lon, lat].
       * @param {Array<number>} sw Southwest coordinate [lon, lat].
       * @param {Array<number>} padding Padding for the bounds [top, right, bottom, left].
       * @param {number} duration Animation duration in milliseconds.
       */
      fitBounds: (ne, sw, padding, duration) => {
        if (!cameraRef.current) {
          console.error(
            "MapWrapper: cameraRef.current is undefined, cannot set bounds."
          );
          return;
        }

        // Validate NE and SW coordinates
        const isValidCoord = (coord) =>
          Array.isArray(coord) &&
          coord.length === 2 &&
          typeof coord[0] === "number" &&
          typeof coord[1] === "number" &&
          !isNaN(coord[0]) &&
          !isNaN(coord[1]);

        if (!isValidCoord(ne)) {
          console.error(
            "MapWrapper: Invalid NE coordinates provided to fitBounds:",
            ne
          );
          return;
        }
        if (!isValidCoord(sw)) {
          console.error(
            "MapWrapper: Invalid SW coordinates provided to fitBounds:",
            sw
          );
          return;
        }

        console.log("MapWrapper: Calling setCamera with bounds:", {
          ne,
          sw,
          padding,
          duration,
        });

        try {
          cameraRef.current.setCamera({
            bounds: { ne, sw },
            padding: {
              paddingTop: padding[0],
              paddingRight: padding[1],
              paddingBottom: padding[2],
              paddingLeft: padding[3],
            },
            animationDuration: duration,
          });
        } catch (error) {
          console.error("MapWrapper: Error in setCamera:", error);
        }
      },
      getMapRef: () => mapViewRef.current,
      calculateBoundingBox, // Expose the improved calculateBoundingBox
      /**
       * Sets the map camera with a custom configuration.
       * @param {Object} config Camera configuration object.
       */
      setCamera: (config) => {
        if (cameraRef.current) {
          console.log("MapWrapper: Calling setCamera with config:", config);
          cameraRef.current.setCamera(config);
        } else {
          console.warn(
            "MapWrapper: cameraRef.current is not available for setCamera call."
          );
        }
      },
    }));

    useEffect(() => {
      if (mapboxAccessToken) {
        MapboxGL.setAccessToken(mapboxAccessToken);
      } else {
        console.error("Mapbox Access Token is not provided to MapWrapper.");
      }
    }, [mapboxAccessToken]);

    const handleMapReady = useCallback(() => {
      console.log("MapWrapper: Map is ready and style loaded.");
      setIsMapReady(true);
      onMapLoaded?.();
    }, [onMapLoaded]);

    useEffect(() => {
      console.log("MapWrapper: Props updated:", { startCoords, endCoords });
    }, [startCoords, endCoords]);

    return (
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapViewRef}
          style={styles.map}
          styleURL={styleURL}
          onDidFinishLoadingMap={handleMapReady}
        >
          {/* <MapboxGL.Images
            images={{
              "pin-start": require("../assets/images/marker-start.png"), // Đường dẫn đến ảnh marker
              "pin-end": require("../assets/images/marker-end.png"), // Đường dẫn đến ảnh marker
            }}
          /> */}
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={initialCenter}
            zoomLevel={initialZoom}
          />
          {children}
        </MapboxGL.MapView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: { alignItems: "center", justifyContent: "center" },
  markerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  startMarker: { backgroundColor: "#28a745" }, // Green
  endMarker: { backgroundColor: "#dc3545" }, // Red
  markerText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});

export default MapWrapper;
