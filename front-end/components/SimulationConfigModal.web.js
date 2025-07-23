import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Switch,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { BACKEND_API_BASE_URL } from "../secrets";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const SimulationConfigPanel = ({ isVisible, onClose, onSimulationApplied }) => {
  const navigation = useNavigation();
  const { authToken, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeAqiSimulations, setActiveAqiSimulations] = useState([]);
  const [activeTrafficSimulations, setActiveTrafficSimulations] = useState([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState(null);
  const [editingSimulationId, setEditingSimulationId] = useState(null);
  const [editingAqiLon, setEditingAqiLon] = useState("");
  const [editingAqiLat, setEditingAqiLat] = useState("");
  const [editingAqiPm25, setEditingAqiPm25] = useState("");
  const [editingAqiRadius, setEditingAqiRadius] = useState("");
  const [editingAqiCo, setEditingAqiCo] = useState("");
  const [editingAqiNo2, setEditingAqiNo2] = useState("");
  const [editingAqiSo2, setEditingAqiSo2] = useState("");
  const [editingAqiO3, setEditingAqiO3] = useState("");
  const [editingAqiSimulationName, setEditingAqiSimulationName] = useState("");
  const [editingTrafficFromNode, setEditingTrafficFromNode] = useState("");
  const [editingTrafficToNode, setEditingTrafficToNode] = useState("");
  const [editingTrafficVc, setEditingTrafficVc] = useState("");
  const [editingTrafficIncident, setEditingTrafficIncident] = useState("");
  const [editingTrafficSimulationName, setEditingTrafficSimulationName] =
    useState("");

  const getAuthHeaders = () => {
    if (!authToken) {
      throw new Error("No token found");
    }
    return {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
  };

  const handleAuthError = async (error) => {
    const errorMsg =
      error.response?.status === 401 || error.message.includes("token")
        ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
        : error.response?.data?.error || "Đã xảy ra lỗi. Vui lòng thử lại.";
    setErrorMessage(errorMsg);
    Alert.alert("Lỗi", errorMsg, [
      {
        text: "OK",
        onPress: async () => {
          await logout();
          onClose();
          navigation.navigate("Login");
        },
      },
    ]);
  };

  const fetchActiveSimulations = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const config = getAuthHeaders();
      const response = await axios.get(
        `${BACKEND_API_BASE_URL}/simulate`,
        config
      );
      const simulations = response.data.simulations || [];
      setActiveAqiSimulations(
        simulations.filter((sim) => sim.simulation_type === "aqi")
      );
      setActiveTrafficSimulations(
        simulations.filter((sim) => sim.simulation_type === "traffic")
      );
    } catch (error) {
      console.error(
        "Error fetching user simulations:",
        error.response?.data || error.message
      );
      await handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      if (authToken) {
        fetchActiveSimulations();
      } else {
        setErrorMessage("Vui lòng đăng nhập để tiếp tục.");
        Alert.alert("Lỗi", "Vui lòng đăng nhập để tiếp tục.", [
          {
            text: "OK",
            onPress: () => {
              onClose();
              navigation.navigate("Login");
            },
          },
        ]);
      }
    } else {
      resetEditingFields();
      setErrorMessage(null);
      setActiveAqiSimulations([]);
      setActiveTrafficSimulations([]);
      setSelectedSimulationId(null);
      setEditingSimulationId(null);
    }
  }, [isVisible, authToken]);

  const resetEditingFields = () => {
    setEditingSimulationId(null);
    setEditingAqiLon("");
    setEditingAqiLat("");
    setEditingAqiPm25("");
    setEditingAqiRadius("");
    setEditingAqiCo("");
    setEditingAqiNo2("");
    setEditingAqiSo2("");
    setEditingAqiO3("");
    setEditingAqiSimulationName("");
    setEditingTrafficFromNode("");
    setEditingTrafficToNode("");
    setEditingTrafficVc("");
    setEditingTrafficIncident("");
    setEditingTrafficSimulationName("");
  };

  const handleUpdateSimulation = async (item) => {
    if (!editingSimulationId) {
      Alert.alert("Lỗi", "Không có mô phỏng nào đang được chỉnh sửa.");
      return;
    }

    const isAqi = item.simulation_type === "aqi";
    let payload;
    if (isAqi) {
      if (
        !editingAqiLon ||
        !editingAqiLat ||
        !editingAqiPm25 ||
        !editingAqiRadius ||
        !editingAqiSimulationName
      ) {
        Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc.");
        return;
      }
      const parsedLon = parseFloat(editingAqiLon);
      const parsedLat = parseFloat(editingAqiLat);
      const parsedPm25 = parseFloat(editingAqiPm25);
      const parsedRadius = parseFloat(editingAqiRadius);
      const parsedCo = editingAqiCo ? parseFloat(editingAqiCo) : null;
      const parsedNo2 = editingAqiNo2 ? parseFloat(editingAqiNo2) : null;
      const parsedSo2 = editingAqiSo2 ? parseFloat(editingAqiSo2) : null;
      const parsedO3 = editingAqiO3 ? parseFloat(editingAqiO3) : null;
      if (
        isNaN(parsedLon) ||
        isNaN(parsedLat) ||
        isNaN(parsedPm25) ||
        isNaN(parsedRadius)
      ) {
        Alert.alert(
          "Lỗi",
          "Kinh độ, Vĩ độ, PM2.5, và Bán kính phải là số hợp lệ."
        );
        return;
      }
      if (
        parsedRadius <= 0 ||
        parsedPm25 < 0 ||
        (parsedCo !== null && parsedCo < 0) ||
        (parsedNo2 !== null && parsedNo2 < 0) ||
        (parsedSo2 !== null && parsedSo2 < 0) ||
        (parsedO3 !== null && parsedO3 < 0)
      ) {
        Alert.alert(
          "Lỗi",
          "Bán kính và các chỉ số không thể âm hoặc bán kính phải lớn hơn 0."
        );
        return;
      }
      payload = {
        simulationName: editingAqiSimulationName,
        simulation_data: {
          lon: parsedLon,
          lat: parsedLat,
          pm25: parsedPm25,
          radiusKm: parsedRadius,
          co: parsedCo,
          no2: parsedNo2,
          so2: parsedSo2,
          o3: parsedO3,
        },
        simulation_type: "aqi",
      };
    } else {
      if (
        !editingTrafficFromNode ||
        !editingTrafficToNode ||
        !editingTrafficVc ||
        !editingTrafficIncident ||
        !editingTrafficSimulationName
      ) {
        Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
        return;
      }
      const parsedFromNode = parseInt(editingTrafficFromNode);
      const parsedToNode = parseInt(editingTrafficToNode);
      const parsedVc = parseFloat(editingTrafficVc);
      const parsedIncident = editingTrafficIncident;
      if (isNaN(parsedFromNode) || isNaN(parsedToNode) || isNaN(parsedVc)) {
        Alert.alert("Lỗi", "FROMNODENO, TONODENO, và VC phải là số hợp lệ.");
        return;
      }
      if (parsedVc < 0 || parsedVc > 1) {
        Alert.alert("Lỗi", "VC phải nằm trong khoảng 0 đến 1.");
        return;
      }
      payload = {
        simulationName: editingTrafficSimulationName,
        simulation_data: {
          fromNode: parsedFromNode,
          toNode: parsedToNode,
          VC: parsedVc,
          incident: parsedIncident,
        },
        simulation_type: "traffic",
      };
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const config = getAuthHeaders();
      const response = await axios.put(
        `${BACKEND_API_BASE_URL}/simulate/${editingSimulationId}`,
        payload,
        config
      );
      const updatedSimulation = response.data.simulation;
      Alert.alert(
        "Thành công",
        `Đã cập nhật mô phỏng ${isAqi ? "AQI" : "tuyến đường"}.`
      );

      if (isAqi) {
        setActiveAqiSimulations((prev) =>
          prev.map((sim) =>
            sim._id === updatedSimulation._id ? updatedSimulation : sim
          )
        );
      } else {
        setActiveTrafficSimulations((prev) =>
          prev.map((sim) =>
            sim._id === updatedSimulation._id ? updatedSimulation : sim
          )
        );
      }

      if (onSimulationApplied) onSimulationApplied();
      resetEditingFields();
    } catch (error) {
      console.error(
        `Lỗi khi cập nhật mô phỏng ${isAqi ? "AQI" : "tuyến đường"}:`,
        error.response?.data || error.message
      );
      if (error.response?.status === 400) {
        Alert.alert(
          "Lỗi",
          error.response.data.error || "Dữ liệu không hợp lệ."
        );
      } else {
        await handleAuthError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn đặt lại TẤT CẢ mô phỏng của mình không? Thao tác này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đặt lại",
          onPress: async () => {
            setIsLoading(true);
            setErrorMessage(null);
            try {
              const config = getAuthHeaders();
              await axios.delete(
                `${BACKEND_API_BASE_URL}/simulate/reset`,
                config
              );
              Alert.alert(
                "Thành công",
                "Đã đặt lại tất cả dữ liệu mô phỏng của bạn."
              );
              await fetchActiveSimulations();
              if (onSimulationApplied) onSimulationApplied();
              resetEditingFields();
            } catch (error) {
              console.error(
                "Lỗi khi đặt lại mô phỏng:",
                error.response?.data || error.message
              );
              await handleAuthError(error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveSimulation = async (simulationId, isAqi) => {
    console.log("handleRemoveSimulation called:", { simulationId, isAqi });
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa mô phỏng ${
        isAqi ? "AQI" : "tuyến đường"
      } này không?`
    );
    if (confirmed) {
      console.log("Confirmed deletion for ID:", simulationId);
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const config = getAuthHeaders();
        console.log("Auth Token:", authToken);
        console.log(
          "DELETE URL:",
          `${BACKEND_API_BASE_URL}/simulate/${simulationId}`
        );
        const response = await axios.delete(
          `${BACKEND_API_BASE_URL}/simulate/${simulationId}`,
          config
        );
        console.log("Delete response:", response.data);
        window.alert(`Đã xóa mô phỏng ${isAqi ? "AQI" : "tuyến đường"}.`);
        if (isAqi) {
          setActiveAqiSimulations((prev) => {
            const newState = prev.filter((sim) => sim._id !== simulationId);
            console.log("Updated AQI simulations:", newState);
            return newState;
          });
        } else {
          setActiveTrafficSimulations((prev) => {
            const newState = prev.filter((sim) => sim._id !== simulationId);
            console.log("Updated Traffic simulations:", newState);
            return newState;
          });
        }
        if (onSimulationApplied) onSimulationApplied();
        if (editingSimulationId === simulationId) {
          resetEditingFields();
        }
      } catch (error) {
        console.error(
          `Lỗi khi xóa mô phỏng ${isAqi ? "AQI" : "tuyến đường"}:`,
          error.response?.status,
          error.response?.data,
          error.message
        );
        if (error.response?.status === 404) {
          window.alert(
            error.response.data.error ||
              "Mô phỏng không tồn tại hoặc bạn không có quyền xóa."
          );
        } else if (error.response?.status === 401) {
          await handleAuthError(error);
        } else {
          window.alert(
            error.response?.data?.error || "Đã xảy ra lỗi khi xóa mô phỏng."
          );
        }
      } finally {
        setIsLoading(false);
        console.log("isLoading set to false");
      }
    } else {
      console.log("Deletion cancelled for ID:", simulationId);
    }
  };

  const handleToggleSimulationStatus = async (simulationId, currentStatus) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const config = getAuthHeaders();
      const response = await axios.put(
        `${BACKEND_API_BASE_URL}/simulate/${simulationId}/status`,
        { is_active: !currentStatus },
        config
      );
      const updatedSimulation = response.data.simulation;
      if (updatedSimulation.simulation_type === "aqi") {
        setActiveAqiSimulations((prev) =>
          prev.map((sim) =>
            sim._id === updatedSimulation._id ? updatedSimulation : sim
          )
        );
      } else {
        setActiveTrafficSimulations((prev) =>
          prev.map((sim) =>
            sim._id === updatedSimulation._id ? updatedSimulation : sim
          )
        );
      }
      if (onSimulationApplied) onSimulationApplied();
    } catch (error) {
      console.error(
        "Lỗi khi thay đổi trạng thái mô phỏng:",
        error.response?.data || error.message
      );
      await handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditingSimulation = (item) => {
    if (item.simulation_type === "aqi") {
      setEditingAqiLon(String(item.simulation_data.lon));
      setEditingAqiLat(String(item.simulation_data.lat));
      setEditingAqiPm25(String(item.simulation_data.pm25));
      setEditingAqiRadius(String(item.simulation_data.radiusKm));
      setEditingAqiCo(String(item.simulation_data.co || ""));
      setEditingAqiNo2(String(item.simulation_data.no2 || ""));
      setEditingAqiSo2(String(item.simulation_data.so2 || ""));
      setEditingAqiO3(String(item.simulation_data.o3 || ""));
      setEditingAqiSimulationName(item.simulation_name);
    } else {
      setEditingTrafficFromNode(String(item.simulation_data.fromNode));
      setEditingTrafficToNode(String(item.simulation_data.toNode));
      setEditingTrafficVc(String(item.simulation_data.VC || ""));
      setEditingTrafficIncident(String(item.simulation_data.incident || ""));
      setEditingTrafficSimulationName(item.simulation_name);
    }
    setEditingSimulationId(item._id);
  };

  const renderSimulationDetails = (item) => {
    const isEditing = editingSimulationId === item._id;
    const isAqi = item.simulation_type === "aqi";
    const updatedAt = new Date(item.updatedAt).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });

    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>
          {isEditing
            ? `Chỉnh sửa mô phỏng ${isAqi ? "AQI" : "tuyến đường"}`
            : "Chi tiết mô phỏng"}
        </Text>
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Tên mô phỏng:</Text>
          {isEditing ? (
            <TextInput
              style={styles.detailsInput}
              value={
                isAqi ? editingAqiSimulationName : editingTrafficSimulationName
              }
              onChangeText={
                isAqi
                  ? setEditingAqiSimulationName
                  : setEditingTrafficSimulationName
              }
              placeholder="Tên mô phỏng"
            />
          ) : (
            <Text style={styles.detailsText}>{item.simulation_name}</Text>
          )}
        </View>
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Loại:</Text>
          <Text style={styles.detailsText}>
            {isAqi ? "AQI" : "Tuyến đường"}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Trạng thái:</Text>
          <Text
            style={[
              styles.detailsText,
              { color: item.is_active ? "green" : "red" },
            ]}
          >
            {item.is_active ? "Bật" : "Tắt"}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Cập nhật lần cuối:</Text>
          <Text style={styles.detailsText}>{updatedAt}</Text>
        </View>
        {isAqi ? (
          <>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Kinh độ:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiLon}
                  onChangeText={setEditingAqiLon}
                  keyboardType="numeric"
                  placeholder="Kinh độ (Longitude)"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.lon?.toFixed(2)}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Vĩ độ:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiLat}
                  onChangeText={setEditingAqiLat}
                  keyboardType="numeric"
                  placeholder="Vĩ độ (Latitude)"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.lat?.toFixed(2)}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>PM2.5:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiPm25}
                  onChangeText={setEditingAqiPm25}
                  keyboardType="numeric"
                  placeholder="PM2.5"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.pm25}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>CO:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiCo}
                  onChangeText={setEditingAqiCo}
                  keyboardType="numeric"
                  placeholder="CO"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.co || "N/A"}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>NO2:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiNo2}
                  onChangeText={setEditingAqiNo2}
                  keyboardType="numeric"
                  placeholder="NO2"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.no2 || "N/A"}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>SO2:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiSo2}
                  onChangeText={setEditingAqiSo2}
                  keyboardType="numeric"
                  placeholder="SO2"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.so2 || "N/A"}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>O3:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiO3}
                  onChangeText={setEditingAqiO3}
                  keyboardType="numeric"
                  placeholder="O3"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.o3 || "N/A"}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Bán kính (km):</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiRadius}
                  onChangeText={setEditingAqiRadius}
                  keyboardType="numeric"
                  placeholder="Bán kính ảnh hưởng (Km)"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.radiusKm}
                </Text>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Nút bắt đầu (FROMNODENO):</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingTrafficFromNode}
                  onChangeText={setEditingTrafficFromNode}
                  keyboardType="numeric"
                  placeholder="Nút bắt đầu"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.fromNode}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Nút kết thúc (TONODENO):</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingTrafficToNode}
                  onChangeText={setEditingTrafficToNode}
                  keyboardType="numeric"
                  placeholder="Nút kết thúc"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.toNode}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Chỉ số ùn tắc (VC):</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingTrafficVc}
                  onChangeText={setEditingTrafficVc}
                  keyboardType="numeric"
                  placeholder="Chỉ số ùn tắc (0-1)"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.VC !== undefined
                    ? item.simulation_data.VC.toFixed(2)
                    : "N/A"}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Sự cố (Incident):</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingTrafficIncident}
                  onChangeText={setEditingTrafficIncident}
                  placeholder="Mô tả sự cố"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.incident || "N/A"}
                </Text>
              )}
            </View>
          </>
        )}
        <View style={styles.editButtonContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.smallButton, styles.updateButton]}
                onPress={() => handleUpdateSimulation(item)}
                disabled={isLoading}
              >
                <Text style={styles.smallButtonText}>Cập nhật</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, styles.closeDetailsButton]}
                onPress={resetEditingFields}
                disabled={isLoading}
              >
                <Text style={styles.smallButtonText}>Hủy</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.smallButton, styles.editButton]}
                onPress={() => startEditingSimulation(item)}
                disabled={isLoading}
              >
                <Text style={styles.smallButtonText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, styles.closeDetailsButton]}
                onPress={() => setSelectedSimulationId(null)}
                disabled={isLoading}
              >
                <Text style={styles.smallButtonText}>Ẩn chi tiết</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderActiveAqiStation = ({ item }) => (
    <View>
      <View style={styles.aqiStationCard}>
        <View style={styles.aqiStationInfo}>
          <Text style={styles.aqiStationTextBold}>{item.simulation_name}</Text>
          <Text style={styles.aqiStationText}>
            {item.simulation_data.lon?.toFixed(2)},
            {item.simulation_data.lat?.toFixed(2)} | PM2.5:
            {item.simulation_data.pm25} | {item.simulation_data.radiusKm} km
          </Text>
          <Text style={styles.aqiStationText}>
            CO: {item.simulation_data.co || "N/A"} | NO2:
            {item.simulation_data.no2 || "N/A"} | SO2:
            {item.simulation_data.so2 || "N/A"} | O3:
            {item.simulation_data.o3 || "N/A"}
          </Text>
          <Text style={styles.aqiStationText}>
            Cập nhật lần cuối:{" "}
            {new Date(item.updatedAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </Text>
          <View style={styles.statusToggleContainer}>
            <Text
              style={[
                styles.aqiStationText,
                { color: item.is_active ? "green" : "red" },
              ]}
            >
              {item.is_active ? "Bật" : "Tắt"}
            </Text>
            <View style={{ paddingLeft: 10, top: 3 }}>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={item.is_active ? "#767577" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={() =>
                  handleToggleSimulationStatus(item._id, item.is_active)
                }
                value={item.is_active}
                disabled={isLoading}
              />
            </View>
          </View>
        </View>
        <View style={styles.aqiStationActions}>
          <TouchableOpacity
            style={[styles.smallButton, styles.detailsButton]}
            onPress={() =>
              setSelectedSimulationId(
                selectedSimulationId === item._id ? null : item._id
              )
            }
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>
              {selectedSimulationId === item._id ? "Ẩn" : "Chi tiết"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.removeButton]}
            onPress={() => handleRemoveSimulation(item._id, true)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
      {selectedSimulationId === item._id && renderSimulationDetails(item)}
    </View>
  );

  const renderActiveTrafficSimulation = ({ item }) => (
    <View>
      <View style={styles.trafficSimCard}>
        <View style={styles.trafficSimInfo}>
          <Text style={styles.trafficSimTextBold}>{item.simulation_name}</Text>
          <Text style={styles.trafficSimText}>
            {item.simulation_data.fromNode} - {item.simulation_data.toNode}
          </Text>
          <Text style={styles.trafficSimText}>
            Chỉ số ùn tắc (VC):{" "}
            {item.simulation_data.VC !== undefined
              ? item.simulation_data.VC.toFixed(2)
              : "N/A"}
          </Text>
          <Text style={styles.trafficSimText}>
            Sự cố: {item.simulation_data.incident || "N/A"}
          </Text>
          <Text style={styles.trafficSimText}>
            Cập nhật lần cuối:{" "}
            {new Date(item.updatedAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </Text>
          <View style={styles.statusToggleContainer}>
            <Text
              style={[
                styles.trafficSimText,
                { color: item.is_active ? "green" : "red" },
              ]}
            >
              {item.is_active ? "Bật" : "Tắt"}
            </Text>
            <View style={{ paddingLeft: 10, top: 3 }}>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={item.is_active ? "#1783feff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={() =>
                  handleToggleSimulationStatus(item._id, item.is_active)
                }
                value={item.is_active}
                disabled={isLoading}
              />
            </View>
          </View>
        </View>
        <View style={styles.trafficSimActions}>
          <TouchableOpacity
            style={[styles.smallButton, styles.detailsButton]}
            onPress={() =>
              setSelectedSimulationId(
                selectedSimulationId === item._id ? null : item._id
              )
            }
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>
              {selectedSimulationId === item._id ? "Ẩn" : "Chi tiết"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.removeButton]}
            onPress={() => handleRemoveSimulation(item._id, false)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
      {selectedSimulationId === item._id && renderSimulationDetails(item)}
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.panel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.panelContent}
        >
          <TouchableOpacity style={[styles.toggleButton]} onPress={onClose}>
            <Ionicons name={"arrow-down"} size={24} color="#3366dd" />
          </TouchableOpacity>
          <Text style={styles.panelTitle}>Quản lý Mô Phỏng</Text>
          <ScrollView style={styles.scrollContainer}>
            {isLoading && (
              <ActivityIndicator
                size="large"
                color="#3498db"
                style={styles.loadingIndicator}
              />
            )}
            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}
            <View>
              <Text style={styles.subSectionTitle}>
                Trạm AQI đang hoạt động:
              </Text>
              {activeAqiSimulations.length > 0 ? (
                <FlatList
                  data={activeAqiSimulations}
                  renderItem={renderActiveAqiStation}
                  keyExtractor={(item) => item._id}
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noSimulationText}>
                  Chưa có trạm AQI mô phỏng nào.
                </Text>
              )}
              <View style={styles.separator} />
              <Text style={styles.subSectionTitle}>
                Mô phỏng Tuyến đường đang hoạt động:
              </Text>
              {activeTrafficSimulations.length > 0 ? (
                <FlatList
                  data={activeTrafficSimulations}
                  renderItem={renderActiveTrafficSimulation}
                  keyExtractor={(item) => item._id}
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noSimulationText}>
                  Chưa có mô phỏng tuyến đường nào.
                </Text>
              )}
              <TouchableOpacity
                style={styles.button}
                onPress={fetchActiveSimulations}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Tải lại mô phỏng</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleResetSimulation}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Đặt lại Tất cả Mô phỏng</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 12,
    // padding: 20,
    width: "28%",
    height: "100%",
    right: 0,
    top: 0,
    bottom: 0,
    // shadowColor: "#000",
    // shadowOffset: { width: -4, height: 0 },
    // shadowOpacity: 0.15,
    // shadowRadius: 10,
    // elevation: 10,
  },
  panelContent: {
    width: "100%", // Slightly less than panel width for padding
    height: "100%",
    // backgroundColor: "#ffffff",
    borderLeftWidth: 1,
    // borderLeftColor: "#ddd",
    // shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    padding: 20,
  },
  panelTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  loadingIndicator: {
    marginVertical: 15,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 8,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
    width: "100%",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: "#e74c3c",
  },
  closeButton: {
    backgroundColor: "#95a5a6",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 15,
  },
  footerButtons: {
    width: "100%",
    marginTop: 15,
  },
  aqiStationCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aqiStationInfo: {
    flex: 1,
  },
  aqiStationTextBold: {
    fontWeight: "600",
    fontSize: 15,
    color: "#34495e",
  },
  aqiStationText: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },
  aqiStationActions: {
    flexDirection: "row",
    marginLeft: 10,
  },
  trafficSimCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trafficSimInfo: {
    flex: 1,
  },
  trafficSimTextBold: {
    fontWeight: "600",
    fontSize: 15,
    color: "#34495e",
  },
  trafficSimText: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },
  trafficSimActions: {
    flexDirection: "row",
    marginLeft: 10,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  detailsButton: {
    backgroundColor: "#2ecc71",
  },
  editButton: {
    backgroundColor: "#f39c12",
  },
  removeButton: {
    backgroundColor: "#e74c3c",
  },
  updateButton: {
    backgroundColor: "#3498db",
  },
  closeDetailsButton: {
    backgroundColor: "#7f8c8d",
  },
  smallButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  statusToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  detailsContainer: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailsLabel: {
    fontWeight: "600",
    fontSize: 13,
    color: "#2c3e50",
    width: 150,
  },
  detailsText: {
    fontSize: 13,
    color: "#555",
    flex: 1,
  },
  detailsInput: {
    fontSize: 13,
    color: "#555",
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  editButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 10,
  },
  noSimulationText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginVertical: 10,
  },
  toggleButton: {
    position: "absolute",
    top: 15,
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

export default SimulationConfigPanel;
