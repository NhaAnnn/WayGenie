import React, { useState, useCallback, useRef, useMemo } from "react";
import { View, StyleSheet, Alert } from "react-native";
import MapWrapper from "../../components/MapWrapper.native";
import RouteFindingPanel from "../../components/CurrentRouteFindingPanel.native";

// Hàm so sánh sâu tọa độ
const areCoordsEqual = (coords1, coords2) => {
  if (!coords1 || !coords2) return coords1 === coords2;
  return coords1[0] === coords2[0] && coords1[1] === coords2[1];
};

// Hàm so sánh sâu GeoJSONs
const areGeoJSONsEqual = (geoJSONs1, geoJSONs2) => {
  if (!geoJSONs1 || !geoJSONs2) return geoJSONs1 === geoJSONs2;
  if (geoJSONs1.length !== geoJSONs2.length) return false;
  return geoJSONs1.every((g1, i) => {
    const g2 = geoJSONs2[i];
    if (g1.type !== g2.type || g1.features.length !== g2.features.length)
      return false;
    return g1.features.every((f1, j) => {
      const f2 = g2.features[j];
      if (f1.type !== f2.type || f1.geometry.type !== f2.geometry.type)
        return false;
      return f1.geometry.coordinates.every((c1, k) =>
        areCoordsEqual(c1, f2.geometry.coordinates[k])
      );
    });
  });
};

// Hàm xử lý GeoJSONs chung
const processGeoJSONs = (geoJSONs) => {
  return (geoJSONs || []).flatMap((geoJSON) => {
    if (geoJSON.type === "FeatureCollection" && geoJSON.features) {
      return geoJSON.features.filter(
        (f) =>
          f.type === "Feature" &&
          f.geometry &&
          f.geometry.type === "LineString" &&
          f.geometry.coordinates &&
          f.geometry.coordinates.length >= 2
      );
    }
    return [];
  });
};

const CurrentStatusMapScreen = () => {
  const [routeStartCoords, setRouteStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [allRoutesGeoJSONs, setAllRoutesGeoJSONs] = useState(null);
  const [highlightedRouteGeoJSONs, setHighlightedRouteGeoJSONs] =
    useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [routePreference, setRoutePreference] = useState("fastest");
  const mapRef = useRef(null);
  const [routeProcessed, setRouteProcessed] = useState(false);

  const onMapLoaded = () => {
    setMapLoaded(true);
    if (!routeProcessed && routeStartCoords && endCoords && allRoutesGeoJSONs) {
      processRouteData();
    }
  };

  const processRouteData = () => {
    if (!mapRef.current || isError) return;
    setRouteProcessed(true);

    const processedRouteGeoJSONs = processGeoJSONs(allRoutesGeoJSONs);

    if (processedRouteGeoJSONs.length > 0) {
      setAllRoutesGeoJSONs({
        type: "FeatureCollection",
        features: processedRouteGeoJSONs,
      });
    } else {
      console.error("No valid GeoJSONs to display");
      Alert.alert("Lỗi", "Không tìm thấy tuyến đường hợp lệ để hiển thị.");
      setIsError(true);
    }
  };

  const onRouteSelected = useCallback(
    (startCoords, endCoords, geoJSONs, newSelectedRouteId, preference) => {
      if (
        areCoordsEqual(startCoords, routeStartCoords) &&
        areCoordsEqual(endCoords, endCoords) &&
        areGeoJSONsEqual(geoJSONs, allRoutesGeoJSONs) &&
        newSelectedRouteId === selectedRouteId &&
        preference === routePreference
      ) {
        return;
      }

      if (!mapLoaded || !mapRef.current || isError) {
        setRouteStartCoords(startCoords);
        setEndCoords(endCoords);
        setAllRoutesGeoJSONs(geoJSONs);
        setHighlightedRouteGeoJSONs({
          type: "FeatureCollection",
          features: processGeoJSONs(geoJSONs).filter(
            (f) => f.properties?.routeId === newSelectedRouteId
          ),
        });
        setSelectedRouteId(newSelectedRouteId);
        setRoutePreference(preference);
        return;
      }

      const processedRouteGeoJSONs = processGeoJSONs(geoJSONs);

      if (processedRouteGeoJSONs.length > 0) {
        setRouteStartCoords(startCoords);
        setEndCoords(endCoords);
        setAllRoutesGeoJSONs({
          type: "FeatureCollection",
          features: processedRouteGeoJSONs,
        });
        setHighlightedRouteGeoJSONs({
          type: "FeatureCollection",
          features: processedRouteGeoJSONs.filter(
            (f) => f.properties?.routeId === newSelectedRouteId
          ),
        });
        setSelectedRouteId(newSelectedRouteId);
        setRoutePreference(preference);
        setRouteProcessed(false);
      } else {
        console.error("No valid GeoJSONs to display");
        setIsError(true);
        Alert.alert("Lỗi", "Không tìm thấy tuyến đường hợp lệ để hiển thị.");
      }
    },
    [
      mapLoaded,
      isError,
      routeStartCoords,
      endCoords,
      allRoutesGeoJSONs,
      selectedRouteId,
      routePreference,
    ]
  );

  const onClearRoute = useCallback(() => {
    setRouteStartCoords(null);
    setEndCoords(null);
    setAllRoutesGeoJSONs(null);
    setHighlightedRouteGeoJSONs(null);
    setSelectedRouteId(null);
    setRoutePreference("fastest");
    setRouteProcessed(false);
  }, []);

  const routeGeoJSONs = useMemo(() => {
    return allRoutesGeoJSONs; // Hiển thị tất cả tuyến đường
  }, [allRoutesGeoJSONs, highlightedRouteGeoJSONs]);

  return (
    <View style={styles.container}>
      <MapWrapper
        ref={mapRef}
        initialCenter={[105.85367, 21.030708]} // Hà Nội trung tâm
        initialZoom={12}
        styleURL="mapbox://styles/mapbox/streets-v11"
        onMapLoaded={onMapLoaded}
        startCoords={routeStartCoords}
        endCoords={endCoords}
        routeGeoJSONs={routeGeoJSONs}
        selectedRouteId={selectedRouteId}
      />
      <RouteFindingPanel
        onRouteSelected={onRouteSelected}
        onClearRoute={onClearRoute}
        selectedRouteId={selectedRouteId}
        routeGeoJSONs={allRoutesGeoJSONs}
        routePreference={routePreference}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CurrentStatusMapScreen;
