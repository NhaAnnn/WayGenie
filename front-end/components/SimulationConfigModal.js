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
  const [activeTab, setActiveTab] = useState("AQI");
  const [activeAqiSimulations, setActiveAqiSimulations] = useState([]);
  const [activeTrafficSimulations, setActiveTrafficSimulations] = useState([]);
  const [activeScenarios, setActiveScenarios] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingAqiLon, setEditingAqiLon] = useState("");
  const [editingAqiLat, setEditingAqiLat] = useState("");
  const [editingAqiPoint, setEditingAqiPoint] = useState("");
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
  const [editingScenarioName, setEditingScenarioName] = useState("");
  const [editingScenarioSimulations, setEditingScenarioSimulations] = useState(
    []
  );
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioSimulations, setNewScenarioSimulations] = useState([]);
  const [showCreateSimulationSelector, setShowCreateSimulationSelector] =
    useState(false);
  const [showEditSimulationSelector, setShowEditSimulationSelector] =
    useState(false);

  const getAuthHeaders = () => {
    if (!authToken) throw new Error("No token found");
    return { headers: { Authorization: `Bearer ${authToken}` } };
  };

  const fetchActiveSimulations = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const config = getAuthHeaders();
      const [simResponse, scenResponse] = await Promise.all([
        axios.get(`${BACKEND_API_BASE_URL}/simulate`, config),
        axios.get(`${BACKEND_API_BASE_URL}/scenarios`, config),
      ]);
      setActiveAqiSimulations(
        simResponse.data.simulations.filter(
          (sim) => sim.simulation_type === "aqi"
        )
      );
      setActiveTrafficSimulations(
        simResponse.data.simulations.filter(
          (sim) => sim.simulation_type === "traffic"
        )
      );
      setActiveScenarios(scenResponse.data.scenarios || []);
    } catch (error) {
      console.error(
        "Error fetching data:",
        error.response?.data || error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible && authToken) {
      fetchActiveSimulations();
    } else {
      resetEditingFields();
      setErrorMessage(null);
      setActiveAqiSimulations([]);
      setActiveTrafficSimulations([]);
      setActiveScenarios([]);
      setSelectedItemId(null);
      setEditingItemId(null);
      setNewScenarioSimulations([]);
      setShowCreateSimulationSelector(false);
      setShowEditSimulationSelector(false);
    }
  }, [isVisible, authToken]);

  const resetEditingFields = () => {
    setEditingItemId(null);
    setEditingAqiLon("");
    setEditingAqiLat("");
    setEditingAqiPoint("");
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
    setEditingScenarioName("");
    setEditingScenarioSimulations([]);
  };

  const handleCreateScenario = async () => {
    if (!newScenarioName) {
      Alert.alert("Lỗi", "Vui lòng nhập tên kịch bản.");
      return;
    }
    if (newScenarioSimulations.length === 0) {
      Alert.alert("Lỗi", "Vui lòng thêm ít nhất một mô phỏng vào kịch bản.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const config = getAuthHeaders();
      const payload = {
        name: newScenarioName,
        simulations: newScenarioSimulations.map((sim) => ({
          _id: sim._id,
          simulation_type: sim.simulation_type,
          simulation_name: sim.simulation_name,
          simulation_data: sim.simulation_data,
        })),
        is_active: false,
      };
      await axios.post(`${BACKEND_API_BASE_URL}/scenarios`, payload, config);
      Alert.alert("Thành công", "Đã tạo kịch bản mới.");
      await fetchActiveSimulations();
      if (onSimulationApplied) onSimulationApplied();
      setNewScenarioName("");
      setNewScenarioSimulations([]);
      setShowCreateSimulationSelector(false);
    } catch (error) {
      console.error(
        "Lỗi khi tạo kịch bản:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Lỗi",
        error.response?.data?.error || "Dữ liệu không hợp lệ."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSimulation = async (item) => {
    if (!editingItemId) {
      Alert.alert("Lỗi", "Không có mục nào đang được chỉnh sửa.");
      return;
    }
    if (item.simulation_type === "aqi") {
      if (
        !editingAqiLon ||
        !editingAqiLat ||
        !editingAqiPoint ||
        !editingAqiPm25 ||
        !editingAqiRadius ||
        !editingAqiSimulationName
      ) {
        Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc.");
        return;
      }
      const parsedLon = parseFloat(editingAqiLon);
      const parsedLat = parseFloat(editingAqiLat);
      const parsedPoint = parseFloat(editingAqiPoint);
      const parsedPm25 = parseFloat(editingAqiPm25);
      const parsedRadius = parseFloat(editingAqiRadius);
      const parsedCo = editingAqiCo ? parseFloat(editingAqiCo) : null;
      const parsedNo2 = editingAqiNo2 ? parseFloat(editingAqiNo2) : null;
      const parsedSo2 = editingAqiSo2 ? parseFloat(editingAqiSo2) : null;
      const parsedO3 = editingAqiO3 ? parseFloat(editingAqiO3) : null;
      if (
        isNaN(parsedLon) ||
        isNaN(parsedLat) ||
        isNaN(parsedPoint) ||
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
        parsedPoint < 0 ||
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
      const payload = {
        simulationName: editingAqiSimulationName,
        simulation_data: {
          lon: parsedLon,
          lat: parsedLat,
          aqi: parsedPoint,
          pm25: parsedPm25,
          radiusKm: parsedRadius,
          co: parsedCo,
          no2: parsedNo2,
          so2: parsedSo2,
          o3: parsedO3,
        },
        simulation_type: "aqi",
      };
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const config = getAuthHeaders();
        const response = await axios.put(
          `${BACKEND_API_BASE_URL}/simulate/${editingItemId}`,
          payload,
          config
        );
        const updatedSimulation = response.data.simulation;
        Alert.alert("Thành công", `Đã cập nhật mô phỏng AQI.`);
        setActiveAqiSimulations((prev) =>
          prev.map((sim) =>
            sim._id === updatedSimulation._id ? updatedSimulation : sim
          )
        );
        if (onSimulationApplied) onSimulationApplied();
        resetEditingFields();
      } catch (error) {
        console.error(
          "Lỗi khi cập nhật AQI:",
          error.response?.data || error.message
        );
        Alert.alert(
          "Lỗi",
          error.response?.data?.error || "Dữ liệu không hợp lệ."
        );
      } finally {
        setIsLoading(false);
      }
    } else if (item.simulation_type === "traffic") {
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
      if (isNaN(parsedFromNode) || isNaN(parsedToNode) || isNaN(parsedVc)) {
        Alert.alert("Lỗi", "FROMNODENO, TONODENO, và VC phải là số hợp lệ.");
        return;
      }
      if (parsedVc < 0 || parsedVc > 1) {
        Alert.alert("Lỗi", "VC phải nằm trong khoảng 0 đến 1.");
        return;
      }
      const payload = {
        simulationName: editingTrafficSimulationName,
        simulation_data: {
          fromNode: parsedFromNode,
          toNode: parsedToNode,
          VC: parsedVc,
          incident: editingTrafficIncident,
        },
        simulation_type: "traffic",
      };
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const config = getAuthHeaders();
        const response = await axios.put(
          `${BACKEND_API_BASE_URL}/simulate/${editingItemId}`,
          payload,
          config
        );
        const updatedSimulation = response.data.simulation;
        Alert.alert("Thành công", `Đã cập nhật mô phỏng tuyến đường.`);
        setActiveTrafficSimulations((prev) =>
          prev.map((sim) =>
            sim._id === updatedSimulation._id ? updatedSimulation : sim
          )
        );
        if (onSimulationApplied) onSimulationApplied();
        resetEditingFields();
      } catch (error) {
        console.error(
          "Lỗi khi cập nhật Traffic:",
          error.response?.data || error.message
        );
        Alert.alert(
          "Lỗi",
          error.response?.data?.error || "Dữ liệu không hợp lệ."
        );
      } finally {
        setIsLoading(false);
      }
    } else if (item.type === "scenario") {
      if (!editingScenarioName) {
        Alert.alert("Lỗi", "Vui lòng điền tên kịch bản.");
        return;
      }
      const payload = {
        name: editingScenarioName,
        simulations: editingScenarioSimulations.map((sim) => ({
          _id: sim._id,
          simulation_type: sim.simulation_type,
          simulation_name: sim.simulation_name,
          simulation_data: sim.simulation_data,
        })),
      };
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const config = getAuthHeaders();
        const response = await axios.put(
          `${BACKEND_API_BASE_URL}/scenarios/${editingItemId}`,
          payload,
          config
        );
        const updatedScenario = response.data.scenario;
        Alert.alert("Thành công", `Đã cập nhật kịch bản.`);
        setActiveScenarios((prev) =>
          prev.map((scen) =>
            scen._id === updatedScenario._id ? updatedScenario : scen
          )
        );
        if (onSimulationApplied) onSimulationApplied();
        resetEditingFields();
      } catch (error) {
        console.error(
          "Lỗi khi cập nhật Scenario:",
          error.response?.data || error.message
        );
        Alert.alert(
          "Lỗi",
          error.response?.data?.error || "Dữ liệu không hợp lệ."
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRemoveItem = async (itemId, isAqi, isTraffic, isScenario) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc muốn xóa ${
        isAqi ? "AQI" : isTraffic ? "tuyến đường" : "kịch bản"
      } này không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            setErrorMessage(null);
            try {
              const config = getAuthHeaders();
              const endpoint =
                isAqi || isTraffic
                  ? `${BACKEND_API_BASE_URL}/simulate/${itemId}`
                  : `${BACKEND_API_BASE_URL}/scenarios/${itemId}`;
              await axios.delete(endpoint, config);
              Alert.alert(
                "Thành công",
                `Đã xóa ${
                  isAqi ? "AQI" : isTraffic ? "tuyến đường" : "kịch bản"
                }.`
              );
              if (isAqi) {
                setActiveAqiSimulations((prev) =>
                  prev.filter((sim) => sim._id !== itemId)
                );
              } else if (isTraffic) {
                setActiveTrafficSimulations((prev) =>
                  prev.filter((sim) => sim._id !== itemId)
                );
              } else if (isScenario) {
                setActiveScenarios((prev) =>
                  prev.filter((scen) => scen._id !== itemId)
                );
              }
              if (onSimulationApplied) onSimulationApplied();
              if (editingItemId === itemId) resetEditingFields();
            } catch (error) {
              console.error(
                `Lỗi khi xóa ${
                  isAqi ? "AQI" : isTraffic ? "Traffic" : "Scenario"
                }:`,
                error.response?.data || error.message
              );
              Alert.alert(
                "Lỗi",
                error.response?.data?.error || "Đã xảy ra lỗi."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (itemId, currentStatus, isScenario) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const config = getAuthHeaders();
      const endpoint = isScenario
        ? `${BACKEND_API_BASE_URL}/scenarios/${itemId}/status`
        : `${BACKEND_API_BASE_URL}/simulate/${itemId}/status`;
      const response = await axios.put(
        endpoint,
        { is_active: !currentStatus },
        config
      );
      await fetchActiveSimulations();
      const updatedItem = response.data[isScenario ? "scenario" : "simulation"];
      if (isScenario) {
        setActiveScenarios((prev) =>
          prev.map((scen) =>
            scen._id === updatedItem._id ? updatedItem : scen
          )
        );
      } else if (updatedItem.simulation_type === "aqi") {
        setActiveAqiSimulations((prev) =>
          prev.map((sim) => (sim._id === updatedItem._id ? updatedItem : sim))
        );
      } else {
        setActiveTrafficSimulations((prev) =>
          prev.map((sim) => (sim._id === updatedItem._id ? updatedItem : sim))
        );
      }
      if (onSimulationApplied) onSimulationApplied();
    } catch (error) {
      console.error(
        "Lỗi khi thay đổi trạng thái:",
        error.response?.data || error.message
      );
      Alert.alert("Lỗi", "Không thể thay đổi trạng thái.");
    } finally {
      setIsLoading(false);
    }
  };

  const startEditingItem = (item) => {
    if (item.simulation_type === "aqi") {
      setEditingAqiLon(String(item.simulation_data.lon));
      setEditingAqiLat(String(item.simulation_data.lat));
      setEditingAqiPoint(String(item.simulation_data.aqi));
      setEditingAqiPm25(String(item.simulation_data.pm25));
      setEditingAqiRadius(String(item.simulation_data.radiusKm));
      setEditingAqiCo(String(item.simulation_data.co || ""));
      setEditingAqiNo2(String(item.simulation_data.no2 || ""));
      setEditingAqiSo2(String(item.simulation_data.so2 || ""));
      setEditingAqiO3(String(item.simulation_data.o3 || ""));
      setEditingAqiSimulationName(item.simulation_name);
    } else if (item.simulation_type === "traffic") {
      setEditingTrafficFromNode(String(item.simulation_data.fromNode));
      setEditingTrafficToNode(String(item.simulation_data.toNode));
      setEditingTrafficVc(String(item.simulation_data.VC || ""));
      setEditingTrafficIncident(String(item.simulation_data.incident || ""));
      setEditingTrafficSimulationName(item.simulation_name);
    } else if (item.type === "scenario") {
      setEditingScenarioName(item.name);
      setEditingScenarioSimulations(item.simulations || []);
    }
    setEditingItemId(item._id);
  };

  const renderItemDetails = (item) => {
    const isEditing = editingItemId === item._id;
    const isAqi = item.simulation_type === "aqi";
    const isTraffic = item.simulation_type === "traffic";
    const isScenario = item.type === "scenario";
    const updatedAt = new Date(
      item.updatedAt || item.updated_at
    ).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>
          {isEditing
            ? `Chỉnh sửa ${
                isAqi ? "AQI" : isTraffic ? "tuyến đường" : "kịch bản"
              }`
            : "Chi tiết"}
        </Text>
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Tên:</Text>
          {isEditing ? (
            <TextInput
              style={styles.detailsInput}
              value={
                isAqi
                  ? editingAqiSimulationName
                  : isTraffic
                  ? editingTrafficSimulationName
                  : editingScenarioName
              }
              onChangeText={
                isAqi
                  ? setEditingAqiSimulationName
                  : isTraffic
                  ? setEditingTrafficSimulationName
                  : setEditingScenarioName
              }
              placeholder="Tên"
            />
          ) : (
            <Text style={styles.detailsText}>
              {isAqi || isTraffic ? item.simulation_name : item.name}
            </Text>
          )}
        </View>
        {isAqi && (
          <>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Kinh độ:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiLon}
                  onChangeText={setEditingAqiLon}
                  keyboardType="numeric"
                  placeholder="Kinh độ"
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
                  placeholder="Vĩ độ"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.lat?.toFixed(2)}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>AQI:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingAqiPoint}
                  onChangeText={setEditingAqiPoint}
                  keyboardType="numeric"
                  placeholder="AQI"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.aqi}
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
                  placeholder="Bán kính"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.radiusKm}
                </Text>
              )}
            </View>
          </>
        )}
        {isTraffic && (
          <>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Nút bắt đầu:</Text>
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
              <Text style={styles.detailsLabel}>Nút kết thúc:</Text>
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
                  placeholder="VC"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.VC?.toFixed(2)}
                </Text>
              )}
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Sự cố:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailsInput}
                  value={editingTrafficIncident}
                  onChangeText={setEditingTrafficIncident}
                  placeholder="Sự cố"
                />
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulation_data.incident || "N/A"}
                </Text>
              )}
            </View>
          </>
        )}
        {isScenario && (
          <>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Danh sách mô phỏng:</Text>
              {isEditing ? (
                <View style={styles.simulationList}>
                  {editingScenarioSimulations.length > 0 ? (
                    <FlatList
                      data={editingScenarioSimulations}
                      renderItem={({ item }) => (
                        <View style={styles.simulationItem}>
                          <Text style={styles.simulationItemText}>
                            {item.simulation_name} ({item.simulation_type})
                          </Text>
                          <TouchableOpacity
                            style={[styles.smallButton, styles.removeButton]}
                            onPress={() =>
                              setEditingScenarioSimulations((prev) =>
                                prev.filter((sim) => sim._id !== item._id)
                              )
                            }
                            disabled={isLoading}
                          >
                            <Text style={styles.smallButtonText}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                    />
                  ) : (
                    <Text style={styles.noSimulationText}>
                      Chưa có mô phỏng nào được chọn.
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.smallButton, styles.addButton]}
                    onPress={() => setShowEditSimulationSelector(true)}
                    disabled={isLoading}
                  >
                    <Text style={styles.smallButtonText}>Thêm mô phỏng</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.detailsText}>
                  {item.simulations?.length > 0
                    ? item.simulations
                        .map((sim) => sim.simulation_name)
                        .join(", ")
                    : "Không có"}
                </Text>
              )}
            </View>
            {isEditing && showEditSimulationSelector && (
              <View style={styles.simulationSelector}>
                <Text style={styles.subSectionTitle}>Chọn mô phỏng</Text>
                <FlatList
                  data={[...activeAqiSimulations, ...activeTrafficSimulations]}
                  renderItem={({ item }) => (
                    <View style={styles.simulationItem}>
                      <Text style={styles.simulationItemText}>
                        {item.simulation_name} ({item.simulation_type})
                      </Text>
                      <TouchableOpacity
                        style={[styles.smallButton, styles.addButton]}
                        onPress={() => {
                          if (
                            !editingScenarioSimulations.some(
                              (sim) => sim._id === item._id
                            )
                          ) {
                            setEditingScenarioSimulations((prev) => [
                              ...prev,
                              item,
                            ]);
                          } else {
                            Alert.alert("Lỗi", "Mô phỏng này đã được thêm.");
                          }
                        }}
                        disabled={isLoading}
                      >
                        <Text style={styles.smallButtonText}>Thêm</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                />
                <TouchableOpacity
                  style={[styles.smallButton, styles.closeDetailsButton]}
                  onPress={() => setShowEditSimulationSelector(false)}
                  disabled={isLoading}
                >
                  <Text style={styles.smallButtonText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Trạng thái:</Text>
          <Text
            style={[
              styles.detailsText,
              { color: item.is_active || item.isActive ? "green" : "red" },
            ]}
          >
            {item.is_active || item.isActive ? "Bật" : "Tắt"}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Cập nhật lần cuối:</Text>
          <Text style={styles.detailsText}>{updatedAt}</Text>
        </View>
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
                onPress={() => startEditingItem(item)}
                disabled={isLoading}
              >
                <Text style={styles.smallButtonText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, styles.closeDetailsButton]}
                onPress={() => setSelectedItemId(null)}
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

  const renderAqiStation = ({ item }) => (
    <View>
      <View style={styles.aqiStationCard}>
        <View style={styles.aqiStationInfo}>
          <Text style={styles.aqiStationTextBold}>{item.simulation_name}</Text>
          <Text style={styles.aqiStationText}>
            {item.simulation_data.lon?.toFixed(2)},{" "}
            {item.simulation_data.lat?.toFixed(2)} | PM2.5:{" "}
            {item.simulation_data.pm25} | {item.simulation_data.radiusKm} km
          </Text>
          <Text style={styles.aqiStationText}>
            CO: {item.simulation_data.co || "N/A"} | NO2:{" "}
            {item.simulation_data.no2 || "N/A"} | SO2:{" "}
            {item.simulation_data.so2 || "N/A"} | O3:{" "}
            {item.simulation_data.o3 || "N/A"}
          </Text>
          <Text style={styles.aqiStationText}>
            Cập nhật:{" "}
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
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={item.is_active ? "#1783feff" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={() =>
                handleToggleStatus(item._id, item.is_active, false)
              }
              value={item.is_active}
              disabled={isLoading}
            />
          </View>
        </View>
        <View style={styles.aqiStationActions}>
          <TouchableOpacity
            style={[styles.smallButton, styles.detailsButton]}
            onPress={() =>
              setSelectedItemId(selectedItemId === item._id ? null : item._id)
            }
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>
              {selectedItemId === item._id ? "Ẩn" : "Chi tiết"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.removeButton]}
            onPress={() => handleRemoveItem(item._id, true, false, false)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Xóa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.addButton]}
            onPress={() => addSimulationToNewScenario(item)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Thêm</Text>
          </TouchableOpacity>
        </View>
      </View>
      {selectedItemId === item._id && renderItemDetails(item)}
    </View>
  );

  const renderTrafficSimulation = ({ item }) => (
    <View>
      <View style={styles.trafficSimCard}>
        <View style={styles.trafficSimInfo}>
          <Text style={styles.trafficSimTextBold}>{item.simulation_name}</Text>
          <Text style={styles.trafficSimText}>
            {item.simulation_data.fromNode} - {item.simulation_data.toNode}
          </Text>
          <Text style={styles.trafficSimText}>
            VC: {item.simulation_data.VC?.toFixed(2)}
          </Text>
          <Text style={styles.trafficSimText}>
            Sự cố: {item.simulation_data.incident || "N/A"}
          </Text>
          <Text style={styles.trafficSimText}>
            Cập nhật:{" "}
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
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={item.is_active ? "#1783feff" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={() =>
                handleToggleStatus(item._id, item.is_active, false)
              }
              value={item.is_active}
              disabled={isLoading}
            />
          </View>
        </View>
        <View style={styles.trafficSimActions}>
          <TouchableOpacity
            style={[styles.smallButton, styles.detailsButton]}
            onPress={() =>
              setSelectedItemId(selectedItemId === item._id ? null : item._id)
            }
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>
              {selectedItemId === item._id ? "Ẩn" : "Chi tiết"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.removeButton]}
            onPress={() => handleRemoveItem(item._id, false, true, false)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Xóa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.addButton]}
            onPress={() => addSimulationToNewScenario(item)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Thêm</Text>
          </TouchableOpacity>
        </View>
      </View>
      {selectedItemId === item._id && renderItemDetails(item)}
    </View>
  );

  const renderScenario = ({ item }) => (
    <View>
      <View style={styles.scenarioCard}>
        <View style={styles.scenarioInfo}>
          <Text style={styles.scenarioTextBold}>{item.name}</Text>
          <Text style={styles.scenarioText}>
            Số mô phỏng: {item.simulations?.length || 0}
          </Text>
          <Text style={styles.scenarioText}>
            Cập nhật:{" "}
            {new Date(item.updatedAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </Text>
          <View style={styles.statusToggleContainer}>
            <Text
              style={[
                styles.scenarioText,
                { color: item.is_active ? "green" : "red" },
              ]}
            >
              {item.is_active ? "Bật" : "Tắt"}
            </Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={item.is_active ? "#1783feff" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={() =>
                handleToggleStatus(item._id?.toString(), item.is_active, true)
              }
              value={item.is_active}
              disabled={
                isLoading ||
                (item.is_active &&
                  activeScenarios.filter((scen) => scen.is_active).length > 1)
              }
            />
          </View>
        </View>
        <View style={styles.scenarioActions}>
          <TouchableOpacity
            style={[styles.smallButton, styles.detailsButton]}
            onPress={() =>
              setSelectedItemId(
                selectedItemId === item._id?.toString()
                  ? null
                  : item._id?.toString()
              )
            }
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>
              {selectedItemId === item._id?.toString() ? "Ẩn" : "Chi tiết"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.removeButton]}
            onPress={() =>
              handleRemoveItem(item._id?.toString(), false, false, true)
            }
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
      {selectedItemId === item._id?.toString() &&
        renderItemDetails({ ...item, type: "scenario" })}
    </View>
  );

  const addSimulationToNewScenario = (simulation) => {
    if (newScenarioSimulations.some((sim) => sim._id === simulation._id)) {
      Alert.alert("Lỗi", "Mô phỏng này đã được thêm vào kịch bản.");
      return;
    }
    setNewScenarioSimulations((prev) => [...prev, simulation]);
  };

  const removeSimulationFromNewScenario = (simulationId) => {
    setNewScenarioSimulations((prev) =>
      prev.filter((sim) => sim._id !== simulationId)
    );
  };

  const renderSimulationSelector = () => (
    <View style={styles.simulationSelector}>
      <Text style={styles.subSectionTitle}>Chọn mô phỏng</Text>
      <FlatList
        data={[...activeAqiSimulations, ...activeTrafficSimulations]}
        renderItem={({ item }) => (
          <View style={styles.simulationItem}>
            <Text style={styles.simulationItemText}>
              {item.simulation_name} ({item.simulation_type})
            </Text>
            <TouchableOpacity
              style={[styles.smallButton, styles.addButton]}
              onPress={() => addSimulationToNewScenario(item)}
              disabled={isLoading}
            >
              <Text style={styles.smallButtonText}>Thêm</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
      />
      <TouchableOpacity
        style={[styles.smallButton, styles.closeDetailsButton]}
        onPress={() => setShowCreateSimulationSelector(false)}
        disabled={isLoading}
      >
        <Text style={styles.smallButtonText}>Đóng</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      accessible={true}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <TouchableOpacity style={styles.toggleButton} onPress={onClose}>
            <Ionicons name="arrow-down" size={20} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.panelTitle}>Quản lý Mô Phỏng</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "AQI" && styles.activeTab]}
              onPress={() => setActiveTab("AQI")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "AQI" && styles.activeTabText,
                ]}
              >
                AQI
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "Traffic" && styles.activeTab]}
              onPress={() => setActiveTab("Traffic")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "Traffic" && styles.activeTabText,
                ]}
              >
                Tuyến đường
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "Scenarios" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("Scenarios")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "Scenarios" && styles.activeTabText,
                ]}
              >
                Kịch bản
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {isLoading && (
              <ActivityIndicator
                size="large"
                color="#2563eb"
                style={styles.loadingIndicator}
              />
            )}
            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}
            {activeTab === "AQI" &&
              (activeAqiSimulations.length > 0 ? (
                <FlatList
                  data={activeAqiSimulations}
                  renderItem={renderAqiStation}
                  keyExtractor={(item) => item._id}
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noSimulationText}>
                  Chưa có trạm AQI mô phỏng nào.
                </Text>
              ))}
            {activeTab === "Traffic" &&
              (activeTrafficSimulations.length > 0 ? (
                <FlatList
                  data={activeTrafficSimulations}
                  renderItem={renderTrafficSimulation}
                  keyExtractor={(item) => item._id}
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noSimulationText}>
                  Chưa có mô phỏng tuyến đường nào.
                </Text>
              ))}
            {activeTab === "Scenarios" && (
              <View>
                <View style={styles.createScenarioContainer}>
                  <Text style={styles.subSectionTitle}>Tạo Kịch bản Mới</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Tên kịch bản:</Text>
                    <TextInput
                      style={styles.detailsInput}
                      value={newScenarioName}
                      onChangeText={setNewScenarioName}
                      placeholder="Nhập tên kịch bản"
                    />
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Mô phỏng đã chọn:</Text>
                    <View style={styles.simulationList}>
                      {newScenarioSimulations.length > 0 ? (
                        <FlatList
                          data={newScenarioSimulations}
                          renderItem={({ item }) => (
                            <View style={styles.simulationItem}>
                              <Text style={styles.simulationItemText}>
                                {item.simulation_name} ({item.simulation_type})
                              </Text>
                              <TouchableOpacity
                                style={[
                                  styles.smallButton,
                                  styles.removeButton,
                                ]}
                                onPress={() =>
                                  removeSimulationFromNewScenario(item._id)
                                }
                                disabled={isLoading}
                              >
                                <Text style={styles.smallButtonText}>Xóa</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                          keyExtractor={(item) => item._id}
                          scrollEnabled={false}
                        />
                      ) : (
                        <Text style={styles.noSimulationText}>
                          Chưa có mô phỏng nào được chọn.
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[styles.smallButton, styles.addButton]}
                        onPress={() => setShowCreateSimulationSelector(true)}
                        disabled={isLoading}
                      >
                        <Text style={styles.smallButtonText}>
                          Thêm mô phỏng
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {showCreateSimulationSelector && renderSimulationSelector()}
                  <TouchableOpacity
                    style={[styles.button, styles.createButton]}
                    onPress={handleCreateScenario}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>Tạo Kịch bản</Text>
                  </TouchableOpacity>
                </View>
                {activeScenarios.length > 0 ? (
                  <FlatList
                    data={activeScenarios}
                    renderItem={renderScenario}
                    keyExtractor={(item) => item._id}
                    horizontal={false}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                ) : (
                  <Text style={styles.noSimulationText}>
                    Chưa có kịch bản nào.
                  </Text>
                )}
              </View>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={fetchActiveSimulations}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Tải lại</Text>
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={async () => {
                Alert.alert(
                  "Xác nhận",
                  "Đặt lại TẤT CẢ mô phỏng? Không thể hoàn tác.",
                  [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Đặt lại",
                      style: "destructive",
                      onPress: async () => {
                        setIsLoading(true);
                        try {
                          await axios.delete(
                            `${BACKEND_API_BASE_URL}/simulate/reset`,
                            getAuthHeaders()
                          );
                          Alert.alert("Thành công", "Đã đặt lại mô phỏng.");
                          await fetchActiveSimulations();
                          if (onSimulationApplied) onSimulationApplied();
                        } catch (error) {
                          console.error("Error resetting simulations:", error);
                          Alert.alert("Lỗi", "Không thể đặt lại mô phỏng.");
                        } finally {
                          setIsLoading(false);
                        }
                      },
                    },
                  ]
                );
              }}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Đặt lại Tất cả Mô phỏng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    width: "90%",
    height: "85%",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    padding: 15,
    zIndex: 1,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 15,
    textAlign: "center",
  },
  scrollContainer: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  loadingIndicator: {
    marginVertical: 15,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginVertical: 8,
    backgroundColor: "#fee2e2",
    padding: 6,
    borderRadius: 6,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
    width: "100%",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: "#dc2626",
  },
  createButton: {
    backgroundColor: "#16a34a",
  },
  footerButtons: {
    width: "100%",
    marginTop: 15,
  },
  aqiStationCard: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  aqiStationInfo: {
    flex: 1,
    marginBottom: 8,
  },
  aqiStationTextBold: {
    fontWeight: "700",
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 4,
  },
  aqiStationText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
    lineHeight: 16,
  },
  aqiStationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  trafficSimCard: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  trafficSimInfo: {
    flex: 1,
    marginBottom: 8,
  },
  trafficSimTextBold: {
    fontWeight: "700",
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 4,
  },
  trafficSimText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
    lineHeight: 16,
  },
  trafficSimActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  scenarioCard: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  scenarioInfo: {
    flex: 1,
    marginBottom: 8,
  },
  scenarioTextBold: {
    fontWeight: "700",
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 4,
  },
  scenarioText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
    lineHeight: 16,
  },
  scenarioActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 4,
    marginHorizontal: 4,
  },
  detailsButton: {
    backgroundColor: "#16a34a",
  },
  editButton: {
    backgroundColor: "#f59e0b",
  },
  removeButton: {
    backgroundColor: "#dc2626",
  },
  updateButton: {
    backgroundColor: "#2563eb",
  },
  closeDetailsButton: {
    backgroundColor: "#6b7280",
  },
  addButton: {
    backgroundColor: "#8b5cf6",
  },
  smallButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  statusToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  detailsContainer: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  detailsLabel: {
    fontWeight: "600",
    fontSize: 12,
    color: "#1e293b",
    width: 100,
  },
  detailsText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
    lineHeight: 16,
  },
  detailsInput: {
    fontSize: 12,
    color: "#1e293b",
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  editButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 10,
    gap: 6,
  },
  noSimulationText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginVertical: 10,
    fontStyle: "italic",
  },
  toggleButton: {
    position: "absolute",
    top: 15,
    left: 15,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 5,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#2563eb",
  },
  tabText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 12,
  },
  activeTabText: {
    color: "#ffffff",
  },
  createScenarioContainer: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  simulationList: {
    flex: 1,
    marginTop: 6,
  },
  simulationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  simulationItemText: {
    fontSize: 12,
    color: "#1e293b",
    flex: 1,
  },
  simulationSelector: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
});

export default SimulationConfigPanel;
