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
  // Khởi tạo các state
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
    NAME: "",
    TSYSSET: "",
    LENGTH: "",
    VC: "",
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

  // State cho selectbox TSYSSET
  const [tsyssetOptions, setTsyssetOptions] = useState([
    { label: "Xe buýt", value: "B2", selected: false },
    { label: "Xe đạp", value: "BIKE", selected: false },
    { label: "Xe hơi", value: "CAR", selected: false },
    { label: "Xe khách", value: "Co", selected: false },
    { label: "Xe tải", value: "HGV", selected: false },
    { label: "Xe máy", value: "MC", selected: false },
    { label: "Đi bộ", value: "W", selected: false },
  ]);

  // Định nghĩa URL API
  const COORDINATES_API_URL = `${BACKEND_API_BASE_URL}/coordinates`;
  const ROUTES_API_URL = `${BACKEND_API_BASE_URL}/routes`;
  const debounceTimeout = useRef(null);

  // Hàm tạo Link ID ngẫu nhiên
  const generateRandomLinkId = useCallback(() => {
    return Math.floor(100000 + Math.random() * 9000000);
  }, []);

  // Hàm kiểm tra Link ID đã tồn tại
  const checkLinkIdExists = useCallback(
    (id) => {
      return allRoutes.some((route) => route.linkNo === id);
    },
    [allRoutes]
  );

  // Hàm lấy Link ID mới không trùng lặp
  const getUniqueLinkId = useCallback(() => {
    let newId;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      newId = generateRandomLinkId();
      attempts++;
      if (attempts >= maxAttempts) {
        toast.error("Không thể tạo Link ID mới sau nhiều lần thử");
        return null;
      }
    } while (checkLinkIdExists(newId));

    return newId;
  }, [generateRandomLinkId, checkLinkIdExists]);

  // Hàm xử lý khi chọn phương tiện TSYSSET
  const handleTsyssetChange = (index) => {
    const updatedOptions = [...tsyssetOptions];
    updatedOptions[index].selected = !updatedOptions[index].selected;
    setTsyssetOptions(updatedOptions);

    const selectedValues = updatedOptions
      .filter((option) => option.selected)
      .map((option) => option.value)
      .join(",");

    setFormData({
      ...formData,
      TSYSSET: selectedValues || "",
    });
  };

  // Hàm lấy dữ liệu từ backend
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
            console.log("Dữ liệu tuyến đường từ backend:", routesData);
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

  // Hàm xử lý dữ liệu thời gian thực
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
        console.log("Cập nhật trafficData:", trafficFeatures);
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

  // Hàm tìm kiếm tuyến đường
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
          console.log("Cập nhật trafficData (không có query):", newFeatures);
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
        console.log("Cập nhật trafficData (lọc):", newFeatures);
        return { type: "FeatureCollection", features: newFeatures };
      }
      return prev;
    });
  };

  // Hàm mở form thêm/chỉnh sửa
  const openAddEditForm = (route = null) => {
    const newLinkId = route ? null : getUniqueLinkId();

    console.log("Dữ liệu tuyến đường:", route);
    if (route) {
      if (!route.VC || !route.VCUR_PRTSYS_BIKE) {
        console.warn(
          "Thiếu các trường quan trọng trong dữ liệu tuyến đường:",
          route
        );
        toast.error("Dữ liệu tuyến đường không đầy đủ!");
      }
    }
    setCurrentRoute(route);
    setFormData({
      linkNo: route?.linkNo?.toString() || newLinkId?.toString() || "",
      FROMNODENO: route?.FROMNODENO?.toString() || "",
      TONODENO: route?.TONODENO?.toString() || "",
      NAME: route?.NAME || "",
      TSYSSET: route?.TSYSSET || "",
      LENGTH: route?.LENGTH?.toString() || "",
      VC: route?.VC?.toString() || "",
      VCUR_PRTSYS_BIKE: route?.VCUR_PRTSYS_BIKE?.toString() || "",
      VCUR_PRTSYS_CAR: route?.VCUR_PRTSYS_CAR?.toString() || "",
      VCUR_PRTSYS_CO: route?.VCUR_PRTSYS_CO?.toString() || "",
      VCUR_PRTSYS_HGV: route?.VCUR_PRTSYS_HGV?.toString() || "",
      VCUR_PRTSYS_MC: route?.VCUR_PRTSYS_MC?.toString() || "",
    });

    // Khởi tạo giá trị TSYSSET
    if (route?.TSYSSET) {
      const selectedValues = route.TSYSSET.split(",");
      setTsyssetOptions((prevOptions) =>
        prevOptions.map((option) => ({
          ...option,
          selected: selectedValues.includes(option.value),
        }))
      );
    } else {
      setTsyssetOptions((prevOptions) =>
        prevOptions.map((option) => ({
          ...option,
          selected: false,
        }))
      );
    }

    setIntermediateCoords(route?.geometry?.coordinates?.slice(1, -1) || []);
    setIsAddingRoute(true);
    setIsSidebarOpen(true);
    setEditingCoordIndex(null);
  };

  // Hàm đóng form
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
      NAME: "",
      TSYSSET: "",
      LENGTH: "",
      VC: "",
      VCUR_PRTSYS_BIKE: "",
      VCUR_PRTSYS_CAR: "",
      VCUR_PRTSYS_CO: "",
      VCUR_PRTSYS_HGV: "",
      VCUR_PRTSYS_MC: "",
    });
  };

  // Hàm xác thực dữ liệu form (đã cập nhật)
  const validateForm = () => {
    // Kiểm tra Link ID
    if (!formData.linkNo || isNaN(formData.linkNo)) {
      toast.error("Link ID phải là số hợp lệ");
      return false;
    }

    // Kiểm tra trùng lặp Link ID khi thêm mới
    if (!currentRoute && checkLinkIdExists(parseInt(formData.linkNo))) {
      toast.error("Link ID đã tồn tại trong hệ thống");
      return false;
    }

    // Kiểm tra From Node
    if (!formData.FROMNODENO || isNaN(formData.FROMNODENO)) {
      toast.error("From Node phải là số hợp lệ");
      return false;
    }

    // Kiểm tra To Node
    if (!formData.TONODENO || isNaN(formData.TONODENO)) {
      toast.error("To Node phải là số hợp lệ");
      return false;
    }

    // Kiểm tra From Node và To Node không giống nhau
    if (formData.FROMNODENO === formData.TONODENO) {
      toast.error("From Node và To Node không được giống nhau");
      return false;
    }

    // Kiểm tra độ dài > 0
    if (!formData.LENGTH || parseFloat(formData.LENGTH) <= 0) {
      toast.error("Độ dài phải lớn hơn 0");
      return false;
    }

    // Kiểm tra VC > 0
    if (!formData.VC || parseFloat(formData.VC) < 0) {
      toast.error("Tỷ lệ V/C không được nhỏ hơn 0");
      return false;
    }

    // Kiểm tra ít nhất một loại phương tiện được chọn
    if (!formData.TSYSSET || formData.TSYSSET.trim() === "") {
      toast.error("Vui lòng chọn ít nhất một loại phương tiện");
      return false;
    }

    // Kiểm tra các thông số phương tiện
    const vehicleParams = [
      "VCUR_PRTSYS_BIKE",
      "VCUR_PRTSYS_CAR",
      "VCUR_PRTSYS_CO",
      "VCUR_PRTSYS_HGV",
      "VCUR_PRTSYS_MC",
    ];

    for (const param of vehicleParams) {
      const value = formData[param];
      if (!value || isNaN(value) || parseInt(value) <= 0) {
        toast.error(`Thông số ${param} không hợp lệ`);
        return false;
      }
    }

    return true;
  };

  // Hàm lưu tuyến đường (đã cập nhật)
  const saveRoute = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Kiểm tra lại một lần nữa trước khi gửi dữ liệu
      const vehicleSpeeds = [
        parseInt(formData.VCUR_PRTSYS_BIKE),
        parseInt(formData.VCUR_PRTSYS_CAR),
        parseInt(formData.VCUR_PRTSYS_CO),
        parseInt(formData.VCUR_PRTSYS_HGV),
        parseInt(formData.VCUR_PRTSYS_MC),
      ];

      if (vehicleSpeeds.some((speed) => speed <= 0)) {
        throw new Error("Tốc độ phương tiện phải lớn hơn 0");
      }

      if (parseFloat(formData.LENGTH) <= 0) {
        throw new Error("Độ dài phải lớn hơn 0");
      }

      if (parseFloat(formData.VC) <= 0) {
        throw new Error("Tỷ lệ V/C phải lớn hơn 0");
      }

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

      // Tạo payload
      const payload = {
        ...(method === "POST" && { linkNo: parseInt(formData.linkNo) }),
        FROMNODENO: parseInt(formData.FROMNODENO),
        TONODENO: parseInt(formData.TONODENO),
        NAME: formData.NAME || "",
        TSYSSET: formData.TSYSSET || "B2,BIKE,CAR,Co,HGV,MC,W",
        LENGTH: parseFloat(formData.LENGTH) || 0,
        VC: parseFloat(formData.VC) || 0,
        VCUR_PRTSYS_BIKE: parseInt(formData.VCUR_PRTSYS_BIKE) || 0,
        VCUR_PRTSYS_CAR: parseInt(formData.VCUR_PRTSYS_CAR) || 0,
        VCUR_PRTSYS_CO: parseInt(formData.VCUR_PRTSYS_CO) || 0,
        VCUR_PRTSYS_HGV: parseInt(formData.VCUR_PRTSYS_HGV) || 0,
        VCUR_PRTSYS_MC: parseInt(formData.VCUR_PRTSYS_MC) || 0,
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
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
        console.error("Phản hồi lỗi:", errorData);
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

  // Hàm xóa tuyến đường
  const deleteRoute = async (id) => {
    const route = allRoutes.find((r) => r._id === id);
    if (!route) {
      toast.error("Không tìm thấy tuyến đường");
      return;
    }
    setRouteToDelete(route);
    setIsDeleteModalVisible(true);
  };

  // Hàm xác nhận xóa
  const confirmDeleteRoute = async () => {
    try {
      setLoading(true);
      const url = `${ROUTES_API_URL}/${routeToDelete._id}`;
      console.log("Xóa tuyến đường - URL:", url);
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Phản hồi lỗi:", errorData);
        throw new Error(errorData.message || "Không thể xóa tuyến đường");
      }

      await fetchGraphData();
      toast.success("Đã xóa tuyến đường thành công");
      setIsDeleteModalVisible(false);
      setRouteToDelete(null);
    } catch (error) {
      toast.error(`Lỗi khi xóa tuyến đường: ${error.message}`);
      console.error("Lỗi xóa tuyến đường:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý khi nhấn vào bản đồ
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

  // Hàm xóa tọa độ trung gian
  const deleteIntermediateCoord = (index) => {
    setIntermediateCoords((prev) => prev.filter((_, i) => i !== index));
    toast.success(`Đã xóa tọa độ trung gian ${index + 1}`);
    if (editingCoordIndex === index) {
      setEditingCoordIndex(null);
      setIsSelectingIntermediate(false);
    }
  };

  // Hàm chỉnh sửa tọa độ trung gian
  const editIntermediateCoord = (index) => {
    setEditingCoordIndex(index);
    setIsSelectingIntermediate(true);
  };

  // Hàm xử lý khi nhấn vào marker
  const handleCoordinateMarkerPress = useCallback(
    (feature) => {
      if (selectingNode) {
        if (!feature || !feature.properties || !feature.properties.node_id) {
          console.error("Dữ liệu feature không hợp lệ:", feature);
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

  // Hàm bắt đầu chọn node
  const startSelectingNode = (type) => {
    setSelectingNode(type);
  };

  // Hàm hủy chọn node
  const cancelSelectingNode = () => {
    setSelectingNode(null);
  };

  // Hàm bật/tắt lớp dữ liệu
  const toggleLayer = (layerName) => {
    setLayersVisibility((prevState) => ({
      ...prevState,
      [layerName]: !prevState[layerName],
    }));
  };

  // Hàm đóng thông tin tọa độ
  const closeCoordinatesInfo = () => {
    setCoordinatesInfo(null);
  };

  // useEffect để cập nhật chiều rộng màn hình
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

  // useEffect để lấy dữ liệu ban đầu
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // useEffect để xử lý dữ liệu thời gian thực
  useEffect(() => {
    if (!isBackendGraphDataLoading && !isError) {
      processRealtimeData();
    }
  }, [isBackendGraphDataLoading, isError, processRealtimeData]);

  // useEffect để lấy tuyến đường khi có tọa độ đầu cuối
  useEffect(() => {
    if (startCoords && endCoords) {
      fetchRoute();
    }
  }, [mode, routePreference]);

  // Kiểm tra trạng thái tải
  const isLoading =
    isBackendGraphDataLoading ||
    !trafficData.features.length ||
    !coordinatesData.features.length;

  // Giao diện chính
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

              <Text style={styles.label}>Link ID</Text>
              <View style={styles.idGenerationRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập id*"
                  keyboardType="numeric"
                  value={formData.linkNo}
                  onChangeText={(text) =>
                    setFormData({ ...formData, linkNo: text })
                  }
                  editable={!currentRoute}
                />
                {!currentRoute && (
                  <TouchableWithoutFeedback
                    onPress={() => {
                      const newId = getUniqueLinkId();
                      if (newId) {
                        setFormData({ ...formData, linkNo: newId.toString() });
                      }
                    }}
                  >
                    <View style={styles.generateIdButton}>
                      <MaterialIcons name="autorenew" size={20} color="#fff" />
                      <Text style={styles.generateIdText}>Tạo ID mới</Text>
                    </View>
                  </TouchableWithoutFeedback>
                )}
              </View>

              <View style={styles.routeRow}>
                <View style={styles.nodeInputContainer}>
                  <Text style={styles.label}>Node đi</Text>
                  <View style={styles.nodeInputWrapper}>
                    <TextInput
                      style={[styles.input, styles.nodeInput]}
                      placeholder="Nhập node đi*"
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
                </View>
                <View style={styles.nodeInputContainer}>
                  <Text style={styles.label}>Node đến</Text>
                  <View style={styles.nodeInputWrapper}>
                    <TextInput
                      style={[styles.input, styles.nodeInput]}
                      placeholder="Nhập node đến*"
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

              <Text style={styles.label}>Tên tuyến đường</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên tuyến đường"
                value={formData.NAME}
                onChangeText={(text) =>
                  setFormData({ ...formData, NAME: text })
                }
              />

              <Text style={styles.label}>Độ dài (km)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập độ dài (km)*"
                keyboardType="numeric"
                value={formData.LENGTH}
                onChangeText={(text) => {
                  // Cho phép số thập phân nhưng phải > 0
                  const cleanedText = text.replace(/[^0-9.]/g, "");
                  setFormData({ ...formData, LENGTH: cleanedText });
                }}
              />

              <Text style={styles.label}>Tỷ lệ V/C</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tỷ lệ V/C"
                keyboardType="numeric"
                value={formData.VC}
                onChangeText={(text) => {
                  // Cho phép số thập phân nhưng phải > 0
                  const cleanedText = text.replace(/[^0-9.]/g, "");
                  setFormData({ ...formData, VC: cleanedText });
                }}
              />

              {/* Multi-select cho TSYSSET */}
              <Text style={styles.label}>Loại phương tiện</Text>
              <View style={styles.multiSelectContainer}>
                {tsyssetOptions.map((option, index) => (
                  <TouchableWithoutFeedback
                    key={option.value}
                    onPress={() => handleTsyssetChange(index)}
                  >
                    <View
                      style={[
                        styles.multiSelectOption,
                        option.selected && styles.multiSelectOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.multiSelectOptionText,
                          option.selected &&
                            styles.multiSelectOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </TouchableWithoutFeedback>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Thông số phương tiện</Text>
              <View style={styles.vehicleParamsContainer}>
                <View style={styles.vehicleParamsColumn}>
                  <Text style={styles.label}>Tốc độ xe đạp (km/h)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tốc độ xe đạp"
                    keyboardType="numeric"
                    value={formData.VCUR_PRTSYS_BIKE}
                    onChangeText={(text) => {
                      // Chỉ cho phép nhập số nguyên dương
                      const cleanedText = text.replace(/[^0-9]/g, "");
                      setFormData({
                        ...formData,
                        VCUR_PRTSYS_BIKE: cleanedText,
                      });
                    }}
                  />

                  <Text style={styles.label}>Tốc độ xe hơi (km/h)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tốc độ xe hơi"
                    keyboardType="numeric"
                    value={formData.VCUR_PRTSYS_CAR}
                    onChangeText={(text) => {
                      const cleanedText = text.replace(/[^0-9]/g, "");
                      setFormData({
                        ...formData,
                        VCUR_PRTSYS_CAR: cleanedText,
                      });
                    }}
                  />

                  <Text style={styles.label}>Tốc độ xe khách (km/h)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tốc độ xe khách"
                    keyboardType="numeric"
                    value={formData.VCUR_PRTSYS_CO}
                    onChangeText={(text) => {
                      const cleanedText = text.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, VCUR_PRTSYS_CO: cleanedText });
                    }}
                  />
                </View>

                <View style={styles.vehicleParamsColumn}>
                  <Text style={styles.label}>Tốc độ xe tải (km/h)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập tốc độ xe tải"
                    keyboardType="numeric"
                    value={formData.VCUR_PRTSYS_HGV}
                    onChangeText={(text) => {
                      const cleanedText = text.replace(/[^0-9]/g, "");
                      setFormData({
                        ...formData,
                        VCUR_PRTSYS_HGV: cleanedText,
                      });
                    }}
                  />

                  <Text style={styles.label}>Tốc độ xe máy (km/h)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập tốc độ xe máy"
                    keyboardType="numeric"
                    value={formData.VCUR_PRTSYS_MC}
                    onChangeText={(text) => {
                      const cleanedText = text.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, VCUR_PRTSYS_MC: cleanedText });
                    }}
                  />
                </View>
              </View>

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
                  placeholder="Tìm kiếm theo Link ID..."
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
                            Khoảng cách: {route?.LENGTH || "N/A"} km
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

// Định nghĩa các style cho giao diện
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
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2c3e50",
    marginBottom: 5,
  },
  nodeInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  nodeInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  nodeInput: {
    flex: 1,
    marginRight: 5,
    height: 40,
  },
  selectNodeButton: {
    width: 40,
    marginBottom: 15,
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
    marginBottom: 6,
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
  multiSelectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  vehicleParamsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  vehicleParamsColumn: {
    flex: 1,
    paddingHorizontal: 5,
  },
  multiSelectOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  multiSelectOptionSelected: {
    backgroundColor: "#1E90FF",
    borderColor: "#1E90FF",
  },
  multiSelectOptionText: {
    color: "#333",
  },
  multiSelectOptionTextSelected: {
    color: "white",
  },
  idGenerationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  generateIdButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    marginBottom: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#1E90FF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    cursor: "pointer",
  },
  generateIdText: {
    marginLeft: 8,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
