import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

// Hàm xác định trạng thái văn bản dựa trên giá trị AQI
const getAqiDescriptionAndColor = (aqi) => {
  if (typeof aqi !== "number" || isNaN(aqi)) {
    return { description: "Chưa rõ", textColor: "#888888" };
  }

  if (aqi >= 300) {
    return { description: "Nguy hiểm", textColor: "#7e0023" };
  } else if (aqi >= 200) {
    return { description: "Rất không tốt", textColor: "#8b008b" };
  } else if (aqi >= 150) {
    return { description: "Không tốt", textColor: "#ff0000" };
  } else if (aqi >= 100) {
    return { description: "Không tốt cho nhóm nhạy cảm", textColor: "#ff8c00" };
  } else if (aqi >= 50) {
    return { description: "Trung bình", textColor: "#CCCC00" };
  } else {
    return { description: "Tốt", textColor: "#008000" };
  }
};

const AirQualityCallout = ({ data }) => {
  if (!data) return null;

  const aqiValue = typeof data.aqi === "number" ? Math.round(data.aqi) : "N/A";
  const pm25Value =
    typeof data.pm25 === "number" ? data.pm25.toFixed(1) : "N/A";
  const stationName = data.stationName || "Trạm không khí";

  const { description: aqiDescription, textColor: aqiTextColor } =
    getAqiDescriptionAndColor(aqiValue);

  return (
    <View style={styles.calloutContainer}>
      <Text style={styles.stationNameText}>{stationName}</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>AQI:</Text>
        <Text style={[styles.infoValue, { color: aqiTextColor }]}>
          {aqiValue} ({aqiDescription})
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>PM2.5:</Text>
        <Text style={styles.infoValue}>{pm25Value} µg/m³</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>CO:</Text>
        <Text style={styles.infoValue}>{data.co || "N/A"} ppm</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>NO2:</Text>
        <Text style={styles.infoValue}>{data.no2 || "N/A"} ppb</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>SO2:</Text>
        <Text style={styles.infoValue}>{data.so2 || "N/A"} ppb</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>O3:</Text>
        <Text style={styles.infoValue}>{data.o3 || "N/A"} ppb</Text>
      </View>
      {/* <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Thời gian:</Text>
        <Text style={styles.infoValue}>{data.timestamp || "N/A"}</Text>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
    width: 250,
    minHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    zIndex: 10000, // Đảm bảo popup luôn trên cùng
  },
  closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    padding: 3,
  },
  closeButtonText: {
    fontWeight: "bold",
    color: "#888",
    fontSize: 14,
  },
  stationNameText: {
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 5,
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: "#555",
  },
  infoValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
});

export default AirQualityCallout;
