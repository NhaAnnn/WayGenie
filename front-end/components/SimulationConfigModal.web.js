import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
  const [newScenarioName, setNewScenarioName] = useState(
    `Kịch bản ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`
  );
  const [newScenarioSimulations, setNewScenarioSimulations] = useState([]);
  const [showSimulationSelectorForNew, setShowSimulationSelectorForNew] =
    useState(false);
  const [showSimulationSelectorForEdit, setShowSimulationSelectorForEdit] =
    useState(false);

  // Refs cho TextInput
  const aqiNameInputRef = useRef(null);
  const aqiLonInputRef = useRef(null);
  const aqiLatInputRef = useRef(null);
  const trafficNameInputRef = useRef(null);
  const trafficFromNodeInputRef = useRef(null);
  const scenarioNameInputRef = useRef(null);
  const newScenarioNameInputRef = useRef(null);

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
      setNewScenarioName("");
      setNewScenarioSimulations([]);
      setShowSimulationSelectorForNew(false);
      setShowSimulationSelectorForEdit(false);
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
    setNewScenarioName("");
  };

  const handleCreateScenario = async () => {
    if (!newScenarioName) {
      window.alert("Vui lòng nhập tên kịch bản.");
      return;
    }
    if (newScenarioSimulations.length === 0) {
      window.alert("Vui lòng thêm ít nhất một mô phỏng vào kịch bản.");
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
      window.alert("Thành công", "Đã tạo kịch bản mới.");
      await fetchActiveSimulations();
      if (onSimulationApplied) onSimulationApplied();
      setNewScenarioName("");
      setNewScenarioSimulations([]);
      setShowSimulationSelectorForNew(false);
    } catch (error) {
      console.error(
        "Lỗi khi tạo kịch bản:",
        error.response?.data || error.message
      );
      if (error.response?.status === 400)
        window.alert(error.response.data.error || "Dữ liệu không hợp lệ.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSimulation = async (item) => {
    if (!editingItemId) {
      window.alert("Lỗi", "Không có mục nào đang được chỉnh sửa.");
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
        window.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc.");
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
      )
        return window.alert(
          "Lỗi",
          "Kinh độ, Vĩ độ, PM2.5, và Bán kính phải là số hợp lệ."
        );
      if (
        parsedRadius <= 0 ||
        parsedPoint < 0 ||
        parsedPm25 < 0 ||
        (parsedCo !== null && parsedCo < 0) ||
        (parsedNo2 !== null && parsedNo2 < 0) ||
        (parsedSo2 !== null && parsedSo2 < 0) ||
        (parsedO3 !== null && parsedO3 < 0)
      )
        return window.alert(
          "Lỗi",
          "Bán kính và các chỉ số không thể âm hoặc bán kính phải lớn hơn 0."
        );
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
        window.alert("Thành công", `Đã cập nhật mô phỏng AQI.`);
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
        if (error.response?.status === 400)
          window.alert(
            "Lỗi",
            error.response.data.error || "Dữ liệu không hợp lệ."
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
        window.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
        return;
      }
      const parsedFromNode = parseInt(editingTrafficFromNode);
      const parsedToNode = parseInt(editingTrafficToNode);
      const parsedVc = parseFloat(editingTrafficVc);
      const parsedIncident = editingTrafficIncident;
      if (isNaN(parsedFromNode) || isNaN(parsedToNode) || isNaN(parsedVc))
        return window.alert(
          "Lỗi",
          "FROMNODENO, TONODENO, và VC phải là số hợp lệ."
        );
      if (parsedVc < 0 || parsedVc > 1)
        return window.alert("Lỗi", "VC phải nằm trong khoảng 0 đến 1.");
      const payload = {
        simulationName: editingTrafficSimulationName,
        simulation_data: {
          fromNode: parsedFromNode,
          toNode: parsedToNode,
          VC: parsedVc,
          incident: parsedIncident,
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
        window.alert("Thành công", `Đã cập nhật mô phỏng tuyến đường.`);
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
        if (error.response?.status === 400)
          window.alert(
            "Lỗi",
            error.response.data.error || "Dữ liệu không hợp lệ."
          );
      } finally {
        setIsLoading(false);
      }
    } else if (item.type === "scenario") {
      if (!editingScenarioName) {
        window.alert("Lỗi", "Vui lòng điền tên kịch bản.");
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
        window.alert("Thành công", `Đã cập nhật kịch bản.`);
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
        if (error.response?.status === 400)
          window.alert(
            "Lỗi",
            error.response.data.error || "Dữ liệu không hợp lệ."
          );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRemoveItem = async (itemId, isAqi, isTraffic, isScenario) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa ${
        isAqi ? "AQI" : isTraffic ? "tuyến đường" : "kịch bản"
      } này không?`
    );
    if (confirmed) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const config = getAuthHeaders();
        const endpoint =
          isAqi || isTraffic
            ? `${BACKEND_API_BASE_URL}/simulate/${itemId}`
            : `${BACKEND_API_BASE_URL}/scenarios/${itemId}`;
        await axios.delete(endpoint, config);
        window.alert(
          `Đã xóa ${isAqi ? "AQI" : isTraffic ? "tuyến đường" : "kịch bản"}.`
        );
        if (isAqi)
          setActiveAqiSimulations((prev) =>
            prev.filter((sim) => sim._id !== itemId)
          );
        else if (isTraffic)
          setActiveTrafficSimulations((prev) =>
            prev.filter((sim) => sim._id !== itemId)
          );
        else if (isScenario)
          setActiveScenarios((prev) =>
            prev.filter((scen) => scen._id !== itemId)
          );
        if (onSimulationApplied) onSimulationApplied();
        if (editingItemId === itemId) resetEditingFields();
      } catch (error) {
        console.error(
          `Lỗi khi xóa ${isAqi ? "AQI" : isTraffic ? "Traffic" : "Scenario"}:`,
          error.response?.data || error.message
        );
        if (error.response?.status === 404)
          window.alert(
            error.response.data.error ||
              "Mục không tồn tại hoặc không có quyền xóa."
          );
        else window.alert(error.response?.data?.error || "Đã xảy ra lỗi.");
      } finally {
        setIsLoading(false);
      }
    }
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
      if (isScenario)
        setActiveScenarios((prev) =>
          prev.map((scen) =>
            scen._id === updatedItem._id ? updatedItem : scen
          )
        );
      else if (updatedItem.simulation_type === "aqi")
        setActiveAqiSimulations((prev) =>
          prev.map((sim) => (sim._id === updatedItem._id ? updatedItem : sim))
        );
      else
        setActiveTrafficSimulations((prev) =>
          prev.map((sim) => (sim._id === updatedItem._id ? updatedItem : sim))
        );
      if (onSimulationApplied) onSimulationApplied();
    } catch (error) {
      console.error(
        "Lỗi khi thay đổi trạng thái:",
        error.response?.data || error.message
      );
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
    setEditingItemId(item._id || item._id);
    if (item.simulation_type === "aqi" && aqiNameInputRef.current)
      aqiNameInputRef.current.focus();
    if (item.simulation_type === "traffic" && trafficNameInputRef.current)
      trafficNameInputRef.current.focus();
    if (item.type === "scenario" && scenarioNameInputRef.current)
      scenarioNameInputRef.current.focus();
  };

  const addSimulationToScenario = (simulation, isEditing = false) => {
    if (isEditing) {
      if (
        editingScenarioSimulations.some((sim) => sim._id === simulation._id)
      ) {
        window.alert("Mô phỏng này đã được thêm vào kịch bản.");
        return;
      }
      setEditingScenarioSimulations((prev) => [...prev, simulation]);
    } else {
      if (newScenarioSimulations.some((sim) => sim._id === simulation._id)) {
        window.alert("Mô phỏng này đã được thêm vào kịch bản.");
        return;
      }
      setNewScenarioSimulations((prev) => [...prev, simulation]);
    }
  };

  const removeSimulationFromNewScenario = (simulationId) => {
    setNewScenarioSimulations((prev) =>
      prev.filter((sim) => sim._id !== simulationId)
    );
  };

  const removeSimulationFromEditingScenario = (simulationId) => {
    setEditingScenarioSimulations((prev) =>
      prev.filter((sim) => sim._id !== simulationId)
    );
  };

  const renderSimulationSelector = (isEditing = false) => (
    <View style={styles.simulationSelector}>
      <Text style={styles.subSectionTitle}>Chọn mô phỏng</Text>
      {[...activeAqiSimulations, ...activeTrafficSimulations].map((item) => (
        <View key={item._id} style={styles.simulationItem}>
          <Text style={styles.simulationItemText}>
            {item.simulation_name} ({item.simulation_type})
          </Text>
          <TouchableOpacity
            style={[styles.smallButton, styles.addButton]}
            activeOpacity={0.7}
            onPress={() => addSimulationToScenario(item, isEditing)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Thêm</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.smallButton, styles.closeDetailsButton]}
        activeOpacity={0.7}
        onPress={() =>
          isEditing
            ? setShowSimulationSelectorForEdit(false)
            : setShowSimulationSelectorForNew(false)
        }
        disabled={isLoading}
      >
        <Text style={styles.smallButtonText}>Đóng</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItemDetails = (item) => {
    const isEditing = editingItemId === (item._id || item._id);
    const isAqi = item.simulation_type === "aqi";
    const isTraffic = item.simulation_type === "traffic";
    const isScenario = item.type === "scenario";
    const updatedAt = new Date(
      item.updatedAt || item.updated_at
    ).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });

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
              ref={
                isAqi
                  ? aqiNameInputRef
                  : isTraffic
                  ? trafficNameInputRef
                  : scenarioNameInputRef
              }
              style={styles.detailsInput}
              value={
                isAqi
                  ? editingAqiSimulationName
                  : isTraffic
                  ? editingTrafficSimulationName
                  : editingScenarioName
              }
              onChangeText={(text) => {
                console.log("TextInput Tên changed:", text);
                isAqi
                  ? setEditingAqiSimulationName(text)
                  : isTraffic
                  ? setEditingTrafficSimulationName(text)
                  : setEditingScenarioName(text);
              }}
              placeholder="Tên"
              onFocus={() => console.log("TextInput Tên focused")}
              autoFocus={isEditing}
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
                  ref={aqiLonInputRef}
                  style={styles.detailsInput}
                  value={editingAqiLon}
                  onChangeText={(text) => {
                    console.log("Editing AQI Lon:", text);
                    setEditingAqiLon(text);
                  }}
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
                  ref={aqiLatInputRef}
                  style={styles.detailsInput}
                  value={editingAqiLat}
                  onChangeText={(text) => {
                    console.log("Editing AQI Lat:", text);
                    setEditingAqiLat(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing AQI Point:", text);
                    setEditingAqiPoint(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing AQI PM2.5:", text);
                    setEditingAqiPm25(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing AQI CO:", text);
                    setEditingAqiCo(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing AQI NO2:", text);
                    setEditingAqiNo2(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing AQI SO2:", text);
                    setEditingAqiSo2(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing AQI O3:", text);
                    setEditingAqiO3(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing AQI Radius:", text);
                    setEditingAqiRadius(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing Traffic FromNode:", text);
                    setEditingTrafficFromNode(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing Traffic ToNode:", text);
                    setEditingTrafficToNode(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing Traffic VC:", text);
                    setEditingTrafficVc(text);
                  }}
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
                  onChangeText={(text) => {
                    console.log("Editing Traffic Incident:", text);
                    setEditingTrafficIncident(text);
                  }}
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
                    editingScenarioSimulations.map((item) => (
                      <View key={item._id} style={styles.simulationItem}>
                        <Text style={styles.simulationItemText}>
                          {item.simulation_name} ({item.simulation_type})
                        </Text>
                        <TouchableOpacity
                          style={[styles.smallButton, styles.removeButton]}
                          activeOpacity={0.7}
                          onPress={() =>
                            removeSimulationFromEditingScenario(item._id)
                          }
                          disabled={isLoading}
                        >
                          <Text style={styles.smallButtonText}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noSimulationText}>
                      Chưa có mô phỏng nào được chọn.
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.smallButton, styles.addButton]}
                    activeOpacity={0.7}
                    onPress={() => setShowSimulationSelectorForEdit(true)}
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
            {isEditing &&
              showSimulationSelectorForEdit &&
              renderSimulationSelector(true)}
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
                activeOpacity={0.7}
                onPress={() => handleUpdateSimulation(item)}
                disabled={isLoading}
              >
                <Text style={styles.smallButtonText}>Cập nhật</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, styles.closeDetailsButton]}
                activeOpacity={0.7}
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
                activeOpacity={0.7}
                onPress={() => startEditingItem(item)}
                disabled={isLoading}
              >
                <Text style={styles.smallButtonText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, styles.closeDetailsButton]}
                activeOpacity={0.7}
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
            {item.simulation_data.lat?.toFixed(2)} | PM2.5:
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
              style={styles.statusToggle}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={item.is_active ? "#767577" : "#f4f3f4"}
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
            activeOpacity={0.7}
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
            activeOpacity={0.7}
            onPress={() => handleRemoveItem(item._id, true, false, false)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Xóa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.addButton]}
            activeOpacity={0.7}
            onPress={() => addSimulationToScenario(item, false)}
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
              style={styles.statusToggle}
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
            activeOpacity={0.7}
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
            activeOpacity={0.7}
            onPress={() => handleRemoveItem(item._id, false, true, false)}
            disabled={isLoading}
          >
            <Text style={styles.smallButtonText}>Xóa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.addButton]}
            activeOpacity={0.7}
            onPress={() => addSimulationToScenario(item, false)}
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
              style={styles.statusToggle}
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
            activeOpacity={0.7}
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
            activeOpacity={0.7}
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

  return (
    <View
      style={[
        styles.panel,
        isVisible ? styles.panelVisible : styles.panelHidden,
      ]}
    >
      <TouchableOpacity
        style={styles.toggleButton}
        activeOpacity={0.7}
        onPress={onClose}
      >
        <Ionicons name="arrow-forward" size={24} color="#3366dd" />
      </TouchableOpacity>
      <Text style={styles.panelTitle}>Quản lý Mô Phỏng</Text>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "AQI" && styles.activeTab]}
          activeOpacity={0.7}
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
          activeOpacity={0.7}
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
          style={[styles.tab, activeTab === "Scenarios" && styles.activeTab]}
          activeOpacity={0.7}
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
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <ActivityIndicator
            size="large"
            color="#2563eb"
            style={styles.loadingIndicator}
          />
        )}
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        {activeTab === "AQI" &&
          (activeAqiSimulations.length > 0 ? (
            activeAqiSimulations.map((item) => (
              <View key={item._id}>{renderAqiStation({ item })}</View>
            ))
          ) : (
            <Text style={styles.noSimulationText}>
              Chưa có trạm AQI mô phỏng nào.
            </Text>
          ))}
        {activeTab === "Traffic" &&
          (activeTrafficSimulations.length > 0 ? (
            activeTrafficSimulations.map((item) => (
              <View key={item._id}>{renderTrafficSimulation({ item })}</View>
            ))
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
                  ref={newScenarioNameInputRef}
                  style={styles.detailsInput}
                  value={newScenarioName}
                  onChangeText={(text) => {
                    console.log("TextInput Tên kịch bản changed:", text);
                    setNewScenarioName(text);
                  }}
                  placeholder="Nhập tên kịch bản"
                  onFocus={() => console.log("TextInput Tên kịch bản focused")}
                  autoFocus={isVisible && activeTab === "Scenarios"}
                />
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Mô phỏng đã chọn:</Text>
                <View style={styles.simulationList}>
                  {newScenarioSimulations.length > 0 ? (
                    newScenarioSimulations.map((item) => (
                      <View key={item._id} style={styles.simulationItem}>
                        <Text style={styles.simulationItemText}>
                          {item.simulation_name} ({item.simulation_type})
                        </Text>
                        <TouchableOpacity
                          style={[styles.smallButton, styles.removeButton]}
                          activeOpacity={0.7}
                          onPress={() =>
                            removeSimulationFromNewScenario(item._id)
                          }
                          disabled={isLoading}
                        >
                          <Text style={styles.smallButtonText}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noSimulationText}>
                      Chưa có mô phỏng nào được chọn.
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.smallButton, styles.addButton]}
                    activeOpacity={0.7}
                    onPress={() => setShowSimulationSelectorForNew(true)}
                    disabled={isLoading}
                  >
                    <Text style={styles.smallButtonText}>Thêm mô phỏng</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {showSimulationSelectorForNew && renderSimulationSelector(false)}
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                activeOpacity={0.7}
                onPress={handleCreateScenario}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Tạo Kịch bản</Text>
              </TouchableOpacity>
            </View>
            {activeScenarios.length > 0 ? (
              activeScenarios.map((item) => (
                <View key={item._id}>{renderScenario({ item })}</View>
              ))
            ) : (
              <Text style={styles.noSimulationText}>Chưa có kịch bản nào.</Text>
            )}
          </View>
        )}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.7}
          onPress={fetchActiveSimulations}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Tải lại</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.footerButtons}>
        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          activeOpacity={0.7}
          onPress={async () => {
            const result = window.confirm(
              "Đặt lại TẤT CẢ mô phỏng? Không thể hoàn tác."
            );
            if (result) {
              setIsLoading(true);
              try {
                await axios.delete(
                  `${BACKEND_API_BASE_URL}/simulate/reset`,
                  getAuthHeaders()
                );
                window.alert("Đã đặt lại mô phỏng.");
                await fetchActiveSimulations();
                if (onSimulationApplied) onSimulationApplied();
              } catch (error) {
                console.error("Error resetting simulations:", error);
                setIsLoading(false);
              }
            }
          }}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Đặt lại Tất cả Mô phỏng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: "fixed",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    width: "35%",
    height: "100%",
    right: 0,
    top: 0,
    bottom: 0,
    boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.15)",
    padding: 20,
    transform: "translateX(100%)",
    transition: "transform 0.3s ease-in-out",
    zIndex: 1000,
  },
  panelVisible: {
    transform: "translateX(0)",
  },
  panelHidden: {
    transform: "translateX(100%)",
  },
  panelTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  scrollContainer: {
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginVertical: 10,
    backgroundColor: "#fee2e2",
    padding: 8,
    borderRadius: 6,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginVertical: 12,
    letterSpacing: 0.3,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
    width: "100%",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  resetButton: {
    backgroundColor: "#dc2626",
  },
  createButton: {
    backgroundColor: "#16a34a",
  },
  footerButtons: {
    width: "100%",
    marginTop: 20,
  },
  aqiStationCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    boxShadow: "0 3px 6px rgba(0, 0, 0, 0.1)",
  },
  aqiStationInfo: {
    flex: 1,
    paddingRight: 12,
  },
  aqiStationTextBold: {
    fontWeight: "700",
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 4,
  },
  aqiStationText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
    lineHeight: 20,
  },
  aqiStationActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  trafficSimCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    boxShadow: "0 3px 6px rgba(0, 0, 0, 0.1)",
  },
  trafficSimInfo: {
    flex: 1,
    paddingRight: 12,
  },
  trafficSimTextBold: {
    fontWeight: "700",
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 4,
  },
  trafficSimText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
    lineHeight: 20,
  },
  trafficSimActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  scenarioCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    boxShadow: "0 3px 6px rgba(0, 0, 0, 0.1)",
  },
  scenarioInfo: {
    flex: 1,
    paddingRight: 12,
  },
  scenarioTextBold: {
    fontWeight: "700",
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 4,
  },
  scenarioText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
    lineHeight: 20,
  },
  scenarioActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginLeft: 8,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
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
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  statusToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  detailsContainer: {
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  detailsLabel: {
    fontWeight: "600",
    fontSize: 14,
    color: "#1e293b",
    width: 140,
  },
  detailsText: {
    fontSize: 14,
    color: "#475569",
    flex: 1,
    lineHeight: 20,
  },
  detailsInput: {
    fontSize: 14,
    color: "#1e293b",
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  editButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 12,
    gap: 8,
  },
  noSimulationText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginVertical: 12,
    fontStyle: "italic",
  },
  toggleButton: {
    position: "absolute",
    marginTop: 2,
    marginLeft: 10,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 6,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  activeTab: {
    backgroundColor: "#2563eb",
    boxShadow: "0 3px 6px rgba(0, 0, 0, 0.2)",
  },
  tabText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: "#ffffff",
  },
  createScenarioContainer: {
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  simulationList: {
    flex: 1,
    marginTop: 8,
  },
  simulationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  simulationItemText: {
    fontSize: 14,
    color: "#1e293b",
    flex: 1,
  },
  simulationSelector: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    boxShadow: "0 3px 6px rgba(0, 0, 0, 0.1)",
  },
  statusToggle: {
    marginLeft: 10,
    marginTop: 5,
    transform: "scale(1.2)",
  },
});

export default SimulationConfigPanel;
