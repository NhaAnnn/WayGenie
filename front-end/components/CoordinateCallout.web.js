import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CoordinateCallout = ({ data, onClose }) => {
  return (
    <View style={styles.calloutContainer}>
      <Text onPress={onClose} style={styles.closeButton}>
        [X]
      </Text>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="location" size={20} color="#fff" />
          </View>
          <Text style={styles.headerText}>Thông tin vị trí</Text>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle" size={16} color="#4b5563" />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>ID: </Text>
              {data.node_id || data.nodeId || "N/A"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="map" size={16} color="#4b5563" />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Tọa độ: </Text>
              {data.coordinates
                ? `${data.coordinates[0].toFixed(
                    6
                  )}, ${data.coordinates[1].toFixed(6)}`
                : "N/A"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: 250,
  },
  closeButton: {
    margin: 3,
    color: "red",
    textAlign: "right",
    fontWeight: "bold",
    backgroundColor: "white",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
    alignSelf: "flex-end",
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  infoContainer: {
    padding: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    color: "#374151",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  infoLabel: {
    fontWeight: "600",
    color: "#111827",
  },
});

export default CoordinateCallout;
