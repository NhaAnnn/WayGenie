import React, { useRef, useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import ReactMapGL, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const DEFAULT_POSITION = [106.660172, 10.762622]; // [Long, Lat] - TP.HCM

const MapWrapper = ({
  startCoords,
  endCoords,
  routeGeoJSON,
  mapboxAccessToken,
}) => {
  const mapRef = useRef(null);

  const toMapboxCoords = (coords) =>
    coords ? [coords[1], coords[0]] : undefined;

  const mapboxStartCoords = toMapboxCoords(startCoords);
  const mapboxEndCoords = toMapboxCoords(endCoords);

  const [viewport, setViewport] = useState({
    longitude: mapboxStartCoords ? mapboxStartCoords[0] : DEFAULT_POSITION[0],
    latitude: mapboxStartCoords ? mapboxStartCoords[1] : DEFAULT_POSITION[1],
    zoom: 10,
    bearing: 0,
    pitch: 0,
  });

  useEffect(() => {
    if (mapboxStartCoords || mapboxEndCoords || routeGeoJSON) {
      const allCoords = [];
      if (mapboxStartCoords) allCoords.push(mapboxStartCoords);
      if (mapboxEndCoords) allCoords.push(mapboxEndCoords);

      if (routeGeoJSON && routeGeoJSON.coordinates) {
        routeGeoJSON.coordinates.forEach((point) => allCoords.push(point));
      }

      if (allCoords.length > 0) {
        let minLon = Infinity,
          maxLon = -Infinity,
          minLat = Infinity,
          maxLat = -Infinity;

        allCoords.forEach((coord) => {
          minLon = Math.min(minLon, coord[0]);
          maxLon = Math.max(maxLon, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        });

        const calculateZoom = (minLat, maxLat, minLon, maxLon) => {
          const latDiff = Math.abs(maxLat - minLat);
          const lonDiff = Math.abs(maxLon - minLon);
          if (latDiff === 0 && lonDiff === 0) return 14;
          const maxDiff = Math.max(latDiff, lonDiff);
          if (maxDiff < 0.001) return 18;
          if (maxDiff < 0.01) return 15;
          if (maxDiff < 0.05) return 13;
          if (maxDiff < 0.1) return 12;
          if (maxDiff < 0.5) return 10;
          return 8;
        };

        setViewport((prev) => ({
          ...prev,
          longitude: (minLon + maxLon) / 2,
          latitude: (minLat + maxLat) / 2,
          zoom: calculateZoom(minLat, maxLat, minLon, maxLon),
          transitionDuration: 1000,
        }));
      } else if (mapboxStartCoords) {
        setViewport((prev) => ({
          ...prev,
          longitude: mapboxStartCoords[0],
          latitude: mapboxStartCoords[1],
          zoom: 14,
          transitionDuration: 1000,
        }));
      }
    }
  }, [mapboxStartCoords, mapboxEndCoords, routeGeoJSON]);

  return (
    <ReactMapGL
      ref={mapRef}
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={viewport}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      onMove={(evt) => setViewport(evt.viewState)}
    >
      {mapboxStartCoords && (
        <Marker
          longitude={mapboxStartCoords[0]}
          latitude={mapboxStartCoords[1]}
          anchor="center"
        >
          <Text style={styles.markerText}>📍</Text>
        </Marker>
      )}
      {mapboxEndCoords && (
        <Marker
          longitude={mapboxEndCoords[0]}
          latitude={mapboxEndCoords[1]}
          anchor="center"
        >
          <Text style={styles.markerText}>🏁</Text>
        </Marker>
      )}
      {routeGeoJSON && (
        <Source
          id="routeSource"
          type="geojson"
          data={{
            type: "Feature",
            properties: {},
            geometry: routeGeoJSON,
          }}
        >
          <Layer
            id="routeLine"
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": "#007AFF",
              "line-width": 5,
              "line-opacity": 0.8,
            }}
          />
        </Source>
      )}
    </ReactMapGL>
  );
};

const styles = StyleSheet.create({
  markerText: {
    fontSize: 30,
  },
});

export default MapWrapper;
