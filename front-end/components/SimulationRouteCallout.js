import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const RouteCallout = ({ data, onClose }) => {
  if (!data) {
    return null;
  }

  const { routeId, recommendedMode, healthScore, distance, estimatedTime } =
    data;

  // Function to format health score color
  const getHealthScoreColor = (score) => {
    if (score === null || score === undefined) return "#888"; // Default for no score
    if (score >= 80) return "#2ecc71"; // Good (Green)
    if (score >= 50) return "#f1c40f"; // Moderate (Yellow)
    return "#e74c3c"; // Poor (Red)
  };

  return (
    <View style={styles.calloutContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Chi tiết Tuyến đường</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        {routeId && (
          <Text style={styles.detailText}>
            <Text style={styles.label}>ID Tuyến đường:</Text> {routeId}
          </Text>
        )}
        {recommendedMode && (
          <Text style={styles.detailText}>
            <Text style={styles.label}>Phương tiện đề xuất:</Text>{" "}
            {recommendedMode}
          </Text>
        )}
        {healthScore !== null && healthScore !== -1 && (
          <Text style={styles.detailText}>
            <Text style={styles.label}>Điểm sức khỏe:</Text>{" "}
            <Text
              style={[
                styles.healthScoreText,
                { color: getHealthScoreColor(healthScore) },
              ]}
            >
              {healthScore.toFixed(1)}
            </Text>
          </Text>
        )}
        {distance !== null && distance !== undefined && (
          <Text style={styles.detailText}>
            <Text style={styles.label}>Tổng khoảng cách:</Text>{" "}
            {(distance / 1000).toFixed(2)} km
          </Text>
        )}
        {estimatedTime !== null && estimatedTime !== undefined && (
          <Text style={styles.detailText}>
            <Text style={styles.label}>Thời gian ước tính:</Text>{" "}
            {Math.ceil(estimatedTime / 60)} phút
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    width: 250, // Adjust width as needed
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#888",
  },
  body: {},
  detailText: {
    fontSize: 14,
    marginBottom: 4,
    color: "#555",
  },
  label: {
    fontWeight: "bold",
    color: "#333",
  },
  healthScoreText: {
    fontWeight: "bold",
  },
});

export default RouteCallout;
