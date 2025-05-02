import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import { Icon, icon } from "leaflet";

const DEFAULT_POSITION = [10.762622, 106.660172]; // HCM

const FitBoundsHelper = ({ routeCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (routeCoords.length > 0) {
      const bounds = routeCoords.map(([lat, lng]) => [lat, lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeCoords]);

  return null;
};

const MapWrapper = ({ startCoords, endCoords, routeCoords }) => {
  const customIcon = new Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
    iconSize: [40, 40],
    iconAnchor: [15, 45],
  });

  return (
    <MapContainer
      center={startCoords || DEFAULT_POSITION}
      zoom={13}
      scrollWheelZoom
      style={{ flex: 3 }}
    >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {startCoords && (
        <Marker position={startCoords} icon={customIcon}>
          <Popup>Điểm đi</Popup>
        </Marker>
      )}

      {endCoords && (
        <Marker position={endCoords} icon={customIcon}>
          <Popup>Điểm đến</Popup>
        </Marker>
      )}

      {routeCoords.length > 0 && (
        <Polyline positions={routeCoords} color="blue" />
      )}

      <FitBoundsHelper routeCoords={routeCoords} />
    </MapContainer>
  );
};

export default MapWrapper;
