import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_API_BASE_URL } from "../../secrets.js";

const COORDINATES_API_URL = `${BACKEND_API_BASE_URL}/coordinates`; // Endpoint cho POIs
const ROUTES_API_URL = `${BACKEND_API_BASE_URL}/routes`; // Endpoint cho tuyến đường
const AQIS_API_URL = `${BACKEND_API_BASE_URL}/aqis`; // Endpoint cho trạm quan trắc
const AUTH_API_URL = `${BACKEND_API_BASE_URL}/auth`; // Endpoint cho người dùng

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { logout, authToken, userRole } = useAuth();

  const [stats, setStats] = useState({
    routes: 0,
    pois: 0,
    stations: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!authToken) {
        toast.error("Vui lòng đăng nhập để xem thống kê.", {
          position: "top-right",
          autoClose: 3000,
        });
        navigation.navigate("Login");
        return;
      }

      if (userRole !== "admin") {
        toast.error("Chỉ admin mới có quyền truy cập dashboard.", {
          position: "top-right",
          autoClose: 3000,
        });
        navigation.navigate("Home");
        return;
      }

      try {
        setLoading(true);
        const [routesResponse, poisResponse, stationsResponse, usersResponse] =
          await Promise.all([
            axios.get(ROUTES_API_URL, {
              headers: { Authorization: `Bearer ${authToken}` },
            }),
            axios.get(COORDINATES_API_URL, {
              headers: { Authorization: `Bearer ${authToken}` },
            }),
            axios.get(AQIS_API_URL, {
              headers: { Authorization: `Bearer ${authToken}` },
            }),
            axios.get(AUTH_API_URL, {
              headers: { Authorization: `Bearer ${authToken}` },
            }),
          ]);

        // console.log("Routes Response:", routesResponse.data);
        // console.log("POIs Response:", poisResponse.data);
        // console.log("Stations Response:", stationsResponse.data);
        // console.log("Users Response:", usersResponse.data);

        setStats({
          routes: routesResponse.data.length || routesResponse.data.total || 0,
          pois: poisResponse.data.length || poisResponse.data.total || 0,
          stations:
            stationsResponse.data.length || stationsResponse.data.total || 0,
          users: usersResponse.data.length || usersResponse.data.total || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error.response?.data || error);
        toast.error(
          error.response?.data?.message || "Lỗi khi lấy dữ liệu thống kê.",
          {
            position: "top-right",
            autoClose: 3000,
          }
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken, userRole, navigation]);

  const navigateToScreen = (screenName) => {
    if (screenName === "") {
      toast.info("Tính năng Báo cáo thống kê sẽ sớm được ra mắt!", {
        position: "top-right",
        autoClose: 3000,
      });
    } else {
      navigation.navigate(screenName);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Đăng xuất thành công!", {
        position: "top-right",
        autoClose: 2000,
      });
      navigation.navigate("Login");
    } catch (error) {
      toast.error("Không thể đăng xuất. Vui lòng thử lại.", {
        position: "top-right",
        autoClose: 3000,
      });
      console.error("Logout error:", error);
    }
  };

  const dashboardItems = [
    {
      icon: "key-outline",
      title: "Quản lý Tài khoản Người dùng",
      screen: "UserManagement",
    },
    {
      icon: "git-branch-outline",
      title: "Quản lý Tuyến đường",
      screen: "RouteManagement",
    },
    {
      icon: "map-outline",
      title: "Quản lý Tọa độ",
      screen: "CoordinateManagement",
    },
    {
      icon: "cellular-outline",
      title: "Quản lý Trạm quan trắc",
      screen: "StationManagement",
    },
    {
      icon: "git-branch-outline",
      title: "Giao thông giả lập",
      screen: "SimulatedTraffic",
    },
    {
      icon: "cloud-upload",
      title: "Thêm tọa độ và tuyến đường từ file",
      screen: "UploadManagement",
    },
    {
      icon: "bar-chart-outline",
      title: "Báo cáo thống kê",
      screen: "",
    },
  ];

  return (
    <View style={styles.webContainer}>
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Bảng điều khiển</Text>
        <View style={styles.sidebarMenu}>
          {dashboardItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => navigateToScreen(item.screen)}
            >
              <Ionicons name={item.icon} size={20} color="#007BFF" />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tổng quan hệ thống</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#e74c3c" />
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.contentScroll}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={30} color="#007BFF" />
              <Text style={styles.statValue}>
                {loading ? "Đang tải..." : stats.users}
              </Text>
              <Text style={styles.statLabel}>Người dùng</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="git-branch-outline" size={30} color="#007BFF" />
              <Text style={styles.statValue}>
                {loading ? "Đang tải..." : stats.routes}
              </Text>
              <Text style={styles.statLabel}>Tuyến đường</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="location-outline" size={30} color="#007BFF" />
              <Text style={styles.statValue}>
                {loading ? "Đang tải..." : stats.pois}
              </Text>
              <Text style={styles.statLabel}>Tọa độ điểm</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cellular-outline" size={30} color="#007BFF" />
              <Text style={styles.statValue}>
                {loading ? "Đang tải..." : stats.stations}
              </Text>
              <Text style={styles.statLabel}>Trạm quan trắc</Text>
            </View>
          </View>

          {/* <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
            <View style={styles.activityList}>
              <View style={styles.activityItem}>
                <Text style={styles.activityText}>
                  Thêm tuyến đường mới #47 (Đường Nguyễn Văn Linh)
                </Text>
                <Text style={styles.activityTime}>30 phút trước</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityText}>
                  Cập nhật tọa độ trạm quan trắc Q.7
                </Text>
                <Text style={styles.activityTime}>2 giờ trước</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityText}>
                  Thêm 3 trạm quan trắc mới khu vực trung tâm
                </Text>
                <Text style={styles.activityTime}>5 giờ trước</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityText}>
                  Điều chỉnh lộ trình tuyến đường số 12
                </Text>
                <Text style={styles.activityTime}>1 ngày trước</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityText}>
                  Cập nhật dữ liệu giao thông từ trạm quan trắc Q.1
                </Text>
                <Text style={styles.activityTime}>1 ngày trước</Text>
              </View>
            </View>
          </View> */}
        </ScrollView>
      </View>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
  },
  sidebar: {
    width: 280,
    backgroundColor: "#fff",
    padding: 20,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sidebarMenu: {
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  menuItemText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#555",
  },
  mainContent: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#e74c3c",
    fontWeight: "500",
  },
  contentScroll: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: 30,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#333",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  activityList: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  activityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  activityText: {
    color: "#555",
    flex: 1,
    marginRight: 10,
  },
  activityTime: {
    color: "#999",
    fontSize: 12,
  },
});

export default AdminDashboardScreen;
