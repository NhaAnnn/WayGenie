// screens/HomeScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions, // Vẫn cần Dimensions để lấy width
  Alert,
  Platform, // Import Platform for conditional styling
  SafeAreaView, // Use SafeAreaView for better handling of notches/status bar
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window"); // Lấy chiều rộng màn hình ở ngoài component

export default function HomeScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();

  // Kiểm tra kích thước màn hình để điều chỉnh bố cục
  // Biến này được định nghĩa trong phạm vi của component
  const isLargeScreen = width > 768;

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Chào mừng bạn 👋</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            {/* <Text style={styles.logoutButtonText}>Đăng xuất</Text> */}
          </TouchableOpacity>
        </View>

        {/* Feature Cards Grid */}
        {/* Sử dụng style responsive dựa trên isLargeScreen */}
        <View
          style={
            isLargeScreen ? styles.gridContainerWide : styles.gridContainer
          }
        >
          {/* Card: Bản đồ Hiện trạng */}
          <TouchableOpacity
            // Áp dụng style 'card' và thêm style cho width dựa trên isLargeScreen
            style={[styles.card, { width: isLargeScreen ? "48%" : "100%" }]}
            onPress={() => navigateToScreen("CurrentStatusMap")}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="map-outline" size={40} color="#007BFF" />
            </View>
            <Text style={styles.cardTitle}>Bản đồ Hiện trạng</Text>
            <Text style={styles.cardDescription}>
              Tìm đường, xem tình hình giao thông và sự cố theo thời gian thực.
            </Text>
          </TouchableOpacity>

          {/* Card: Bản đồ Mô phỏng */}
          <TouchableOpacity
            style={[styles.card, { width: isLargeScreen ? "48%" : "100%" }]}
            onPress={() => navigateToScreen("SimulationMap")}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="analytics-outline" size={40} color="#007BFF" />
            </View>
            <Text style={styles.cardTitle}>Bản đồ Mô phỏng</Text>
            <Text style={styles.cardDescription}>
              Phân tích và dự đoán giao thông dựa trên dữ liệu giả lập.
            </Text>
          </TouchableOpacity>

          {/* Card: Thông tin & Hỗ trợ */}
          <TouchableOpacity
            style={[styles.card, { width: isLargeScreen ? "48%" : "100%" }]}
            onPress={() =>
              Alert.alert(
                "Thông tin & Hỗ trợ",
                "Cung cấp thông tin tổng quan về ứng dụng, hướng dẫn sử dụng và cách liên hệ hỗ trợ."
              )
            }
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name="information-circle-outline"
                size={40}
                color="#007BFF"
              />
            </View>
            <Text style={styles.cardTitle}>Thông tin & Hỗ trợ</Text>
            <Text style={styles.cardDescription}>
              Các tính năng khác, hướng dẫn và hỗ trợ người dùng.
            </Text>
          </TouchableOpacity>

          {/* Card: Cài đặt Cá nhân */}
          <TouchableOpacity
            style={[styles.card, { width: isLargeScreen ? "48%" : "100%" }]}
            onPress={() => navigateToScreen("PersonalInfo")}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name="person-circle-outline"
                size={40}
                color="#007BFF"
              />
            </View>
            <Text style={styles.cardTitle}>Cài đặt Cá nhân</Text>
            <Text style={styles.cardDescription}>
              Quản lý hồ sơ, sở thích và tùy chỉnh ứng dụng của bạn.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer hoặc thông tin thêm */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 WayGenie. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef2f6", // Màu nền nhẹ nhàng
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === "android" ? 30 : 20, // Padding cho status bar
    paddingHorizontal: 20,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
    paddingBottom: 10,
    borderBottomWidth: 0, // Không còn đường kẻ dưới
    borderBottomColor: "#ddd",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c3e50", // Màu chữ đậm hơn
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e74c3c", // Màu đỏ cam
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25, // Bo tròn nhiều hơn
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  // Grid cho màn hình nhỏ (1 cột)
  gridContainer: {
    width: "100%",
    alignItems: "center",
  },
  // Grid cho màn hình lớn (2 cột)
  gridContainerWide: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Khoảng cách giữa các thẻ
  },
  card: {
    backgroundColor: "#ffffff", // Nền thẻ trắng
    borderRadius: 20, // Bo tròn góc nhiều hơn
    padding: 25,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    backgroundColor: "#e0f7fa", // Nền màu xanh nhạt cho biểu tượng
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#34495e", // Màu chữ đậm
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: "#7f8c8d", // Màu chữ xám nhạt
    lineHeight: 20,
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
    width: "100%",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#95a5a6",
  },
});
