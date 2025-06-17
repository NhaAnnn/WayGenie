// screens/AdminDashboardScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  const handleLogout = () => {
    Alert.alert(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Đăng xuất",
          onPress: () => logout(),
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  // Dashboard items
  const dashboardItems = [
    {
      icon: "key-outline",
      title: "Quản lý Người dùng",
      screen: "UserManagement",
    },
    {
      icon: "git-branch-outline",
      title: "Giao thông giả lập",
      screen: "SimulatedTraffic",
    },
    {
      icon: "settings-outline",
      title: "Quản lý Thông báo",
      screen: "AdminFeatures",
    },
    {
      icon: "server-outline",
      title: "Cấu hình bến xe bus",
      screen: "DataSourceConfig",
    },
    {
      icon: "bar-chart-outline",
      title: "Phân tích và Báo cáo",
      action: () =>
        Alert.alert(
          "Tính năng sắp ra mắt",
          "Tính năng phân tích và báo cáo đang được phát triển."
        ),
    },

    {
      icon: "location-outline",
      title: "Quản lý POI",
      action: () =>
        Alert.alert(
          "Tính năng sắp ra mắt",
          "Tính năng quản lý POI đang được phát triển."
        ),
    },
  ];

  return (
    <View style={styles.webContainer}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Bảng điều khiển</Text>

        <View style={styles.sidebarMenu}>
          {dashboardItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={
                item.screen ? () => navigateToScreen(item.screen) : item.action
              }
            >
              <Ionicons name={item.icon} size={20} color="#007BFF" />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header with logout button in top right */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tổng quan hệ thống</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#e74c3c" />
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.contentScroll}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={30} color="#007BFF" />
              <Text style={styles.statValue}>1,024</Text>
              <Text style={styles.statLabel}>Người dùng</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="location-outline" size={30} color="#007BFF" />
              <Text style={styles.statValue}>5,678</Text>
              <Text style={styles.statLabel}>Địa điểm POI</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="analytics-outline" size={30} color="#007BFF" />
              <Text style={styles.statValue}>12,345</Text>
              <Text style={styles.statLabel}>Yêu cầu hôm nay</Text>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
            <View style={styles.activityList}>
              {[1, 2, 3, 4, 5].map((item) => (
                <View key={item} style={styles.activityItem}>
                  <Text style={styles.activityText}>
                    Cập nhật cấu hình định tuyến #{item}
                  </Text>
                  <Text style={styles.activityTime}>2 giờ trước</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
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
    width: 250,
    backgroundColor: "#fff",
    padding: 20,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  sidebarTitle: {
    fontSize: 18,
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
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginRight: 15,
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
  },
  activityTime: {
    color: "#999",
    fontSize: 12,
  },
});

export default AdminDashboardScreen;
