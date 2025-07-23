import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

// Hàm xác định trạng thái văn bản và màu sắc dựa trên giá trị AQI
const getAqiDescriptionAndColor = (aqi) => {
  if (typeof aqi !== "number" || isNaN(aqi)) {
    return {
      description: "Chưa rõ",
      textColor: "#888888",
      backgroundColor: "#f0f0f0",
    };
  }

  // Màu sắc và mô tả theo tiêu chuẩn AQI
  if (aqi >= 300) {
    return {
      description: "Nguy hiểm",
      textColor: "#FFFFFF",
      backgroundColor: "#7e0023",
    }; // Maroon
  } else if (aqi >= 200) {
    return {
      description: "Rất không tốt",
      textColor: "#FFFFFF",
      backgroundColor: "#8b008b",
    }; // Dark Magenta
  } else if (aqi >= 150) {
    return {
      description: "Không tốt",
      textColor: "#FFFFFF",
      backgroundColor: "#FF0000",
    }; // Red
  } else if (aqi >= 100) {
    return {
      description: "Không tốt cho nhóm nhạy cảm",
      textColor: "#000000",
      backgroundColor: "#FFA500",
    }; // Orange
  } else if (aqi >= 50) {
    return {
      description: "Trung bình",
      textColor: "#000000",
      backgroundColor: "#FFFF00",
    }; // Yellow
  } else {
    return {
      description: "Tốt",
      textColor: "#FFFFFF",
      backgroundColor: "#008000",
    }; // Green
  }
};

// Chấp nhận prop `style`, `onClose` và `onConfigureAqiSimulation`
const AirQualityCallout = ({
  data,
  style,
  onClose,
  onConfigureAqiSimulation,
}) => {
  if (!data) return null;

  const aqiValue = typeof data.aqi === "number" ? Math.round(data.aqi) : "N/A";
  const pm25Value =
    typeof data.pm25 === "number" ? data.pm25.toFixed(1) : "N/A";
  const stationName = data.stationName || "Trạm không khí";

  const {
    description: aqiDescription,
    textColor: aqiTextColor,
    backgroundColor: aqiBgColor,
  } = getAqiDescriptionAndColor(aqiValue);

  return (
    <View style={[styles.calloutContainer, style]}>
      {/* Nút đóng popup */}
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.stationNameText}>{stationName}</Text>
      <View style={[styles.aqiBadge, { backgroundColor: aqiBgColor }]}>
        <Text style={[styles.aqiBadgeText, { color: aqiTextColor }]}>
          AQI: {aqiValue} ({aqiDescription})
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>PM2.5:</Text>
        <Text style={styles.infoValue}>{pm25Value} µg/m³ </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>CO:</Text>
        <Text style={styles.infoValue}>{data.co || "N/A"} ppm </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>NO2:</Text>
        <Text style={styles.infoValue}>{data.no2 || "N/A"} ppb </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>SO2:</Text>
        <Text style={styles.infoValue}>{data.so2 || "N/A"} ppb </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>O3:</Text>
        <Text style={styles.infoValue}>{data.o3 || "N/A"} ppb</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Thời gian:</Text>
        <Text style={styles.infoValue}>
          {data.timestamp
            ? new Date(data.timestamp).toLocaleTimeString()
            : "N/A"}
        </Text>
      </View>

      {/* Nút cấu hình mô phỏng AQI */}
      <TouchableOpacity
        onPress={() => onConfigureAqiSimulation(data.id)}
        style={styles.configButton}
      >
        <Text style={styles.configButtonText}>Mô phỏng AQI</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    backgroundColor: "white",
    borderRadius: 12, // More rounded corners
    padding: 15, // Increased padding
    width: 230, // Slightly wider
    minHeight: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // More prominent shadow
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 0, // Remove border for cleaner look
    position: "relative", // Needed for absolute positioning of close button
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#e74c3c", // Red background for close
    width: 24,
    height: 24,
    borderRadius: 12, // Perfectly round
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1, // Ensure it's on top
    shadowColor: "#000", // Subtle shadow for the button itself
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  closeButtonText: {
    fontWeight: "bold",
    color: "white",
    fontSize: 14, // Larger 'x'
    lineHeight: 18, // Adjust line height for centering
  },
  stationNameText: {
    fontWeight: "bold",
    fontSize: 16, // Larger and more prominent
    marginBottom: 10, // More space below name
    color: "#333",
    textAlign: "center", // Center the station name
    marginRight: 20, // Make space for the close button
  },
  aqiBadge: {
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignSelf: "center", // Center the badge
  },
  aqiBadgeText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4, // Slightly more space between rows
  },
  infoLabel: {
    fontSize: 12, // Slightly larger labels
    color: "#555",
  },
  infoValue: {
    fontSize: 12, // Slightly larger values
    fontWeight: "bold",
    color: "#333", // Darker value text
  },
  configButton: {
    backgroundColor: "#007BFF", // Blue for configuration
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15, // Space above the button
    shadowColor: "#007BFF", // Blue shadow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  configButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default AirQualityCallout;
