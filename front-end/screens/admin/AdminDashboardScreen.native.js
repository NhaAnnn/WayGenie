// screens/AdminDashboardScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform, // Import Platform để điều chỉnh padding cho iOS
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext"; // Import useAuth hook

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth(); // Lấy hàm logout từ AuthContext

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
          onPress: () => logout(), // Gọi hàm logout từ AuthContext
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bảng điều khiển Admin</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          {/* <Text style={styles.logoutButtonText}>Đăng xuất</Text> */}
        </TouchableOpacity>
      </View>

      <View style={styles.gridContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen("AdminFeatures")}
        >
          <Ionicons name="settings-outline" size={50} color="#007BFF" />
          <Text style={styles.cardText}>Quản lý Tính năng Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen("DataSourceConfig")}
        >
          <Ionicons name="server-outline" size={50} color="#007BFF" />
          <Text style={styles.cardText}>Cấu hình Nguồn Dữ liệu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen("SimulatedTraffic")}
        >
          <Ionicons name="git-branch-outline" size={50} color="#007BFF" />
          <Text style={styles.cardText}>Cấu hình Tiêu chí Định tuyến</Text>
        </TouchableOpacity>

        {/* Thêm các chức năng khác dưới dạng thẻ */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            Alert.alert(
              "Tính năng sắp ra mắt",
              "Tính năng phân tích và báo cáo đang được phát triển."
            )
          }
        >
          <Ionicons name="bar-chart-outline" size={50} color="#007BFF" />
          <Text style={styles.cardText}>Phân tích và Báo cáo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen("UserManagement")}
        >
          <Ionicons name="key-outline" size={50} color="#007BFF" />
          <Text style={styles.cardText}>Quản lý Người dùng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            Alert.alert(
              "Tính năng sắp ra mắt",
              "Tính năng quản lý POI đang được phát triển."
            )
          }
        >
          <Ionicons name="location-outline" size={50} color="#007BFF" />
          <Text style={styles.cardText}>Quản lý POI</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    paddingBottom: 20,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#007BFF",
    paddingTop: Platform.OS === "android" ? 40 : 60, // Adjust padding for status bar
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 30, // Thêm khoảng cách với phần grid bên dưới
  },
  headerTitle: {
    fontSize: 24, // Giảm kích thước tiêu đề một chút để phù hợp với nút logout
    fontWeight: "bold",
    color: "#fff", // Màu chữ trắng
    textAlign: "center",
    flex: 1, // Chiếm hết không gian còn lại
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e74c3c", // Màu đỏ cam cho nút đăng xuất
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 5,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    margin: 10,
    width: "45%", // Khoảng 2 thẻ mỗi hàng
    aspectRatio: 1, // Giữ tỷ lệ khung hình vuông
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginTop: 10,
  },
});

export default AdminDashboardScreen;
