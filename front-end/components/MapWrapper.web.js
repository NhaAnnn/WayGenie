import React, { useRef, useEffect, useState, useCallback } from "react";
import { StyleSheet, View, Text } from "react-native";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import bbox from "@turf/bbox";

const DEFAULT_POSITION = [105.8342, 21.0278]; // [longitude, latitude]
const DEFAULT_ZOOM = 12;
const FLY_TO_DURATION = 1500;

const MapWrapper = ({
  startCoords,
  endCoords,
  routes = [],
  mapboxAccessToken,
  selectedRouteIndex = 0,
  initialCenter = DEFAULT_POSITION,
  initialZoom = DEFAULT_ZOOM,
  layersVisibility = {
    traffic: true,
    airQuality: false,
    incidents: true,
  },
  trafficData = null,
  airQualityData = null,
  incidentData = null,
  onMapLoaded,
}) => {
  const mapRef = useRef(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [viewport, setViewport] = useState({
    longitude: initialCenter[0],
    latitude: initialCenter[1],
    zoom: initialZoom,
    bearing: 0,
    pitch: 0,
  });

  const routeColors = [
    "#3F51B5", // Blue
    "#FF5722", // Orange
    "#4CAF50", // Green
    "#9C27B0", // Purple
    "#FFC107", // Yellow
  ];

  // Validate coordinate format and range
  const isValidCoordinate = useCallback((coord) => {
    if (!coord || !Array.isArray(coord) || coord.length < 2) return false;
    const [lng, lat] = coord;
    return (
      typeof lng === "number" &&
      typeof lat === "number" &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }, []);

  // Normalize coordinates to [lng, lat] format
  const normalizeCoords = useCallback(
    (coords) => {
      if (!coords) return null;

      // If the coordinate is already valid, return as-is
      if (isValidCoordinate(coords)) return coords;

      // Try to reverse if the values are swapped
      if (coords.length >= 2) {
        const reversed = [coords[1], coords[0]];
        if (isValidCoordinate(reversed)) return reversed;
      }

      return null;
    },
    [isValidCoordinate]
  );

  // Create GeoJSON feature collection from routes and markers
  const createFeatureCollection = useCallback(() => {
    const features = [];
    const normalizedStart = startCoords ? normalizeCoords(startCoords) : null;
    const normalizedEnd = endCoords ? normalizeCoords(endCoords) : null;

    // Add start marker if valid
    if (normalizedStart && isValidCoordinate(normalizedStart)) {
      features.push({
        type: "Feature",
        properties: { type: "start" },
        geometry: {
          type: "Point",
          coordinates: normalizedStart,
        },
      });
    }

    // Add end marker if valid
    if (normalizedEnd && isValidCoordinate(normalizedEnd)) {
      features.push({
        type: "Feature",
        properties: { type: "end" },
        geometry: {
          type: "Point",
          coordinates: normalizedEnd,
        },
      });
    }

    // Add routes with valid coordinates
    routes.forEach((route, index) => {
      if (route.geometry?.coordinates) {
        // Filter out invalid coordinates
        const validCoords = route.geometry.coordinates.filter((coord) =>
          isValidCoordinate(coord)
        );

        if (validCoords.length > 0) {
          features.push({
            type: "Feature",
            properties: {
              routeIndex: index,
              isSelected: index === selectedRouteIndex,
            },
            geometry: {
              ...route.geometry,
              coordinates: validCoords,
            },
          });
        }
      }
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [
    startCoords,
    endCoords,
    routes,
    selectedRouteIndex,
    isValidCoordinate,
    normalizeCoords,
  ]);

  // Calculate padding for fitBounds
  const calculatePadding = useCallback(() => {
    return {
      top: 150,
      bottom: 50,
      left: 50,
      right: 50,
    };
  }, []);

  // Fly to the area containing all features
  const flyToArea = useCallback(
    (options = {}) => {
      if (!mapRef.current || !isMapLoaded) return;

      const featureCollection = createFeatureCollection();

      // If no valid features, reset to initial view
      if (featureCollection.features.length === 0) {
        if (options.reset) {
          mapRef.current.flyTo({
            center: initialCenter,
            zoom: initialZoom,
            duration: FLY_TO_DURATION,
          });
        }
        return;
      }

      try {
        // Calculate bounding box
        const [minLon, minLat, maxLon, maxLat] = bbox(featureCollection);
        const padding = calculatePadding();
        const duration = options.duration ?? FLY_TO_DURATION;

        // Fly to the calculated bounds
        mapRef.current.fitBounds(
          [
            [minLon, minLat],
            [maxLon, maxLat],
          ],
          {
            padding,
            duration,
            essential: true,
            maxZoom: 16,
          }
        );
      } catch (error) {
        console.error("Error calculating bounds:", error);

        // Fallback strategies if bounds calculation fails
        if (routes.length > 0 && selectedRouteIndex < routes.length) {
          const selectedRoute = routes[selectedRouteIndex];
          if (selectedRoute.geometry?.coordinates?.length > 0) {
            const center =
              selectedRoute.geometry.coordinates[
                Math.floor(selectedRoute.geometry.coordinates.length / 2)
              ];
            if (isValidCoordinate(center)) {
              mapRef.current.flyTo({
                center,
                zoom: 14,
                duration: FLY_TO_DURATION,
              });
              return;
            }
          }
        }

        // Fallback to start or end coords
        const normalizedStart = startCoords
          ? normalizeCoords(startCoords)
          : null;
        const normalizedEnd = endCoords ? normalizeCoords(endCoords) : null;

        const center = normalizedStart || normalizedEnd;
        if (center && isValidCoordinate(center)) {
          mapRef.current.flyTo({
            center,
            zoom: 14,
            duration: FLY_TO_DURATION,
          });
        }
      }
    },
    [
      startCoords,
      endCoords,
      routes,
      selectedRouteIndex,
      isMapLoaded,
      createFeatureCollection,
      calculatePadding,
      initialCenter,
      initialZoom,
      isValidCoordinate,
      normalizeCoords,
    ]
  );

  // Handle map load event
  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true);
    if (onMapLoaded) onMapLoaded();
    flyToArea();
  }, [onMapLoaded, flyToArea]);

  // Fly to area when dependencies change
  useEffect(() => {
    if (!isMapLoaded) return;

    const timer = setTimeout(() => {
      flyToArea({ duration: 2000 });
    }, 100);

    return () => clearTimeout(timer);
  }, [
    startCoords,
    endCoords,
    routes,
    selectedRouteIndex,
    isMapLoaded,
    flyToArea,
  ]);

  // Render start and end markers
  const renderMarkers = useCallback(() => {
    const normalizedStart = startCoords ? normalizeCoords(startCoords) : null;
    const normalizedEnd = endCoords ? normalizeCoords(endCoords) : null;

    return (
      <>
        {normalizedStart && isValidCoordinate(normalizedStart) && (
          <Marker
            longitude={normalizedStart[0]}
            latitude={normalizedStart[1]}
            anchor="bottom"
          >
            <View style={[styles.marker, styles.startMarker]}>
              <Text style={styles.markerText}>📍</Text>
            </View>
          </Marker>
        )}

        {normalizedEnd && isValidCoordinate(normalizedEnd) && (
          <Marker
            longitude={normalizedEnd[0]}
            latitude={normalizedEnd[1]}
            anchor="bottom"
          >
            <View style={[styles.marker, styles.endMarker]}>
              <Text style={styles.markerText}>🏁</Text>
            </View>
          </Marker>
        )}
      </>
    );
  }, [startCoords, endCoords, isValidCoordinate, normalizeCoords]);

  // Render route lines
  const renderRoutes = useCallback(() => {
    return routes.map((route, index) => {
      if (!route.geometry || !route.geometry.coordinates) return null;

      const isSelected = index === selectedRouteIndex;
      const routeColor = routeColors[index % routeColors.length];

      return (
        <Source
          key={`route-${index}`}
          id={`routeSource-${index}`}
          type="geojson"
          data={{
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          }}
        >
          {isSelected && (
            <Layer
              id={`routeLine-shadow-${index}`}
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": "#000000",
                "line-width": 8,
                "line-opacity": 0.2,
                "line-blur": 5,
              }}
            />
          )}

          <Layer
            id={`routeLine-${index}`}
            type="line"
            layout={{
              "line-join": "round",
              "line-cap": "round",
            }}
            paint={{
              "line-color": routeColor,
              "line-width": isSelected ? 6 : 3,
              "line-opacity": isSelected ? 1 : 0.7,
            }}
          />

          {isSelected && (
            <Layer
              id={`routeLine-outline-${index}`}
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": "#ffffff",
                "line-width": 8,
                "line-opacity": 0.8,
                "line-gap-width": 6,
              }}
            />
          )}
        </Source>
      );
    });
  }, [routes, selectedRouteIndex]);

  // Render data layers (traffic, air quality, incidents)
  const renderDataLayers = useCallback(() => {
    const dataMap = {
      traffic: trafficData,
      airQuality: airQualityData,
      incidents: incidentData,
    };

    return Object.entries(layersVisibility).map(([layerKey, isVisible]) => {
      if (!isVisible || !dataMap[layerKey]) return null;

      const layerProps = {
        id: `${layerKey}-layer`,
        source: `${layerKey}-source`,
      };

      switch (layerKey) {
        case "traffic":
          return (
            <Source
              key={`${layerKey}-source`}
              id={`${layerKey}-source`}
              type="geojson"
              data={dataMap[layerKey]}
            >
              <Layer
                {...layerProps}
                type="line"
                paint={{
                  "line-color": [
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
                  "line-width": 5,
                  "line-opacity": 0.7,
                }}
              />
            </Source>
          );
        case "airQuality":
          return (
            <Source
              key={`${layerKey}-source`}
              id={`${layerKey}-source`}
              type="geojson"
              data={dataMap[layerKey]}
            >
              <Layer
                {...layerProps}
                type="circle"
                paint={{
                  "circle-color": [
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
                  "circle-radius": 7,
                  "circle-opacity": 0.8,
                  "circle-stroke-color": "white",
                  "circle-stroke-width": 1,
                }}
              />
            </Source>
          );
        case "incidents":
          return (
            <Source
              key={`${layerKey}-source`}
              id={`${layerKey}-source`}
              type="geojson"
              data={dataMap[layerKey]}
            >
              <Layer
                {...layerProps}
                type="symbol"
                layout={{
                  "icon-image": ["get", "icon"],
                  "icon-size": 1.5,
                  "text-field": ["get", "description"],
                  "text-size": 12,
                  "text-offset": [0, 1],
                }}
                paint={{
                  "text-color": "black",
                  "text-halo-color": "white",
                  "text-halo-width": 1,
                }}
              />
            </Source>
          );
        default:
          return null;
      }
    });
  }, [trafficData, airQualityData, incidentData, layersVisibility]);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={viewport}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      onLoad={handleMapLoad}
      onMove={(evt) => setViewport(evt.viewState)}
      reuseMaps={true}
    >
      {renderMarkers()}
      {renderRoutes()}
      {renderDataLayers()}
    </Map>
  );
};

const styles = StyleSheet.create({
  marker: {
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  startMarker: {
    backgroundColor: "#4CAF50",
  },
  endMarker: {
    backgroundColor: "#F44336",
  },
  markerText: {
    fontSize: 24,
  },
});

export default MapWrapper;
