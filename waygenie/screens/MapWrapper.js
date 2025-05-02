import React from "react";
import MapView, {
  Marker as MarkerNative,
  Polyline as PolylineNative,
} from "react-native-maps";

const DEFAULT_POSITION = [10.762622, 106.660172];

const MapWrapper = ({ startCoords, endCoords, routeCoords }) => {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: startCoords?.[0] || DEFAULT_POSITION[0],
        longitude: startCoords?.[1] || DEFAULT_POSITION[1],
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {startCoords && (
        <MarkerNative
          coordinate={{
            latitude: startCoords[0],
            longitude: startCoords[1],
          }}
          title="Điểm đi"
        />
      )}
      {endCoords && (
        <MarkerNative
          coordinate={{
            latitude: endCoords[0],
            longitude: endCoords[1],
          }}
          title="Điểm đến"
        />
      )}
      {routeCoords.length > 0 && (
        <PolylineNative
          coordinates={routeCoords.map((point) => ({
            latitude: point[0],
            longitude: point[1],
          }))}
          strokeColor="#0000FF"
          strokeWidth={3}
        />
      )}
    </MapView>
  );
};

export default MapWrapper;
