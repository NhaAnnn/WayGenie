import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  MAPBOX_PUBLIC_ACCESS_TOKEN,
  BACKEND_API_BASE_URL,
} from "../../secrets.js";
import MapWrapper from "../../components/MapWrapper";

export default function RouteManagement({ navigation }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [mode, setMode] = useState("driving");
  const [routePreference, setRoutePreference] = useState("fastest");
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width
  );
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coordinatesInfo, setCoordinatesInfo] = useState(null);
  const [layersVisibility, setLayersVisibility] = useState({
    traffic: true,
    coordinates: true,
  });
  const [allCoordinates, setAllCoordinates] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [isBackendGraphDataLoading, setIsBackendGraphDataLoading] =
    useState(true);
  const [isError, setIsError] = useState(false);
  const [trafficData, setTrafficData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [coordinatesData, setCoordinatesData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [selectingNode, setSelectingNode] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [formData, setFormData] = useState({
    linkNo: "",
    FROMNODENO: "",
    TONODENO: "",
    LENGTHDIR: "",
    NAME: "",
    TSYSSET: "",
    LENGTH: "",
    NUMLANES: "",
    CAPPRT: "",
    V0PRT: "",
    VOLVEHPRT: "",
    VC: "",
    VOLPCUPRT: "",
    VOLVEH_TSYS: "",
    VOLCAPRATIOPRT: "",
    FROMNODEORIENTATION: "",
    VCUR_PRTSYS_BIKE: "",
    VCUR_PRTSYS_CAR: "",
    VCUR_PRTSYS_CO: "",
    VCUR_PRTSYS_HGV: "",
    VCUR_PRTSYS_MC: "",
  });
  const [intermediateCoords, setIntermediateCoords] = useState([]);
  const [isSelectingIntermediate, setIsSelectingIntermediate] = useState(false);
  const [editingCoordIndex, setEditingCoordIndex] = useState(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);

  const COORDINATES_API_URL = `${BACKEND_API_BASE_URL}/coordinates`;
  const ROUTES_API_URL = `${BACKEND_API_BASE_URL}/routes`;
  const debounceTimeout = useRef(null);

  const fetchGraphData = useCallback(
    async (retries = 3) => {
      setIsBackendGraphDataLoading(true);
      setIsError(false);

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const [coordsResponse, routesResponse] = await Promise.allSettled([
            fetch(COORDINATES_API_URL),
            fetch(ROUTES_API_URL),
          ]);

          let errorOccurred = false;

          if (
            coordsResponse.status === "fulfilled" &&
            coordsResponse.value.ok
          ) {
            const coordsData = await coordsResponse.value.json();
            setAllCoordinates(coordsData);
          } else {
            errorOccurred = true;
            console.error("Lỗi khi lấy dữ liệu tọa độ:", coordsResponse);
          }

          if (
            routesResponse.status === "fulfilled" &&
            routesResponse.value.ok
          ) {
            const routesData = await routesResponse.value.json();
            console.log("Routes data from backend:", routesData);
            setAllRoutes(routesData);
          } else {
            errorOccurred = true;
            console.error("Lỗi khi lấy dữ liệu tuyến đường:", routesResponse);
          }

          setIsError(errorOccurred);
          if (!errorOccurred) break;
        } catch (error) {
          console.error(`Lỗi mạng chung (thử ${attempt}/${retries}):`, error);
          if (attempt === retries) setIsError(true);
        }
      }
      setIsBackendGraphDataLoading(false);
    },
    [COORDINATES_API_URL, ROUTES_API_URL]
  );

  const processRealtimeData = useCallback(() => {
    if (allCoordinates.length === 0 || allRoutes.length === 0) return;

    const coordinatesMap = new Map();
    allCoordinates.forEach((coord) => {
      coordinatesMap.set(coord.node_id, coord);
    });

    const trafficFeatures = allRoutes.map((route) => {
      const fromCoord = coordinatesMap.get(route.FROMNODENO);
      const toCoord = coordinatesMap.get(route.TONODENO);

      return {
        type: "Feature",
        properties: {
          id: route._id,
          linkNo: route.linkNo ?? "N/A",
          FROMNODENO: route.FROMNODENO ?? "N/A",
          TONODENO: route.TONODENO ?? "N/A",
          VC: route.VC ?? "N/A",
          TSYSSET: route.TSYSSET ?? "N/A",
          LENGTHDIR: route.LENGTHDIR ?? "N/A",
          status:
            route.VC <= 0.6
              ? "smooth"
              : route.VC <= 0.8
              ? "moderate"
              : "congested",
        },
        geometry: route.geometry || {
          type: "LineString",
          coordinates: [
            fromCoord?.location?.coordinates || [0, 0],
            toCoord?.location?.coordinates || [0, 0],
          ],
        },
      };
    });

    setTrafficData((prev) => {
      if (JSON.stringify(trafficFeatures) !== JSON.stringify(prev.features)) {
        console.log("Updated trafficData:", trafficFeatures);
        return {
          type: "FeatureCollection",
          features: trafficFeatures,
        };
      }
      return prev;
    });

    const coordinatesFeatures = allCoordinates.map((coord) => {
      return {
        type: "Feature",
        properties: {
          node_id: coord.node_id,
          nodeName: coord.node_name || `Node ${coord.node_id || "N/A"}`,
        },
        geometry: coord.location || { type: "Point", coordinates: [0, 0] },
      };
    });

    setCoordinatesData((prev) => {
      if (
        JSON.stringify(coordinatesFeatures) !== JSON.stringify(prev.features)
      ) {
        return {
          type: "FeatureCollection",
          features: coordinatesFeatures,
        };
      }
      return prev;
    });
  }, [allCoordinates, allRoutes]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setTrafficData((prev) => {
        const newFeatures = allRoutes.map((route) => ({
          type: "Feature",
          properties: {
            id: route._id,
            linkNo: route.linkNo ?? "N/A",
            FROMNODENO: route.FROMNODENO ?? "N/A",
            TONODENO: route.TONODENO ?? "N/A",
            VC: route.VC ?? "N/A",
            TSYSSET: route.TSYSSET ?? "N/A",
            LENGTHDIR: route.LENGTHDIR ?? "N/A",
            status:
              route.VC <= 0.6
                ? "smooth"
                : route.VC <= 0.8
                ? "moderate"
                : "congested",
          },
          geometry: route.geometry || { type: "LineString", coordinates: [] },
        }));
        if (JSON.stringify(newFeatures) !== JSON.stringify(prev.features)) {
          console.log("Updated trafficData (no query):", newFeatures);
          return { type: "FeatureCollection", features: newFeatures };
        }
        return prev;
      });
      return;
    }

    const filtered = allRoutes.filter((route) =>
      route.linkNo.toString().includes(query)
    );

    setTrafficData((prev) => {
      const newFeatures = filtered.map((route) => ({
        type: "Feature",
        properties: {
          id: route._id,
          linkNo: route.linkNo ?? "N/A",
          FROMNODENO: route.FROMNODENO ?? "N/A",
          TONODENO: route.TONODENO ?? "N/A",
          VC: route.VC ?? "N/A",
          TSYSSET: route.TSYSSET ?? "N/A",
          LENGTHDIR: route.LENGTHDIR ?? "N/A",
          status:
            route.VC <= 0.6
              ? "smooth"
              : route.VC <= 0.8
              ? "moderate"
              : "congested",
        },
        geometry: route.geometry || { type: "LineString", coordinates: [] },
      }));
      if (JSON.stringify(newFeatures) !== JSON.stringify(prev.features)) {
        console.log("Updated trafficData (filtered):", newFeatures);
        return { type: "FeatureCollection", features: newFeatures };
      }
      return prev;
    });
  };

  const openAddEditForm = (route = null) => {
    console.log("Route data:", route);
    if (route) {
      if (!route.V0PRT || !route.VOLVEHPRT || !route.VCUR_PRTSYS_BIKE) {
        console.warn("Missing critical fields in route data:", route);
        toast.error("Dữ liệu tuyến đường không đầy đủ!");
      }
    }
    setCurrentRoute(route);
    setFormData({
      linkNo: route?.linkNo?.toString() || "",
      FROMNODENO: route?.FROMNODENO?.toString() || "",
      TONODENO: route?.TONODENO?.toString() || "",
      LENGTHDIR: route?.LENGTHDIR?.toString() || "",
      NAME: route?.NAME || "",
      TSYSSET: route?.TSYSSET || "",
      LENGTH: route?.LENGTH?.toString() || "",
      NUMLANES: route?.NUMLANES?.toString() || "",
      CAPPRT: route?.CAPPRT?.toString() || "",
      V0PRT: route?.V0PRT?.toString() || "",
      VOLVEHPRT: route?.VOLVEHPRT?.toString() || "",
      VC: route?.VC?.toString() || "",
      VOLPCUPRT: route?.VOLPCUPRT?.toString() || "",
      VOLVEH_TSYS: route?.VOLVEH_TSYS?.toString() || "",
      VOLCAPRATIOPRT: route?.VOLCAPRATIOPRT?.toString() || "",
      FROMNODEORIENTATION: route?.FROMNODEORIENTATION || "",
      VCUR_PRTSYS_BIKE: route?.VCUR_PRTSYS_BIKE?.toString() || "",
      VCUR_PRTSYS_CAR: route?.VCUR_PRTSYS_CAR?.toString() || "",
      VCUR_PRTSYS_CO: route?.VCUR_PRTSYS_CO?.toString() || "",
      VCUR_PRTSYS_HGV: route?.VCUR_PRTSYS_HGV?.toString() || "",
      VCUR_PRTSYS_MC: route?.VCUR_PRTSYS_MC?.toString() || "",
    });
    setIntermediateCoords(route?.geometry?.coordinates?.slice(1, -1) || []);
    setIsAddingRoute(true);
    setIsSidebarOpen(true);
    setEditingCoordIndex(null);
  };

  const closeAddEditForm = () => {
    setIsAddingRoute(false);
    setCurrentRoute(null);
    setSelectingNode(null);
    setIsSelectingIntermediate(false);
    setEditingCoordIndex(null);
    setIntermediateCoords([]);
    setFormData({
      linkNo: "",
      FROMNODENO: "",
      TONODENO: "",
      LENGTHDIR: "",
      NAME: "",
      TSYSSET: "",
      LENGTH: "",
      NUMLANES: "",
      CAPPRT: "",
      V0PRT: "",
      VOLVEHPRT: "",
      VC: "",
      VOLPCUPRT: "",
      VOLVEH_TSYS: "",
      VOLCAPRATIOPRT: "",
      FROMNODEORIENTATION: "",
      VCUR_PRTSYS_BIKE: "",
      VCUR_PRTSYS_CAR: "",
      VCUR_PRTSYS_CO: "",
      VCUR_PRTSYS_HGV: "",
      VCUR_PRTSYS_MC: "",
    });
  };

  const validateForm = () => {
    if (!formData.linkNo || isNaN(formData.linkNo)) {
      toast.error("Link ID phải là số hợp lệ");
      return false;
    }
    if (
      !formData.FROMNODENO ||
      !formData.TONODENO ||
      formData.FROMNODENO === formData.TONODENO
    ) {
      toast.error("Node ID không hợp lệ hoặc trùng lặp");
      return false;
    }
    if (
      !formData.NUMLANES ||
      isNaN(formData.NUMLANES) ||
      parseInt(formData.NUMLANES) < 1
    ) {
      toast.error("Số làn đường phải là số nguyên dương");
      return false;
    }
    if (
      !formData.CAPPRT ||
      isNaN(formData.CAPPRT) ||
      parseInt(formData.CAPPRT) < 0
    ) {
      toast.error("Dung lượng phải là số không âm");
      return false;
    }
    return true;
  };

  const saveRoute = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const method = currentRoute ? "PUT" : "POST";
      const url = currentRoute
        ? `${ROUTES_API_URL}/${currentRoute._id}`
        : ROUTES_API_URL;

      const fromCoord = allCoordinates.find(
        (c) => c.node_id === parseInt(formData.FROMNODENO)
      );
      const toCoord = allCoordinates.find(
        (c) => c.node_id === parseInt(formData.TONODENO)
      );

      if (!fromCoord || !toCoord) {
        throw new Error("Node ID không hợp lệ hoặc không tồn tại");
      }

      const coordinates = [
        fromCoord.location.coordinates,
        ...intermediateCoords,
        toCoord.location.coordinates,
      ];

      const payload = {
        linkNo: parseInt(formData.linkNo),
        FROMNODENO: parseInt(formData.FROMNODENO),
        TONODENO: parseInt(formData.TONODENO),
        LENGTHDIR: parseFloat(formData.LENGTHDIR) || 0,
        NAME: formData.NAME || "",
        TSYSSET: formData.TSYSSET || "B2,BIKE,CAR,Co,HGV,MC,W",
        LENGTH: parseFloat(formData.LENGTH) || 0,
        NUMLANES: parseInt(formData.NUMLANES) || 1,
        CAPPRT: parseInt(formData.CAPPRT) || 0,
        V0PRT: parseInt(formData.V0PRT) || 0,
        VOLVEHPRT: parseInt(formData.VOLVEHPRT) || 0,
        VC: parseFloat(formData.VC) || 0,
        VOLPCUPRT: parseInt(formData.VOLPCUPRT) || 0,
        VOLVEH_TSYS: parseInt(formData.VOLVEH_TSYS) || 0,
        VOLCAPRATIOPRT: parseFloat(formData.VOLCAPRATIOPRT) || 0,
        FROMNODEORIENTATION: formData.FROMNODEORIENTATION || "",
        VCUR_PRTSYS_BIKE: parseInt(formData.VCUR_PRTSYS_BIKE) || 0,
        VCUR_PRTSYS_CAR: parseInt(formData.VCUR_PRTSYS_CAR) || 0,
        VCUR_PRTSYS_CO: parseInt(formData.VCUR_PRTSYS_CO) || 0,
        VCUR_PRTSYS_HGV: parseInt(formData.VCUR_PRTSYS_HGV) || 0,
        VCUR_PRTSYS_MC: parseInt(formData.VCUR_PRTSYS_MC) || 0,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        if (response.status === 400) {
          throw new Error(
            errorData.message || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại."
          );
        } else if (response.status === 409) {
          throw new Error("Link ID đã tồn tại.");
        } else if (response.status === 404) {
          throw new Error("Không tìm thấy tuyến đường.");
        } else {
          throw new Error("Lỗi máy chủ. Vui lòng thử lại sau.");
        }
      }

      await fetchGraphData();
      toast.success(
        currentRoute
          ? "Cập nhật tuyến đường thành công"
          : "Thêm tuyến đường mới thành công"
      );
      closeAddEditForm();
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRoute = async (id) => {
    const route = allRoutes.find((r) => r._id === id);
    if (!route) {
      toast.error("Không tìm thấy tuyến đường");
      return;
    }
    setRouteToDelete(route);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteRoute = async () => {
    try {
      setLoading(true);
      const url = `${ROUTES_API_URL}/${routeToDelete._id}`;
      console.log("Deleting route - URL:", url);
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || "Không thể xóa tuyến đường");
      }

      await fetchGraphData();
      toast.success("Đã xóa tuyến đường thành công");
      setIsDeleteModalVisible(false);
      setRouteToDelete(null);
    } catch (error) {
      toast.error(`Lỗi khi xóa tuyến đường: ${error.message}`);
      console.error("Delete route error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = useCallback(
    (event) => {
      if (isSelectingIntermediate) {
        const { lng, lat } = event.lngLat;
        const newCoord = [lng, lat];
        if (editingCoordIndex !== null) {
          setIntermediateCoords((prev) =>
            prev.map((coord, index) =>
              index === editingCoordIndex ? newCoord : coord
            )
          );
          setEditingCoordIndex(null);
          setIsSelectingIntermediate(false);
          toast.success(
            `Đã cập nhật tọa độ trung gian tại vị trí ${
              editingCoordIndex + 1
            }: [${lng.toFixed(6)}, ${lat.toFixed(6)}]`
          );
        } else {
          setIntermediateCoords((prev) => [...prev, newCoord]);
          toast.success(
            `Đã thêm tọa độ trung gian: [${lng.toFixed(6)}, ${lat.toFixed(6)}]`
          );
        }
      }
    },
    [isSelectingIntermediate, editingCoordIndex]
  );

  const deleteIntermediateCoord = (index) => {
    setIntermediateCoords((prev) => prev.filter((_, i) => i !== index));
    toast.success(`Đã xóa tọa độ trung gian ${index + 1}`);
    if (editingCoordIndex === index) {
      setEditingCoordIndex(null);
      setIsSelectingIntermediate(false);
    }
  };

  const editIntermediateCoord = (index) => {
    setEditingCoordIndex(index);
    setIsSelectingIntermediate(true);
  };

  const handleCoordinateMarkerPress = useCallback(
    (feature) => {
      if (selectingNode) {
        if (!feature || !feature.properties || !feature.properties.node_id) {
          console.error("Invalid feature data:", feature);
          toast.error("Không thể lấy thông tin node từ marker");
          return;
        }
        setFormData((prev) => ({
          ...prev,
          [selectingNode === "from" ? "FROMNODENO" : "TONODENO"]:
            feature.properties.node_id.toString(),
        }));
        setSelectingNode(null);
        toast.success(
          `Đã chọn node ${feature.properties.node_id} làm ${
            selectingNode === "from" ? "From Node" : "To Node"
          }`
        );
      } else if (layersVisibility.coordinates) {
        setCoordinatesInfo({
          node_id: feature.properties.node_id,
          nodeName: feature.properties.nodeName,
          coordinates: feature.geometry.coordinates,
        });
      }
    },
    [selectingNode, layersVisibility.coordinates]
  );

  const startSelectingNode = (type) => {
    setSelectingNode(type);
  };

  const cancelSelectingNode = () => {
    setSelectingNode(null);
  };

  const toggleLayer = (layerName) => {
    setLayersVisibility((prevState) => ({
      ...prevState,
      [layerName]: !prevState[layerName],
    }));
  };

  const closeCoordinatesInfo = () => {
    setCoordinatesInfo(null);
  };

  useEffect(() => {
    const updateDimensions = () => {
      const width = Dimensions.get("window").width;
      setScreenWidth(width);
    };

    const subscription = Dimensions.addEventListener(
      "change",
      updateDimensions
    );
    updateDimensions();

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    if (!isBackendGraphDataLoading && !isError) {
      processRealtimeData();
    }
  }, [isBackendGraphDataLoading, isError, processRealtimeData]);

  useEffect(() => {
    if (startCoords && endCoords) {
      fetchRoute();
    }
  }, [mode, routePreference]);

  const isLoading =
    isBackendGraphDataLoading ||
    !trafficData.features.length ||
    !coordinatesData.features.length;

  return (
    <SafeAreaView style={styles.container}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <View style={styles.mapContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>
              {isError ? "Lỗi tải dữ liệu" : "Đang tải dữ liệu..."}
            </Text>
          </View>
        )}

        <MapWrapper
          startCoords={startCoords}
          endCoords={endCoords}
          routes={routes}
          mapboxAccessToken={MAPBOX_PUBLIC_ACCESS_TOKEN}
          selectedRouteIndex={selectedRouteIndex}
          initialCenter={[105.8342, 21.0278]}
          initialZoom={12}
          layersVisibility={layersVisibility}
          trafficData={trafficData}
          coordinatesData={coordinatesData}
          onCoordinateMarkerPress={handleCoordinateMarkerPress}
          coordinatesInfo={coordinatesInfo}
          onCloseCoordinatesPanel={closeCoordinatesInfo}
          onClick={handleMapClick}
          selectedPosition={intermediateCoords[intermediateCoords.length - 1]}
          savedPositions={intermediateCoords}
        />
      </View>

      <TouchableWithoutFeedback
        onPress={() => navigation.navigate("AdminDashboard")}
      >
        <View style={styles.homeButton}>
          <Ionicons name="home" size={24} color="#3366dd" />
        </View>
      </TouchableWithoutFeedback>

      {!isSidebarOpen && (
        <TouchableWithoutFeedback onPress={() => setIsSidebarOpen(true)}>
          <View style={styles.toggleButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1E90FF" />
          </View>
        </TouchableWithoutFeedback>
      )}

      {isSidebarOpen && (
        <View style={[styles.sidebar, { width: screenWidth * 0.4 }]}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {isAddingRoute
                ? currentRoute
                  ? "Chỉnh sửa tuyến đường"
                  : "Thêm tuyến đường mới"
                : "Quản Lý Tuyến Đường"}
            </Text>
            <TouchableWithoutFeedback onPress={() => setIsSidebarOpen(false)}>
              <View>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </View>
            </TouchableWithoutFeedback>
          </View>

          {isAddingRoute ? (
            <ScrollView style={styles.content}>
              {selectingNode && (
                <View style={styles.selectingNodeContainer}>
                  <Text style={styles.selectingNodeText}>
                    Đang chọn{" "}
                    {selectingNode === "from" ? "From Node" : "To Node"}...
                  </Text>
                  <TouchableWithoutFeedback onPress={cancelSelectingNode}>
                    <View style={styles.cancelSelectButton}>
                      <MaterialIcons name="close" size={20} color="#F44336" />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              )}

              {isSelectingIntermediate && (
                <View style={styles.selectingNodeContainer}>
                  <Text style={styles.selectingNodeText}>
                    {editingCoordIndex !== null
                      ? `Đang chỉnh sửa tọa độ trung gian ${
                          editingCoordIndex + 1
                        }...`
                      : "Đang chọn tọa độ trung gian..."}
                  </Text>
                  <TouchableWithoutFeedback
                    onPress={() => {
                      setIsSelectingIntermediate(false);
                      setEditingCoordIndex(null);
                    }}
                  >
                    <View style={styles.cancelSelectButton}>
                      <MaterialIcons name="close" size={20} color="#F44336" />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Mã tuyến đường (Link ID)*"
                keyboardType="numeric"
                value={formData.linkNo}
                onChangeText={(text) =>
                  setFormData({ ...formData, linkNo: text })
                }
              />

              <View style={styles.routeRow}>
                <View style={styles.nodeInputContainer}>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="ID nút bắt đầu (From Node)*"
                    keyboardType="numeric"
                    value={formData.FROMNODENO}
                    onChangeText={(text) =>
                      setFormData({ ...formData, FROMNODENO: text })
                    }
                    editable={!selectingNode}
                  />
                  <TouchableWithoutFeedback
                    onPress={() => startSelectingNode("from")}
                    disabled={selectingNode === "to"}
                  >
                    <View style={styles.selectNodeButton}>
                      <MaterialIcons
                        name="location-pin"
                        size={20}
                        color="#1E90FF"
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
                <View style={styles.nodeInputContainer}>
                  <TextInput
                    style={[styles.input, styles.nodeInput]}
                    placeholder="ID nút kết thúc (To Node)*"
                    keyboardType="numeric"
                    value={formData.TONODENO}
                    onChangeText={(text) =>
                      setFormData({ ...formData, TONODENO: text })
                    }
                    editable={!selectingNode}
                  />
                  <TouchableWithoutFeedback
                    onPress={() => startSelectingNode("to")}
                    disabled={selectingNode === "from"}
                  >
                    <View style={styles.selectNodeButton}>
                      <MaterialIcons
                        name="location-pin"
                        size={20}
                        color="#1E90FF"
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </View>

              {formData.FROMNODENO && formData.TONODENO && (
                <View style={styles.intermediateButtonContainer}>
                  <TouchableWithoutFeedback
                    onPress={() => {
                      setIsSelectingIntermediate(!isSelectingIntermediate);
                      setEditingCoordIndex(null);
                    }}
                  >
                    <View
                      style={[
                        styles.positionButton,
                        isSelectingIntermediate && styles.positionButtonActive,
                      ]}
                    >
                      <Ionicons
                        name={isSelectingIntermediate ? "close" : "add"}
                        size={20}
                        color={isSelectingIntermediate ? "white" : "#1E90FF"}
                      />
                      <Text
                        style={[
                          styles.positionButtonText,
                          isSelectingIntermediate &&
                            styles.positionButtonTextActive,
                        ]}
                      >
                        {isSelectingIntermediate
                          ? "Đang chọn tọa độ trung gian..."
                          : "Thêm tọa độ trung gian"}
                      </Text>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              )}

              {intermediateCoords.length > 0 && (
                <View style={styles.intermediateCoordsContainer}>
                  <Text style={styles.sectionTitle}>
                    Tọa độ trung gian ({intermediateCoords.length})
                  </Text>
                  <ScrollView
                    style={styles.intermediateCoordsList}
                    nestedScrollEnabled
                  >
                    {intermediateCoords.map((coord, index) => (
                      <View key={index} style={styles.intermediateCoordItem}>
                        <Text style={styles.intermediateCoordText}>
                          {index + 1}. [{coord[0].toFixed(6)},{" "}
                          {coord[1].toFixed(6)}]
                        </Text>
                        <View style={styles.intermediateCoordActions}>
                          <TouchableWithoutFeedback
                            onPress={() => editIntermediateCoord(index)}
                          >
                            <View style={styles.actionButton}>
                              <MaterialIcons
                                name="edit"
                                size={16}
                                color="#4CAF50"
                              />
                            </View>
                          </TouchableWithoutFeedback>
                          <TouchableWithoutFeedback
                            onPress={() => deleteIntermediateCoord(index)}
                          >
                            <View style={styles.actionButton}>
                              <MaterialIcons
                                name="delete"
                                size={16}
                                color="#F44336"
                              />
                            </View>
                          </TouchableWithoutFeedback>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Tên tuyến đường (ví dụ: Yên Phụ)"
                value={formData.NAME}
                onChangeText={(text) =>
                  setFormData({ ...formData, NAME: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Độ dài tuyến đường (km)*"
                keyboardType="numeric"
                value={formData.LENGTHDIR}
                onChangeText={(text) =>
                  setFormData({ ...formData, LENGTHDIR: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Độ dài thực tế (km)*"
                keyboardType="numeric"
                value={formData.LENGTH}
                onChangeText={(text) =>
                  setFormData({ ...formData, LENGTH: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Số làn đường (số nguyên)*"
                keyboardType="numeric"
                value={formData.NUMLANES}
                onChangeText={(text) =>
                  setFormData({ ...formData, NUMLANES: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Dung lượng mỗi giờ (xe/giờ)*"
                keyboardType="numeric"
                value={formData.CAPPRT}
                onChangeText={(text) =>
                  setFormData({ ...formData, CAPPRT: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Tốc độ thiết kế (km/h)"
                keyboardType="numeric"
                value={formData.V0PRT}
                onChangeText={(text) =>
                  setFormData({ ...formData, V0PRT: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Lưu lượng phương tiện (xe/giờ)"
                keyboardType="numeric"
                value={formData.VOLVEHPRT}
                onChangeText={(text) =>
                  setFormData({ ...formData, VOLVEHPRT: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Tỷ lệ lưu lượng/dung lượng (V/C)"
                keyboardType="numeric"
                value={formData.VC}
                onChangeText={(text) => setFormData({ ...formData, VC: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Lưu lượng quy đổi (PCU/giờ)"
                keyboardType="numeric"
                value={formData.VOLPCUPRT}
                onChangeText={(text) =>
                  setFormData({ ...formData, VOLPCUPRT: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Lưu lượng xe máy (xe/giờ)"
                keyboardType="numeric"
                value={formData.VOLVEH_TSYS}
                onChangeText={(text) =>
                  setFormData({ ...formData, VOLVEH_TSYS: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Tỷ lệ lưu lượng/dung lượng (%)"
                keyboardType="numeric"
                value={formData.VOLCAPRATIOPRT}
                onChangeText={(text) =>
                  setFormData({ ...formData, VOLCAPRATIOPRT: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Hướng từ nút bắt đầu (Bắc/Nam/Đông/Tây)"
                value={formData.FROMNODEORIENTATION}
                onChangeText={(text) =>
                  setFormData({ ...formData, FROMNODEORIENTATION: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Loại phương tiện (ví dụ: B2,BIKE,CAR,Co,HGV,MC,W)"
                value={formData.TSYSSET}
                onChangeText={(text) =>
                  setFormData({ ...formData, TSYSSET: text })
                }
              />

              <Text style={styles.sectionTitle}>Tốc độ phương tiện</Text>

              <TextInput
                style={styles.input}
                placeholder="Tốc độ xe đạp (km/h)"
                keyboardType="numeric"
                value={formData.VCUR_PRTSYS_BIKE}
                onChangeText={(text) =>
                  setFormData({ ...formData, VCUR_PRTSYS_BIKE: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Tốc độ xe hơi (km/h)"
                keyboardType="numeric"
                value={formData.VCUR_PRTSYS_CAR}
                onChangeText={(text) =>
                  setFormData({ ...formData, VCUR_PRTSYS_CAR: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Tốc độ xe khách (km/h)"
                keyboardType="numeric"
                value={formData.VCUR_PRTSYS_CO}
                onChangeText={(text) =>
                  setFormData({ ...formData, VCUR_PRTSYS_CO: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Tốc độ xe tải (km/h)"
                keyboardType="numeric"
                value={formData.VCUR_PRTSYS_HGV}
                onChangeText={(text) =>
                  setFormData({ ...formData, VCUR_PRTSYS_HGV: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Tốc độ xe máy (km/h)"
                keyboardType="numeric"
                value={formData.VCUR_PRTSYS_MC}
                onChangeText={(text) =>
                  setFormData({ ...formData, VCUR_PRTSYS_MC: text })
                }
              />

              <View style={styles.formButtons}>
                <TouchableWithoutFeedback onPress={closeAddEditForm}>
                  <View style={[styles.formButton, styles.cancelButton]}>
                    <Text style={styles.buttonText}>Hủy</Text>
                  </View>
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback
                  onPress={saveRoute}
                  disabled={loading}
                >
                  <View style={[styles.formButton, styles.saveButton]}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {currentRoute ? "Cập nhật" : "Lưu"}
                      </Text>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm theo mã tuyến đường (Link ID)..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <TouchableWithoutFeedback onPress={() => openAddEditForm()}>
                  <View style={styles.addButton}>
                    <MaterialIcons name="add" size={24} color="#fff" />
                  </View>
                </TouchableWithoutFeedback>
              </View>

              <ScrollView style={styles.content}>
                {isBackendGraphDataLoading ? (
                  <ActivityIndicator size="large" color="#1E90FF" />
                ) : trafficData.features.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "Không tìm thấy kết quả"
                      : "Không có dữ liệu"}
                  </Text>
                ) : (
                  trafficData.features.map((feature) => {
                    const route = allRoutes.find(
                      (r) => r._id === feature.properties.id
                    );
                    return (
                      <View
                        key={feature.properties.id}
                        style={styles.routeItem}
                      >
                        <View style={styles.routeInfo}>
                          <Text style={styles.routeTitle}>
                            Link ID: {feature.properties.linkNo}
                          </Text>
                          <Text style={styles.routeSubtitle}>
                            Tên: {route?.NAME || "N/A"}
                          </Text>
                          <Text style={styles.routeSubtitle}>
                            Từ node: {route?.FROMNODENO || "N/A"} - Đến node:{" "}
                            {route?.TONODENO || "N/A"}
                          </Text>
                          <Text style={styles.routeSubtitle}>
                            Độ dài: {feature.properties.LENGTHDIR}
                          </Text>
                          <Text style={styles.routeSubtitle}>
                            Số làn: {route?.NUMLANES || "N/A"}
                          </Text>
                          <Text style={styles.routeSubtitle}>
                            Dung lượng: {route?.CAPPRT || "N/A"} xe/giờ
                          </Text>
                        </View>
                        <View style={styles.routeActions}>
                          <TouchableWithoutFeedback
                            onPress={() => openAddEditForm(route)}
                          >
                            <View style={styles.actionButton}>
                              <MaterialIcons
                                name="edit"
                                size={20}
                                color="#4CAF50"
                              />
                            </View>
                          </TouchableWithoutFeedback>
                          <TouchableWithoutFeedback
                            onPress={() => deleteRoute(feature.properties.id)}
                          >
                            <View style={styles.actionButton}>
                              <MaterialIcons
                                name="delete"
                                size={20}
                                color="#F44336"
                              />
                            </View>
                          </TouchableWithoutFeedback>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {isDeleteModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>
              Bạn có chắc muốn xóa tuyến đường Link ID {routeToDelete?.linkNo}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableWithoutFeedback onPress={confirmDeleteRoute}>
                <View style={[styles.modalButton, styles.deleteButton]}>
                  <Text style={styles.buttonText}>Xóa</Text>
                </View>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <View style={[styles.modalButton, styles.cancelButton]}>
                  <Text style={styles.buttonText}>Hủy</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </View>
      )}

      <View style={styles.floatingLayerControlsLeft}>
        <Text style={styles.controlPanelTitle}>Lớp dữ liệu:</Text>
        <View style={styles.layerButtonsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(layersVisibility).map((key) => (
              <TouchableWithoutFeedback
                key={key}
                onPress={() => toggleLayer(key)}
              >
                <View
                  style={[
                    styles.layerButton,
                    layersVisibility[key] ? styles.layerButtonActive : {},
                  ]}
                >
                  <Text style={styles.layerButtonText}>
                    {key === "traffic" ? "Giao thông" : "Tọa độ"}
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  mapContainer: {
    flex: 1,
  },
  homeButton: {
    position: "absolute",
    top: 20,
    left: 20,
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
    cursor: "pointer",
  },
  toggleButton: {
    position: "absolute",
    top: 20,
    right: 20,
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
    cursor: "pointer",
  },
  floatingLayerControlsLeft: {
    position: "absolute",
    bottom: 20,
    left: 15,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    padding: 10,
    flexDirection: "column",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 5,
  },
  controlPanelTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#2c3e50",
    textAlign: "left",
  },
  layerButtonsContainer: {
    flexDirection: "row",
    marginBottom: 5,
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  layerButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginTop: 5,
    marginRight: 8,
    borderWidth: 0,
    alignSelf: "flex-start",
    cursor: "pointer",
  },
  layerButtonActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  layerButtonText: {
    color: "black",
    fontWeight: "600",
    fontSize: 13,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginHorizontal: 20,
  },
  sidebar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#f8f8f8",
    borderLeftWidth: 1,
    borderLeftColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E90FF",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E90FF",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    padding: 10,
  },
  routeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#eee",
  },
  routeInfo: {
    flex: 1,
  },
  routeTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  routeSubtitle: {
    color: "#666",
    fontSize: 14,
  },
  routeActions: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 10,
    cursor: "pointer",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
  },
  selectingNodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  selectingNodeText: {
    fontSize: 14,
    color: "#1E90FF",
    fontWeight: "bold",
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  nodeInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  nodeInput: {
    flex: 1,
    marginRight: 5,
  },
  selectNodeButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  cancelSelectButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  routeRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    color: "#2c3e50",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  formButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginLeft: 10,
    cursor: "pointer",
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#1E90FF",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  intermediateButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  positionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E90FF",
  },
  positionButtonActive: {
    backgroundColor: "#1E90FF",
    borderColor: "#1E90FF",
  },
  positionButtonText: {
    marginLeft: 8,
    color: "#1E90FF",
    fontWeight: "600",
  },
  positionButtonTextActive: {
    color: "white",
  },
  intermediateCoordsContainer: {
    marginBottom: 15,
  },
  intermediateCoordsList: {
    maxHeight: 120,
    marginBottom: 10,
  },
  intermediateCoordItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    marginBottom: 5,
  },
  intermediateCoordText: {
    fontSize: 14,
    color: "#333",
  },
  intermediateCoordActions: {
    flexDirection: "row",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
});
