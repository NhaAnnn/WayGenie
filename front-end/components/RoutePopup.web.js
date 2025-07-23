import React from "react";
import { View, Text, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const RouteCallout = ({ data, onClose, onEdit }) => {
  const formatTsysset = (tsysset) => {
    const vehicleMap = {
      B2: "Xe buýt",
      BIKE: "Xe đạp",
      CAR: "Xe hơi",
      Co: "Xe khách",
      HGV: "Xe tải nặng",
      MC: "Xe máy",
      W: "Đi bộ",
    };
    return tsysset && tsysset !== "N/A"
      ? tsysset
          .split(",")
          .map((code) => vehicleMap[code] || code)
          .join(", ")
      : "N/A";
  };

  return (
    <View style={styles.calloutContainer}>
      <Text onPress={onClose} style={styles.closeButton}>
        [X]
      </Text>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="git-branch" size={20} color="#fff" />
          </View>
          <Text style={styles.headerText}>Thông tin tuyến đường</Text>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle" size={16} color="#4b5563" />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Link No: </Text>
              {data.linkNo || "N/A"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="log-in" size={16} color="#4b5563" />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Node đi: </Text>
              {data.fromNodeNo || "N/A"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="log-out" size={16} color="#4b5563" />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Node đến: </Text>
              {data.toNodeNo || "N/A"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="speedometer" size={16} color="#4b5563" />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>VC: </Text>
              {data.vc || "N/A"}
            </Text>
          </View>
          {/* <View style={styles.infoItem}>
            <Ionicons name="car" size={16} color="#4b5563" />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Phương tiện: </Text>
              {formatTsysset(data.tsysset)}
            </Text>
          </View> */}
        </View>
        {onEdit && (
          <View style={styles.footer}>
            <TouchableWithoutFeedback onPress={() => onEdit(data)}>
              <View style={styles.editButton}>
                <Text style={styles.editButtonText}>Chỉnh sửa</Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        )}
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
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  editButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default RouteCallout;
