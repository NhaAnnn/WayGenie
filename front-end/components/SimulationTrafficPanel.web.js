// SimulationConfigurationPanel.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker"; // Đảm bảo đã import
import { Ionicons } from "@expo/vector-icons";

const SimulationTrafficPanel = ({ data, onClose, onApplySimulation }) => {
  const [vc, setVc] = useState(
    data.VC !== undefined && data.VC !== null ? data.VC.toFixed(2) : "0.50"
  );
  const [simulationName, setSimulationName] = useState(
    `Mô phỏng ${data.name || data.id}`
  );

  // States để quản lý trạng thái focus của TextInput
  const [isSimulationNameFocused, setIsSimulationNameFocused] = useState(false);
  const [isVcFocused, setIsVcFocused] = useState(false);

  // States cho DropDownPicker
  const [openIncidentPicker, setOpenIncidentPicker] = useState(false);
  const [incident, setIncident] = useState("Không");
  const [incidentItems, setIncidentItems] = useState([
    { label: "Không", value: "Không" },
    { label: "Tai nạn", value: "Tai nạn" },
    { label: "Đóng đường", value: "Đóng đường" },
  ]);

  const handleApply = () => {
    const parsedVc = parseFloat(vc);

    const showAlert = (title, message) => {
      Platform.OS === "web"
        ? window.alert(`${title}\n${message}`)
        : Alert.alert(title, message);
    };

    if (isNaN(parsedVc) || parsedVc < 0 || parsedVc > 1) {
      showAlert("Lỗi", "VC phải là số từ 0 đến 1.");
      return;
    }
    if (!simulationName.trim()) {
      showAlert("Lỗi", "Tên mô phỏng không được để trống.");
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
        <TouchableOpacity style={[panelStyles.toggleButton]} onPress={onClose}>
          <Ionicons name={"arrow-down"} size={24} color="#3366dd" />
        </TouchableOpacity>
        <Text style={panelStyles.title}>Cấu hình Mô phỏng</Text>

        {/* Thông tin tuyến đường */}
        <View style={panelStyles.infoSection}>
          <Text style={panelStyles.detailTitle}>Thông tin Tuyến đường:</Text>
          <Text style={panelStyles.detail}>ID: {data.id}</Text>
          <Text style={panelStyles.detail}>Từ nút: {data.fromNode}</Text>
          <Text style={panelStyles.detail}>Đến nút: {data.toNode}</Text>
          <Text style={panelStyles.detail}>
            Độ dài: {data.length ? `${data.length} km` : "N/A"}
          </Text>
        </View>

        {/* Tên mô phỏng */}
        <Text style={panelStyles.label}>Tên mô phỏng:</Text>
        <TextInput
          style={[
            panelStyles.input,
            isSimulationNameFocused && panelStyles.inputFocused,
          ]}
          value={simulationName}
          onChangeText={setSimulationName}
          placeholder="Ví dụ: Mô phỏng kẹt xe đường XYZ"
          placeholderTextColor="#a0a0a0" // Màu placeholder nhạt hơn
          onFocus={() => setIsSimulationNameFocused(true)}
          onBlur={() => setIsSimulationNameFocused(false)}
        />

        {/* Tỷ lệ VC */}
        <Text style={panelStyles.label}>Tỷ lệ VC (0-1):</Text>
        <TextInput
          style={[panelStyles.input, isVcFocused && panelStyles.inputFocused]}
          value={vc}
          onChangeText={(text) => setVc(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="0.00 - 1.00 (ví dụ: 0.75)"
          placeholderTextColor="#a0a0a0"
          onFocus={() => setIsVcFocused(true)}
          onBlur={() => setIsVcFocused(false)}
        />

        {/* Loại sự cố (Sử dụng DropDownPicker) */}
        <Text style={panelStyles.label}>Loại sự cố:</Text>
        <DropDownPicker
          open={openIncidentPicker}
          value={incident}
          items={incidentItems}
          setOpen={setOpenIncidentPicker}
          setValue={setIncident}
          setItems={setIncidentItems}
          style={[
            panelStyles.dropdownPickerStyle,
            openIncidentPicker && panelStyles.inputFocused,
          ]}
          containerStyle={panelStyles.dropdownContainerStyle}
          textStyle={panelStyles.dropdownTextStyle}
          dropDownContainerStyle={panelStyles.dropdownListStyle}
          labelStyle={panelStyles.dropdownLabelStyle}
          listItemLabelStyle={panelStyles.dropdownListItemLabelStyle}
          placeholder="Chọn loại sự cố"
          placeholderStyle={panelStyles.dropdownPlaceholderStyle}
          zIndex={3000}
          zIndexInverse={1000}
        />

        {/* Nút Áp dụng và Đóng */}
        <View style={panelStyles.buttonContainer}>
          <TouchableOpacity
            style={[panelStyles.applyButton, panelStyles.webCursorPointer]}
            onPress={handleApply}
          >
            <Text style={panelStyles.applyButtonText}>Thêm Mô phỏng</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  panelContainer: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "28%",
    height: "100%",
    right: 0,
    top: 0,
    bottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  scrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 25,
    color: "#2c3e50",
    textAlign: "center",
  },
  infoSection: {
    backgroundColor: "#f8fafd",
    borderRadius: 12,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e3e6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#34495e",
    marginBottom: 10,
  },
  detail: {
    fontSize: 15,
    color: "#555",
    marginBottom: 6,
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 8,
    color: "#2c3e50",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
    backgroundColor: "#ffffff",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocused: {
    borderColor: "#4a90e2",
    shadowColor: "#4a90e2",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  dropdownPickerStyle: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: Platform.OS === "ios" ? 14 : 0,
    paddingHorizontal: 15,
    minHeight: 50,
  },
  dropdownContainerStyle: {
    marginBottom: 20,
    zIndex: 3000,
  },
  dropdownTextStyle: {
    fontSize: 16,
    color: "#333",
  },
  dropdownListStyle: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 5,
  },
  dropdownLabelStyle: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownListItemLabelStyle: {
    color: "#333",
  },
  dropdownPlaceholderStyle: {
    color: "#a0a0a0",
  },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  applyButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
  closeButton: {
    flex: 1,
    backgroundColor: "#dc3545",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 10,
    shadowColor: "#dc3545",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  closeButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
  webCursorPointer: {
    cursor: "pointer",
  },
  toggleButton: {
    position: "absolute",
    top: 10,
    zIndex: 20,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default SimulationTrafficPanel;
