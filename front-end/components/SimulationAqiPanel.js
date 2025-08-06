// SimulationAqiPanel.js
import React, { useState } from "react";
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

const SimulationAqiPanel = ({ data, onClose, onApplyAqiSimulation }) => {
  // Lấy kinh độ và vĩ độ từ mảng coordinates
  const currentLon = data.coordinates ? data.coordinates[0] : null;
  const currentLat = data.coordinates ? data.coordinates[1] : null;

  // State cho các tham số mô phỏng mà người dùng sẽ nhập
  const [aqi, setAqi] = useState(
    data.aqi !== undefined && data.aqi !== null
      ? Math.round(data.aqi).toString()
      : "50"
  );
  const [pm25, setPm25] = useState(
    data.pm25 !== undefined && data.pm25 !== null
      ? data.pm25.toFixed(1)
      : "25.0"
  );
  const [pm10, setPm10] = useState(
    data.pm10 !== undefined && data.pm10 !== null
      ? data.pm10.toFixed(1)
      : "50.0"
  );
  const [co, setCo] = useState(
    data.co !== undefined && data.co !== null ? data.co.toFixed(1) : "5.0"
  );
  const [no2, setNo2] = useState(
    data.no2 !== undefined && data.no2 !== null ? data.no2.toFixed(1) : "10.0"
  );
  const [so2, setSo2] = useState(
    data.so2 !== undefined && data.so2 !== null ? data.so2.toFixed(1) : "5.0"
  );
  const [o3, setO3] = useState(
    data.o3 !== undefined && data.o3 !== null ? data.o3.toFixed(1) : "10.0"
  );
  const [radiusKm, setRadiusKm] = useState("5.0");
  const [simulationName, setSimulationName] = useState(
    `Mô phỏng AQI ${data.stationName || data.stationUid}`
  );

  const handleApply = () => {
    // Xác thực đầu vào
    const parsedAqi = parseFloat(aqi);
    const parsedPm25 = parseFloat(pm25);
    const parsedPm10 = parseFloat(pm10);
    const parsedCo = parseFloat(co);
    const parsedNo2 = parseFloat(no2);
    const parsedSo2 = parseFloat(so2);
    const parsedO3 = parseFloat(o3);
    const parsedRadiusKm = parseFloat(radiusKm);

    const showAlert = (title, message) => {
      Alert.alert(title, message);
    };

    if (isNaN(parsedAqi) || parsedAqi < 0) {
      showAlert("Lỗi", "AQI phải là số không âm.");
      return;
    }
    if (isNaN(parsedPm25) || parsedPm25 < 0) {
      showAlert("Lỗi", "PM2.5 phải là số không âm.");
      return;
    }
    if (isNaN(parsedPm10) || parsedPm10 < 0) {
      showAlert("Lỗi", "PM10 phải là số không âm.");
      return;
    }
    if (isNaN(parsedCo) || parsedCo < 0) {
      showAlert("Lỗi", "CO phải là số không âm.");
      return;
    }
    if (isNaN(parsedNo2) || parsedNo2 < 0) {
      showAlert("Lỗi", "NO2 phải là số không âm.");
      return;
    }
    if (isNaN(parsedSo2) || parsedSo2 < 0) {
      showAlert("Lỗi", "SO2 phải là số không âm.");
      return;
    }
    if (isNaN(parsedO3) || parsedO3 < 0) {
      showAlert("Lỗi", "O3 phải là số không âm.");
      return;
    }
    if (isNaN(parsedRadiusKm) || parsedRadiusKm <= 0) {
      showAlert("Lỗi", "Bán kính (Km) phải là số dương.");
      return;
    }
    if (!simulationName.trim()) {
      showAlert("Lỗi", "Tên mô phỏng không được để trống.");
      return;
    }
    if (currentLon === null || currentLat === null) {
      showAlert("Lỗi", "Không thể xác định tọa độ để mô phỏng.");
      return;
    }

    onApplyAqiSimulation({
      lon: currentLon, // Kinh độ của trạm
      lat: currentLat, // Vĩ độ của trạm
      aqi: parsedAqi,
      pm25: parsedPm25,
      pm10: parsedPm10,
      co: parsedCo,
      no2: parsedNo2,
      so2: parsedSo2,
      o3: parsedO3,
      radiusKm: parsedRadiusKm,
      simulationName: simulationName.trim(),
    });
  };

  return (
    <View style={panelStyles.panelContainer}>
      <ScrollView contentContainerStyle={panelStyles.scrollContent}>
        <Text style={panelStyles.title}>Cấu hình Mô phỏng AQI</Text>
        {/* Hiển thị thông tin trạm AQI đã biết từ prop 'data' */}
        <View style={panelStyles.infoSection}>
          <Text style={panelStyles.detailTitle}>Thông tin trạm:</Text>
          {/* <Text style={panelStyles.detail}>ID: {data.stationUid}</Text> */}
          <Text style={panelStyles.detail}>Tên: {data.stationName}</Text>
          {/* Hiển thị kinh độ và vĩ độ từ data.coordinates */}
          <Text style={panelStyles.detail}>
            Kinh độ: {currentLon !== null ? currentLon.toFixed(4) : "N/A"}
          </Text>
          <Text style={panelStyles.detail}>
            Vĩ độ: {currentLat !== null ? currentLat.toFixed(4) : "N/A"}
          </Text>
          <Text style={panelStyles.detail}>
            AQI hiện tại:{" "}
            {data.aqi !== undefined && data.aqi !== null
              ? Math.round(data.aqi)
              : "N/A"}
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
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Giá trị AQI */}
        <Text style={panelStyles.label}>Giá trị AQI:</Text>
        <TextInput
          style={panelStyles.input}
          value={aqi}
          onChangeText={(text) => setAqi(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="Ví dụ: 50"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Giá trị PM2.5 */}
        <Text style={panelStyles.label}>Giá trị PM2.5 (µg/m³):</Text>
        <TextInput
          style={panelStyles.input}
          value={pm25}
          onChangeText={(text) => setPm25(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="Ví dụ: 25.0"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Giá trị PM10 */}
        <Text style={panelStyles.label}>Giá trị PM10 (µg/m³):</Text>
        <TextInput
          style={panelStyles.input}
          value={pm10}
          onChangeText={(text) => setPm10(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="Ví dụ: 50.0"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Giá trị CO */}
        <Text style={panelStyles.label}>Giá trị CO (ppm):</Text>
        <TextInput
          style={panelStyles.input}
          value={co}
          onChangeText={(text) => setCo(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="Ví dụ: 5.0"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Giá trị NO2 */}
        <Text style={panelStyles.label}>Giá trị NO2 (ppb):</Text>
        <TextInput
          style={panelStyles.input}
          value={no2}
          onChangeText={(text) => setNo2(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="Ví dụ: 10.0"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Giá trị SO2 */}
        <Text style={panelStyles.label}>Giá trị SO2 (ppb):</Text>
        <TextInput
          style={panelStyles.input}
          value={so2}
          onChangeText={(text) => setSo2(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="Ví dụ: 5.0"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Giá trị O3 */}
        <Text style={panelStyles.label}>Giá trị O3 (ppb):</Text>
        <TextInput
          style={panelStyles.input}
          value={o3}
          onChangeText={(text) => setO3(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="Ví dụ: 10.0"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Bán kính ảnh hưởng */}
        <Text style={panelStyles.label}>Bán kính ảnh hưởng (Km):</Text>
        <TextInput
          style={panelStyles.input}
          value={radiusKm}
          onChangeText={(text) => setRadiusKm(text.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          placeholder="Ví dụ: 5.0"
          placeholderTextColor="#999"
          {...(Platform.OS === "web" && { style: { outlineStyle: "none" } })}
        />

        {/* Nút Áp dụng và Đóng */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity
            style={[panelStyles.applyButton]}
            onPress={handleApply}
          >
            <Text style={panelStyles.applyButtonText}>Thêm Mô phỏng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[panelStyles.closeButton]} onPress={onClose}>
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
    borderRadius: 10,
    padding: 10,
    width: "80%",
    maxWidth: 320,
    // Shadows: React Native Web sẽ dịch các thuộc tính này thành boxShadow trên web
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8, // Android shadow
    maxHeight: "70%",
  },
  scrollContent: {
    paddingVertical: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2c3e50",
    textAlign: "center",
  },
  infoSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#34495e",
    marginBottom: 5,
  },
  detail: {
    fontSize: 13,
    color: "#555",
    marginBottom: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
    color: "#2c3e50",
  },
  input: {
    borderWidth: 1,
    borderColor: "#a0a0a0",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 10,
    color: "#34495e",
    backgroundColor: "#ffffff",
    // `outlineStyle: 'none'` được thêm trực tiếp vào TextInput bằng cách sử dụng prop `style`
    // với điều kiện Platform.OS === 'web'
  },
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
    fontSize: 15,
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
    color: "white", // Keep text color white
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SimulationAqiPanel;
