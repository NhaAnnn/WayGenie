// screens/AdminDashboardScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const AdminDashboardScreen = () => {
  const navigation = useNavigation();

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.headerTitle}>Bảng điều khiển Admin</Text>

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
    paddingTop: 50, // Điều chỉnh padding cho header
  },
  scrollContent: {
    paddingBottom: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007BFF",
    textAlign: "center",
    marginBottom: 30,
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
