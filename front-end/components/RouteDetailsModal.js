import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";

const { width, height } = Dimensions.get("window");

const RouteDetailsModal = ({ isVisible, onClose, route }) => {
  if (!route) {
    return null;
  }

  // Example route structure from Mapbox Directions API response
  // route = {
  //   distance: 15000, // meters
  //   duration: 900, // seconds
  //   geometry: { type: 'LineString', coordinates: [[lon, lat], ...] },
  //   legs: [
  //     {
  //       steps: [
  //         { distance: 100, duration: 10, name: 'Quay đầu', maneuver: { type: 'turn', instruction: 'Quay đầu tại' } },
  //         { distance: 500, duration: 30, name: 'Đường A', maneuver: { type: 'depart', instruction: 'Đi thẳng' } },
  //         { distance: 200, duration: 15, name: 'Đường B', maneuver: { type: 'turn', instruction: 'Rẽ trái vào Đường B' } },
  //       ]
  //     }
  //   ]
  // }

  const totalDistanceKm = (route.distance / 1000).toFixed(1); // meters to km
  const totalDurationMinutes = (route.duration / 60).toFixed(0); // seconds to minutes

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chi tiết Lộ trình</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              Tổng khoảng cách: {totalDistanceKm} km
            </Text>
            <Text style={styles.summaryText}>
              Thời gian ước tính: {totalDurationMinutes} phút
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Chỉ dẫn từng bước:</Text>
          <ScrollView style={styles.stepsScrollView}>
            {route.legs &&
              route.legs.length > 0 &&
              route.legs[0].steps &&
              route.legs[0].steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <Text style={styles.stepIndex}>{index + 1}.</Text>
                  <View style={styles.stepDetails}>
                    <Text style={styles.stepInstruction}>
                      {step.maneuver.instruction}
                    </Text>
                    <Text style={styles.stepDistance}>
                      {step.distance.toFixed(0)}m
                    </Text>
                  </View>
                </View>
              ))}
            {(!route.legs ||
              route.legs.length === 0 ||
              !route.legs[0].steps) && (
              <Text style={styles.noStepsText}>
                Không có chỉ dẫn chi tiết cho lộ trình này.
              </Text>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              Alert.alert(
                "Bắt đầu điều hướng",
                "Chức năng điều hướng đang được phát triển!"
              );
              onClose();
            }}
          >
            <Text style={styles.startButtonText}>Bắt đầu Điều hướng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxHeight: height * 0.8, // Max height to ensure scrollability
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
  },
  summaryContainer: {
    backgroundColor: "#e0f7fa", // Light blue background
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#b2ebf2",
  },
  summaryText: {
    fontSize: 16,
    color: "#006064",
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  stepsScrollView: {
    flexGrow: 1, // Allow scroll view to expand
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  stepIndex: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007BFF",
    marginRight: 10,
    minWidth: 25, // Ensure alignment
    textAlign: "right",
  },
  stepDetails: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 16,
    color: "#333",
  },
  stepDistance: {
    fontSize: 14,
    color: "#777",
    marginTop: 2,
  },
  noStepsText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    paddingVertical: 20,
  },
  startButton: {
    backgroundColor: "#28a745", // Green start button
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  startButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default RouteDetailsModal;
