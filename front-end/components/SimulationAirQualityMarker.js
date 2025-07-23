// AirQualityMarker.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Hàm xác định trạng thái và màu sắc dựa trên giá trị AQI (không thay đổi)
const getAqiStatusAndColor = (aqi) => {
  if (typeof aqi !== "number" || isNaN(aqi)) {
    return { status: "unknown", color: "#c0c0c0", textColor: "#ffffff" }; // Grey for unknown
  }

  if (aqi >= 300) {
    return { status: "hazardous", color: "#7e0023", textColor: "#ffffff" };
  } else if (aqi >= 200) {
    return { status: "very_unhealthy", color: "#8b008b", textColor: "#ffffff" };
  } else if (aqi >= 150) {
    return { status: "unhealthy", color: "#ff0000", textColor: "#ffffff" };
  } else if (aqi >= 100) {
    return {
      status: "unhealthy_sensitive",
      color: "#ff8c00",
      textColor: "#ffffff",
    };
  } else if (aqi >= 50) {
    return { status: "moderate", color: "#ffff00", textColor: "#333333" };
  } else {
    return { status: "good", color: "#008000", textColor: "#ffffff" };
  }
};

const AirQualityMarker = ({ stationData }) => {
  const aqiValue =
    typeof stationData.aqi === "number" ? Math.round(stationData.aqi) : "N/A";
  const { color: backgroundColor, textColor } = getAqiStatusAndColor(aqiValue);

  return (
    <View style={[styles.markerContainer, { backgroundColor }]}>
      <Text style={[styles.aqiText, { color: textColor }]}>{aqiValue}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 45, // Kích thước cố định của marker
    height: 45,
    borderRadius: 22.5, // Hình tròn
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  aqiText: {
    fontWeight: "bold",
    fontSize: 18,

    lineHeight: 18 * 1.2,
    textAlignVertical: "center",
    textAlign: "center",
  },
});

export default AirQualityMarker;
