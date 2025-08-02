import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import bbox from "@turf/bbox";
import { Ionicons } from "@expo/vector-icons";
import AirQualityMarker from "./AirQualityMarker.web";
import AirQualityCallout from "./AirQualityCallout.web";
import RouteCallout from "./RoutePopup.web";
import CoordinateCallout from "./CoordinateCallout.web";

const DEFAULT_POSITION = [105.8342, 21.0278];
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
    coordinates: true,
    airQuality: false,
    incidents: true,
  },
  trafficData = null,
  coordinatesData = null,
  airQualityData = null,
  incidentData = null,
  onCoordinateMarkerPress,
  coordinatesInfo,
  onCloseCoordinatesPanel,
  onMapLoaded,
  onClick,
  selectedPosition,
  savedPositions = [],
  onNodeSelect,
  showRoutePopup = true, // Thêm prop mới với giá trị mặc định là true
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
  const [selectedPopup, setSelectedPopup] = useState(null);

  const routeColors = [
    "#007BFF",
    "#28a745",
    "#fd7e14",
    "#6f42c1",
    "#dc3545",
    "#17a2b8",
    "#e83e8c",
  ];

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

  const normalizeCoords = useCallback(
    (coords) => {
      if (!coords) return null;
      if (isValidCoordinate(coords)) return coords;
      if (coords.length >= 2) {
        const reversed = [coords[1], coords[0]];
        if (isValidCoordinate(reversed)) return reversed;
      }
      return null;
    },
    [isValidCoordinate]
  );

  const createFeatureCollection = useCallback(() => {
    const features = [];
    const normalizedStart = startCoords ? normalizeCoords(startCoords) : null;
    const normalizedEnd = endCoords ? normalizeCoords(endCoords) : null;

    if (normalizedStart && isValidCoordinate(normalizedStart)) {
      features.push({
        type: "Feature",
        properties: { type: "start" },
        geometry: { type: "Point", coordinates: normalizedStart },
      });
    }

    if (normalizedEnd && isValidCoordinate(normalizedEnd)) {
      features.push({
        type: "Feature",
        properties: { type: "end" },
        geometry: { type: "Point", coordinates: normalizedEnd },
      });
    }

    routes.forEach((route, index) => {
      if (route.geometry?.coordinates) {
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

    savedPositions.forEach((pos, index) => {
      if (isValidCoordinate(pos)) {
        features.push({
          type: "Feature",
          properties: { type: "intermediate", id: `intermediate-${index}` },
          geometry: { type: "Point", coordinates: pos },
        });
      }
    });

    return { type: "FeatureCollection", features };
  }, [
    startCoords,
    endCoords,
    routes,
    selectedRouteIndex,
    savedPositions,
    isValidCoordinate,
    normalizeCoords,
  ]);

  const calculatePadding = useCallback(() => {
    return { top: 150, bottom: 50, left: 50, right: 50 };
  }, []);

  const flyToArea = useCallback(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const featureCollection = createFeatureCollection();

    if (featureCollection.features.length === 0) {
      mapRef.current.flyTo({
        center: initialCenter,
        zoom: initialZoom,
        duration: FLY_TO_DURATION,
      });
      return;
    }

    try {
      const [minLon, minLat, maxLon, maxLat] = bbox(featureCollection);
      const padding = calculatePadding();
      mapRef.current.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        {
          padding,
          duration: FLY_TO_DURATION,
          essential: true,
          maxZoom: 16,
        }
      );
    } catch (error) {
      console.error("Error calculating bounds:", error);
    }
  }, [
    isMapLoaded,
    createFeatureCollection,
    calculatePadding,
    initialCenter,
    initialZoom,
  ]);

  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true);
    onMapLoaded?.();
    flyToArea();
  }, [onMapLoaded, flyToArea]);

  const renderMarkers = useCallback(() => {
    const normalizedStart = normalizeCoords(startCoords);
    const normalizedEnd = normalizeCoords(endCoords);

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

  const renderRoutes = useCallback(() => {
    const navigationRoutes = routes.map((route, index) => {
      if (!route.geometry || !route.geometry.coordinates) return null;

      const isSelected = index === selectedRouteIndex;
      const routeColor = routeColors[index % routeColors.length];

      return (
        <Source
          key={`nav-route-${index}`}
          id={`nav-routeSource-${index}`}
          type="geojson"
          data={{
            type: "Feature",
            properties: {
              routeIndex: index,
              isNavigation: true,
            },
            geometry: route.geometry,
          }}
        >
          {isSelected && (
            <Layer
              id={`nav-routeLine-shadow-${index}`}
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#000000",
                "line-width": 8,
                "line-opacity": 0.2,
                "line-blur": 5,
              }}
            />
          )}
          <Layer
            id={`nav-routeLine-${index}`}
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": routeColor,
              "line-width": isSelected ? 6 : 3,
              "line-opacity": isSelected ? 1 : 0.7,
            }}
            interactive={false}
          />
        </Source>
      );
    });

    const trafficRoutes =
      layersVisibility.traffic && trafficData ? (
        <Source id="traffic-routes" type="geojson" data={trafficData}>
          <Layer
            id="traffic-routes-layer"
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
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
            interactive={true}
          />
        </Source>
      ) : null;

    return [...navigationRoutes, trafficRoutes];
  }, [routes, selectedRouteIndex, trafficData, layersVisibility.traffic]);

  const renderDataLayers = useCallback(() => {
    const dataMap = {
      coordinates: coordinatesData,
      airQuality: airQualityData,
      incidents: incidentData,
    };

    return Object.entries(layersVisibility).map(([layerKey, isVisible]) => {
      if (!isVisible || !dataMap[layerKey] || layerKey === "traffic")
        return null;

      const layerProps = {
        id: `${layerKey}-layer`,
        source: `${layerKey}-source`,
      };

      if (layerKey === "incidents") {
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
      }

      return null;
    });
  }, [coordinatesData, airQualityData, incidentData, layersVisibility]);

  const renderSelectedPosition = useCallback(() => {
    if (!selectedPosition || !isValidCoordinate(selectedPosition)) return null;

    return (
      <Marker
        longitude={selectedPosition[0]}
        latitude={selectedPosition[1]}
        anchor="bottom"
      >
        <View style={[styles.marker, styles.intermediateMarker]}>
          <Ionicons name="pin" size={24} color="#007BFF" />
        </View>
      </Marker>
    );
  }, [selectedPosition, isValidCoordinate]);

  const renderIntermediatePositions = useCallback(() => {
    return savedPositions.map((pos, index) => {
      if (!isValidCoordinate(pos)) return null;

      return (
        <Marker
          key={`intermediate-pos-${index}`}
          longitude={pos[0]}
          latitude={pos[1]}
          anchor="bottom"
        >
          <View style={[styles.marker, styles.intermediateMarker]}>
            <Ionicons name="ellipse" size={18} color="#FF4500" />
          </View>
        </Marker>
      );
    });
  }, [savedPositions, isValidCoordinate]);

  const coordinateLayer = useMemo(() => {
    if (!layersVisibility.coordinates || !coordinatesData?.features) {
      return null;
    }

    return (
      <Source id="coordinates-source" type="geojson" data={coordinatesData}>
        <Layer
          id="coordinates-layer"
          type="circle"
          paint={{
            "circle-radius": 6,
            "circle-color": "#3366ff",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          }}
        />
      </Source>
    );
  }, [coordinatesData, layersVisibility.coordinates]);

  const handleMapClick = useCallback(
    (e) => {
      console.log("MapWrapper handleMapClick, event:", e);
      if (!mapRef.current) return;

      // Kiểm tra click vào tọa độ trước
      if (layersVisibility.coordinates) {
        const features = mapRef.current.queryRenderedFeatures(e.point, {
          layers: ["coordinates-layer"],
        });

        if (features.length > 0) {
          const feature = features[0];
          const { properties, geometry } = feature;
          if (geometry?.coordinates && properties) {
            const [lng, lat] = geometry.coordinates;
            if (isValidCoordinate([lng, lat])) {
              e.originalEvent.stopPropagation();
              setSelectedPopup({
                type: "coordinates",
                data: { ...properties, coordinates: [lng, lat] },
              });
              onCoordinateMarkerPress(feature);
              return;
            }
          }
        }
      }

      // Kiểm tra click vào tuyến đường giao thông, chỉ nếu showRoutePopup là true
      if (showRoutePopup) {
        const trafficFeatures = mapRef.current.queryRenderedFeatures(e.point, {
          layers: ["traffic-routes-layer"],
        });

        if (trafficFeatures.length > 0) {
          const feature = trafficFeatures[0];
          const { properties, geometry } = feature;
          if (properties && geometry?.coordinates) {
            e.originalEvent.stopPropagation();
            const coordinates = geometry.coordinates;
            const midPointIndex = Math.floor(coordinates.length / 2);
            const [lng, lat] = coordinates[midPointIndex];
            if (isValidCoordinate([lng, lat])) {
              setSelectedPopup({
                type: "route",
                data: {
                  linkNo: properties.linkNo || properties.id || "N/A",
                  fromNodeNo: properties.FROMNODENO || "N/A",
                  toNodeNo: properties.TONODENO || "N/A",
                  vc: properties.VC || 0,
                  tsysset: properties.TSYSSET || "N/A",
                  status:
                    properties.VC <= 0.6
                      ? "smooth"
                      : properties.VC <= 0.8
                      ? "moderate"
                      : "congested",
                  coordinates: [lng, lat],
                },
              });
            }
            return;
          }
        }
      }

      // Gọi onClick (cho tọa độ trung gian) nếu không nhấn vào node hoặc tuyến đường
      if (onClick) {
        onClick(e);
      }
    },
    [
      isValidCoordinate,
      onCoordinateMarkerPress,
      layersVisibility.coordinates,
      onClick,
      showRoutePopup, // Thêm showRoutePopup vào dependencies
    ]
  );

  const handleNodeSelect = useCallback(
    (coordinates) => {
      if (onNodeSelect && isValidCoordinate(coordinates)) {
        onNodeSelect(coordinates);
        setSelectedPopup(null); // Đóng popup sau khi chọn
      }
    },
    [onNodeSelect, isValidCoordinate]
  );

  const renderAirQualityMarkers = useCallback(() => {
    if (!layersVisibility.airQuality || !airQualityData?.features) return null;

    return airQualityData.features.map((feature, index) => {
      const { properties, geometry } = feature;
      if (geometry?.coordinates && properties) {
        const [lng, lat] = geometry.coordinates;
        if (isValidCoordinate([lng, lat])) {
          return (
            <Marker
              key={`aqi-marker-${properties.stationId || index}`}
              longitude={lng}
              latitude={lat}
              anchor="top"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedPopup({
                  type: "airQuality",
                  data: { ...properties, coordinates: [lng, lat] },
                });
              }}
            >
              <AirQualityMarker stationData={properties} />
            </Marker>
          );
        }
      }
      return null;
    });
  }, [airQualityData, layersVisibility, isValidCoordinate]);

  const handleClosePopup = () => {
    setSelectedPopup(null);
    if (selectedPopup?.type === "coordinates") {
      onCloseCoordinatesPanel?.();
    }
  };

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={viewport}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      onLoad={handleMapLoad}
      onClick={handleMapClick}
      onMove={(evt) => setViewport(evt.viewState)}
    >
      {renderMarkers()}
      {renderRoutes()}
      {renderDataLayers()}
      {renderSelectedPosition()}
      {renderIntermediatePositions()}
      {coordinateLayer}
      {renderAirQualityMarkers()}

      {selectedPopup?.type === "route" && showRoutePopup && (
        <Marker
          longitude={selectedPopup.data.coordinates[0]}
          latitude={selectedPopup.data.coordinates[1]}
          anchor="top"
        >
          <RouteCallout data={selectedPopup.data} onClose={handleClosePopup} />
        </Marker>
      )}

      {selectedPopup?.type === "coordinates" && (
        <Marker
          longitude={selectedPopup.data.coordinates[0]}
          latitude={selectedPopup.data.coordinates[1]}
          anchor="top"
        >
          <CoordinateCallout
            data={selectedPopup.data}
            onClose={handleClosePopup}
            onSelect={handleNodeSelect}
          />
        </Marker>
      )}

      {selectedPopup?.type === "airQuality" && (
        <Marker
          longitude={selectedPopup.data.coordinates[0]}
          latitude={selectedPopup.data.coordinates[1]}
          anchor="top"
        >
          <View>
            <Text onPress={handleClosePopup} style={styles.closePopup}>
              [X]
            </Text>
            <AirQualityCallout data={selectedPopup.data} />
          </View>
        </Marker>
      )}
    </Map>
  );
};

const styles = StyleSheet.create({
  marker: {
    borderRadius: 15,
    padding: 1,
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
  intermediateMarker: {
    backgroundColor: "transparent",
  },
  markerText: {
    fontSize: 24,
  },
  closePopup: {
    margin: 3,
    color: "red",
    textAlign: "right",
    fontWeight: "bold",
    backgroundColor: "white",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
    alignSelf: "flex-end",
  },
});

export default MapWrapper;
