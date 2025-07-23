// SimulationConfigurationPanel.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert, // Giữ Alert cho native
  ScrollView,
  Modal, // Import Modal for the custom dropdown
  Platform, // Import Platform để kiểm tra môi trường
} from "react-native";

const SimulationTrafficPanel = ({ data, onClose, onApplySimulation }) => {
  const [vc, setVc] = useState(
    data.VC !== undefined && data.VC !== null ? data.VC.toFixed(2) : "0.50"
  );
  const [incident, setIncident] = useState("Không");
  const [simulationName, setSimulationName] = useState(
    `Mô phỏng ${data.name || data.id}`
  );
  const [isIncidentPickerVisible, setIsIncidentPickerVisible] = useState(false); // State for dropdown visibility

  const validIncidents = ["Không", "Tai nạn", "Đóng đường"];

  const handleApply = () => {
    const parsedVc = parseFloat(vc);

    // Hàm hiển thị cảnh báo tùy theo nền tảng
    const showAlert = (title, message) => {
      if (Platform.OS === "web") {
        window.alert(`${title}\n${message}`); // Sử dụng alert của trình duyệt cho web
      } else {
        Alert.alert(title, message); // Sử dụng Alert của React Native cho native
      }
    };

    if (isNaN(parsedVc) || parsedVc < 0 || parsedVc > 1) {
      showAlert("Lỗi", "VC phải là số từ 0 đến 1.");
      return;
    }
    if (!simulationName.trim()) {
      showAlert("Lỗi", "Tên mô phỏng không được để trống.");
      return;
    }
    if (!validIncidents.includes(incident)) {
      showAlert(
        "Lỗi",
        `Loại sự cố không hợp lệ. Phải là một trong: ${validIncidents.join(
          ", "
        )}.`
      );
      return;
    }

    onApplySimulation({
      routeId: data.id,
      fromnode: data.fromNode,
      tonode: data.toNode,
      VC: parsedVc,
      incident: incident,
      simulationName: simulationName.trim(),
    });
  };

  return (
    <View style={panelStyles.panelContainer}>
      <ScrollView contentContainerStyle={panelStyles.scrollContent}>
        <Text style={panelStyles.title}>Cấu hình Mô phỏng</Text>
        {/* Thông tin tuyến đường */}
        <View style={panelStyles.infoSection}>
          <Text style={panelStyles.detailTitle}>Tuyến đường:</Text>
          <Text style={panelStyles.detail}>ID: {data.id}</Text>

          {/* Có thể bỏ bớt các chi tiết khác nếu muốn nhỏ gọn hơn nữa */}
          <Text style={panelStyles.detail}>Từ nút: {data.fromNode}</Text>
          <Text style={panelStyles.detail}>Đến nút: {data.toNode}</Text>
          <Text style={panelStyles.detail}>
            Độ dài: {data.length ? `${data.length} km` : "N/A"}
          </Text>
        </View>

        {/* Tên mô phỏng */}
        <Text style={panelStyles.label}>Tên mô phỏng:</Text>
        <TextInput
          style={panelStyles.input}
          value={simulationName}
          onChangeText={setSimulationName}
          placeholder="Nhập tên mô phỏng"
          placeholderTextColor="#999"
          // Thêm style web để loại bỏ outline mặc định
          {...(Platform.OS === "web" && { style: panelStyles.webInputOutline })}
        />

        {/* Tỷ lệ VC */}
        <Text style={panelStyles.label}>Tỷ lệ VC (0-1):</Text>
        <TextInput
          style={panelStyles.input}
          value={vc}
          onChangeText={(text) => setVc(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="0.00 - 1.00"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: panelStyles.webInputOutline })}
        />

        {/* Loại sự cố (Combobox tùy chỉnh) */}
        <Text style={panelStyles.label}>Loại sự cố:</Text>
        <TouchableOpacity
          style={[panelStyles.dropdownButton, panelStyles.webCursorPointer]}
          onPress={() => setIsIncidentPickerVisible(true)}
        >
          <Text style={panelStyles.dropdownButtonText}>{incident}</Text>
          <Text style={panelStyles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        {/* Modal cho Combobox loại sự cố */}
        <Modal
          transparent={true}
          visible={isIncidentPickerVisible}
          onRequestClose={() => setIsIncidentPickerVisible(false)}
          animationType="fade"
        >
          <TouchableOpacity
            style={[panelStyles.modalOverlay, panelStyles.webCursorPointer]}
            onPress={() => setIsIncidentPickerVisible(false)} // Close when tapping outside
          >
            <View style={panelStyles.pickerContainer}>
              <ScrollView>
                {validIncidents.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      panelStyles.pickerItem,
                      panelStyles.webCursorPointer,
                    ]}
                    onPress={() => {
                      setIncident(type);
                      setIsIncidentPickerVisible(false);
                    }}
                  >
                    <Text style={panelStyles.pickerItemText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Nút Áp dụng và Đóng */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity
            style={[panelStyles.applyButton, panelStyles.webCursorPointer]}
            onPress={handleApply}
          >
            <Text style={panelStyles.applyButtonText}>Thêm Mô phỏng</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[panelStyles.closeButton, panelStyles.webCursorPointer]}
            onPress={onClose}
          >
            <Text style={panelStyles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  panelContainer: {
    backgroundColor: "white",
    borderRadius: 10, // Slightly less rounded for compactness
    padding: 10, // Reduced padding
    width: "80%", // Reduced width
    maxWidth: 320, // Reduced max-width
    // Shadows: React Native Web sẽ dịch các thuộc tính này thành boxShadow trên web
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 }, // More subtle shadow
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8, // Android shadow
    maxHeight: "70%", // Reduced max height
  },
  scrollContent: {
    paddingVertical: 5, // Reduced vertical padding for scrollable content
  },
  title: {
    fontSize: 18, // Smaller title
    fontWeight: "bold",
    marginBottom: 15, // Reduced space below title
    color: "#2c3e50",
    textAlign: "center",
  },
  infoSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 10, // Reduced padding
    marginBottom: 15, // Reduced margin below info section
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  detailTitle: {
    fontSize: 14, // Smaller font size
    fontWeight: "bold",
    color: "#34495e",
    marginBottom: 5, // Reduced margin
  },
  detail: {
    fontSize: 13, // Smaller font size
    color: "#555",
    marginBottom: 2, // Reduced margin
  },
  label: {
    fontSize: 15, // Smaller label
    fontWeight: "600",
    marginTop: 10, // Reduced space above labels
    marginBottom: 5, // Reduced margin
    color: "#2c3e50",
  },
  input: {
    borderWidth: 1,
    borderColor: "#a0a0a0",
    borderRadius: 8,
    padding: 10, // Reduced padding inside input
    fontSize: 15, // Smaller font size
    marginBottom: 10, // Reduced space below input
    color: "#34495e",
    backgroundColor: "#ffffff",
  },
  // Style riêng cho web để loại bỏ outline mặc định của TextInput
  webInputOutline: {
    outlineStyle: "none",
  },
  // Styles for the custom dropdown
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#a0a0a0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  dropdownButtonText: {
    fontSize: 15,
    color: "#34495e",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#555",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Darker overlay
  },
  pickerContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    width: "70%", // Adjust width of the picker modal
    maxHeight: "40%", // Max height for scrollable options
    // Shadows: React Native Web sẽ dịch các thuộc tính này thành boxShadow trên web
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Android shadow
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  pickerItemText: {
    fontSize: 16,
    color: "#34495e",
  },
  // End of custom dropdown styles
  applyButton: {
    width: "45%",
    backgroundColor: "#28a745",
    paddingVertical: 10, // Reduced padding
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15, // Reduced space above
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  applyButtonText: {
    color: "white",
    fontSize: 15, // Smaller font size
    fontWeight: "bold",
  },
  closeButton: {
    width: "45%",
    backgroundColor: "red",
    paddingVertical: 10, // Reduced padding
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15, // Reduced space above
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  closeButtonText: {
    color: "white",
    fontSize: 14, // Smaller font size
    fontWeight: "600",
  },
  // Style riêng cho web để thêm con trỏ pointer
  webCursorPointer: {
    cursor: "pointer",
  },
});

export default SimulationTrafficPanel;
