import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const SimulationTrafficCallout = ({ data, onClose, onConfigureSimulation }) => {
  return (
    <View style={styles.calloutContainer}>
      <View style={styles.calloutContent}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Thông tin tuyến đường</Text>
        <Text style={styles.detail}>ID: {data.id}</Text>
        <Text style={styles.detail}>Từ nút: {data.fromNode ?? "N/A"}</Text>
        <Text style={styles.detail}>Đến nút: {data.toNode ?? "N/A"}</Text>
        <Text style={styles.detail}>
          Độ dài: {data.length ? `${data.length} km` : "N/A"}
        </Text>
        <Text style={styles.detail}>
          Trạng thái:
          {data.status === "smooth"
            ? "Thông thoáng"
            : data.status === "moderate"
            ? "Trung bình"
            : "Tắc nghẽn"}
        </Text>
        <Text style={styles.detail}>VC: {(data.VC || 0).toFixed(2)}</Text>
        {data.incidentType && (
          <>
            <Text style={styles.detail}>
              Sự cố:
              {data.incidentType === "accident" ? "Tai nạn" : "Đóng đường"}
            </Text>
            <Text style={styles.detail}>
              Mô tả: {data.incidentDescription ?? "N/A"}
            </Text>
            <Text style={styles.detail}>
              Mức độ: {data.incidentSeverity === "high" ? "Cao" : "Trung bình"}
            </Text>
          </>
        )}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={() => onConfigureSimulation(data.id)}
          >
            <Text style={styles.simulateButtonText}>Mô phỏng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  calloutContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    paddingTop: 40,
    width: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    position: "relative",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2c3e50",
    textAlign: "center",
  },
  detail: {
    fontSize: 14,
    color: "#4a4a4a",
    marginBottom: 8,
    lineHeight: 20,
  },
  buttonWrapper: {
    marginTop: 15,
    alignItems: "center",
  },
  simulateButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  simulateButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "red",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  closeButtonText: {
    fontWeight: "bold",
    color: "white",
    fontSize: 16,
  },
});

export default SimulationTrafficCallout;
