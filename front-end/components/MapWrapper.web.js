import React, { useRef, useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import ReactMapGL, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const DEFAULT_POSITION = [106.660172, 10.762622]; // Tọa độ mặc định (TP.HCM)

const MapWrapper = ({
  startCoords,
  endCoords,
  routes = [],
  mapboxAccessToken,
  selectedRouteIndex = 0,
}) => {
  const mapRef = useRef(null);
  const [viewport, setViewport] = useState({
    longitude: DEFAULT_POSITION[0],
    latitude: DEFAULT_POSITION[1],
    zoom: 10,
    bearing: 0,
    pitch: 0,
  });

  // Màu sắc cho các tuyến đường
  const routeColors = [
    "#3F51B5", // Xanh dương
    "#FF5722", // Cam
    "#4CAF50", // Xanh lá
    "#9C27B0", // Tím
    "#FFC107", // Vàng
  ];

  // Chuyển đổi tọa độ [lat, lng] -> [lng, lat] cho Mapbox
  const toMapboxCoords = (coords) => (coords ? [coords[1], coords[0]] : null);

  // Hiệu ứng bay đến khu vực quan tâm
  const flyToArea = () => {
    const allCoords = [];
    const start = toMapboxCoords(startCoords);
    const end = toMapboxCoords(endCoords);

    if (start) allCoords.push(start);
    if (end) allCoords.push(end);

    routes.forEach((route) => {
      if (route.geometry?.coordinates) {
        route.geometry.coordinates.forEach((point) => allCoords.push(point));
      }
    });

    if (allCoords.length === 0) return;

    // Tính toán bounding box
    const bbox = allCoords.reduce(
      (acc, coord) => {
        return {
          minLon: Math.min(acc.minLon, coord[0]),
          maxLon: Math.max(acc.maxLon, coord[0]),
          minLat: Math.min(acc.minLat, coord[1]),
          maxLat: Math.max(acc.maxLat, coord[1]),
        };
      },
      {
        minLon: Infinity,
        maxLon: -Infinity,
        minLat: Infinity,
        maxLat: -Infinity,
      }
    );

    // Tính toán zoom level phù hợp
    const zoom = calculateZoomLevel(bbox);

    setViewport({
      longitude: (bbox.minLon + bbox.maxLon) / 2,
      latitude: (bbox.minLat + bbox.maxLat) / 2,
      zoom,
      transitionDuration: 1000,
    });
  };

  // Tính toán zoom level dựa trên bounding box
  const calculateZoomLevel = (bbox) => {
    const latDiff = Math.abs(bbox.maxLat - bbox.minLat);
    const lonDiff = Math.abs(bbox.maxLon - bbox.minLon);
    const maxDiff = Math.max(latDiff, lonDiff);

    if (maxDiff < 0.001) return 18;
    if (maxDiff < 0.01) return 15;
    if (maxDiff < 0.05) return 13;
    if (maxDiff < 0.1) return 12;
    if (maxDiff < 0.5) return 10;
    return 8;
  };

  // Hiệu ứng khi có thay đổi về vị trí hoặc tuyến đường
  useEffect(() => {
    flyToArea();
  }, [startCoords, endCoords, routes]);

  return (
    <ReactMapGL
      ref={mapRef}
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={viewport}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      onMove={(evt) => setViewport(evt.viewState)}
    >
      {/* Marker điểm bắt đầu */}
      {startCoords && (
        <Marker
          longitude={startCoords[1]}
          latitude={startCoords[0]}
          anchor="bottom"
        >
          <View style={styles.startMarker}>
            <Text style={styles.markerText}>📍</Text>
          </View>
        </Marker>
      )}

      {/* Marker điểm kết thúc */}
      {endCoords && (
        <Marker
          longitude={endCoords[1]}
          latitude={endCoords[0]}
          anchor="bottom"
        >
          <View style={styles.endMarker}>
            <Text style={styles.markerText}>🏁</Text>
          </View>
        </Marker>
      )}

      {/* Hiển thị tất cả các tuyến đường */}
      {routes.map((route, index) => {
        const isSelected = index === selectedRouteIndex;

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
            {/* Lớp bóng đổ cho tuyến đường được chọn */}
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

            {/* Lớp chính của tuyến đường */}
            <Layer
              id={`routeLine-${index}`}
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": routeColors[index % routeColors.length],
                "line-width": isSelected ? 6 : 3,
                "line-opacity": isSelected ? 1 : 0.5,
                "line-dasharray": isSelected ? [1, 0] : [1, 0],
              }}
            />

            {/* Lớp viền cho tuyến đường được chọn */}
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
      })}
    </ReactMapGL>
  );
};

const styles = StyleSheet.create({
  startMarker: {
    backgroundColor: "#4CAF50",
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: "white",
  },
  endMarker: {
    backgroundColor: "#F44336",
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: "white",
  },
  markerText: {
    fontSize: 24,
  },
});

export default MapWrapper;
