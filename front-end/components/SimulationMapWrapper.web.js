import React, {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import { View, StyleSheet } from "react-native";
import Map, { useMap, MapRef } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const calculateBoundingBox = (features) => {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  if (!Array.isArray(features) || features.length === 0) {
    console.warn(
      "calculateBoundingBox: No GeoJSON features provided or array is empty.",
      features
    );
    return null;
  }

  let validCoordsFound = false;

  features.forEach((feature, index) => {
    if (!feature || !feature.geometry || !feature.geometry.coordinates) {
      console.warn(
        `calculateBoundingBox: Invalid feature at index ${index}:`,
        feature
      );
      return;
    }
    const coords = feature.geometry.coordinates;
    const type = feature.geometry.type;

    const processCoordinate = (lon, lat) => {
      if (
        typeof lon === "number" &&
        typeof lat === "number" &&
        !isNaN(lon) &&
        !isNaN(lat)
      ) {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
        validCoordsFound = true;
      } else {
        console.warn(
          `calculateBoundingBox: Invalid coordinate at index ${index}:`,
          [lon, lat]
        );
      }
    };

    if (type === "Point") {
      processCoordinate(coords[0], coords[1]);
    } else if (type === "LineString" && Array.isArray(coords)) {
      coords.forEach((coord) => processCoordinate(coord[0], coord[1]));
    } else if (type === "Polygon" && Array.isArray(coords)) {
      coords.forEach((ring) => {
        if (Array.isArray(ring)) {
          ring.forEach((coord) => processCoordinate(coord[0], coord[1]));
        }
      });
    } else {
      console.warn(
        `calculateBoundingBox: Unsupported geometry type or invalid coordinates at index ${index}:`,
        { type, coords }
      );
    }
  });

  if (!validCoordsFound) {
    console.warn(
      "calculateBoundingBox: No valid numeric coordinates found in any feature."
    );
    return null;
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
};

const MapWrapper = forwardRef(
  (
    {
      mapboxAccessToken,
      startCoords,
      endCoords,
      initialCenter = [105.7874, 10.0305],
      initialZoom = 8,
      styleURL = "mapbox://styles/mapbox/streets-v12",
      onMapLoaded,
      children,
      onClick,
      onHover,
      interactiveLayerIds,
    },
    ref
  ) => {
    // Use useRef to get a direct reference to the Map component
    const mapRef = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [viewState, setViewState] = useState({
      longitude: initialCenter[0],
      latitude: initialCenter[1],
      zoom: initialZoom,
      pitch: 0,
      bearing: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    useEffect(() => {
      if (mapboxAccessToken) {
        mapboxgl.accessToken = mapboxAccessToken;
      } else {
        console.error("Mapbox Access Token is not provided to MapWrapper.");
      }
    }, [mapboxAccessToken]);

    useImperativeHandle(ref, () => ({
      fitBounds: (ne, sw, padding = [0, 0, 0, 0], duration = 1000) => {
        const map = mapRef.current?.getMap(); // Access the map instance
        if (!map) {
          console.error("MapWrapper: Map instance is not available.");
          return;
        }
        if (
          !Array.isArray(ne) ||
          !Array.isArray(sw) ||
          ne.length !== 2 ||
          sw.length !== 2
        ) {
          console.error("MapWrapper: Invalid bounds coordinates:", { ne, sw });
          return;
        }
        console.log("MapWrapper: Fitting bounds to:", {
          ne,
          sw,
          padding,
          duration,
        });
        map.fitBounds([sw, ne], {
          padding: {
            top: padding[0],
            right: padding[1],
            bottom: padding[2],
            left: padding[3],
          },
          duration,
          maxZoom: 10,
        });
      },
      calculateBoundingBox,
      setCamera: (config) => {
        const map = mapRef.current?.getMap(); // Access the map instance
        if (map) map.flyTo(config);
        else
          console.warn("MapWrapper: Map instance not available for setCamera.");
      },
      getMapRef: () => mapRef.current?.getMap(), // Return the actual map instance
    }));

    const handleMapLoaded = useCallback(() => {
      const map = mapRef.current?.getMap();
      console.log("MapWrapper: Map loaded. Instance:", map);
      setIsMapReady(true);
      onMapLoaded?.();
    }, [onMapLoaded]);

    useEffect(() => {
      const map = mapRef.current?.getMap(); // Get the map instance here
      if (
        isMapReady &&
        map &&
        startCoords &&
        endCoords &&
        window.shouldFitBounds
      ) {
        const isValidCoord = (coord) =>
          Array.isArray(coord) &&
          coord.length === 2 &&
          !isNaN(coord[0]) &&
          !isNaN(coord[1]);
        if (isValidCoord(startCoords) && isValidCoord(endCoords)) {
          const bbox = calculateBoundingBox([
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: startCoords },
            },
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: endCoords },
            },
          ]);
          console.log("Calculated bbox:", bbox);
          if (bbox) {
            // fitBounds expects [southwest, northeast]
            map.fitBounds(bbox, { padding: 50, duration: 1000, maxZoom: 18 });
            window.shouldFitBounds = false;
            console.log("MapWrapper: Zoomed to:", bbox);
          } else {
            console.error("MapWrapper: Invalid bbox calculated.");
          }
        } else {
          console.error("MapWrapper: Invalid startCoords or endCoords:", {
            startCoords,
            endCoords,
          });
        }
      } else if (isMapReady && map && !startCoords && !endCoords) {
        map.flyTo({ center: initialCenter, zoom: initialZoom, duration: 0 });
        console.log("MapWrapper: Set to initial center:", initialCenter);
      } else {
        console.log("MapWrapper: Waiting for map or coords:", {
          isMapReady,
          mapAvailable: !!map, // Check if map is available
          startCoords,
          endCoords,
        });
      }
    }, [isMapReady, startCoords, endCoords, initialCenter, initialZoom]); // Removed 'map' from dependency array to avoid re-runs when map changes due to internal state, rely on mapRef.current?.getMap()

    return (
      <View style={styles.container}>
        <Map
          ref={mapRef} // Attach the ref here
          initialViewState={viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapboxAccessToken={mapboxAccessToken}
          mapStyle={styleURL}
          onLoad={handleMapLoaded}
          onClick={onClick}
          onHover={onHover}
          interactive={true}
          interactiveLayerIds={interactiveLayerIds}
          style={{ width: "100%", height: "100%" }}
        >
          {children}
        </Map>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default MapWrapper;
