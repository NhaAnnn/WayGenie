import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useAuth } from "../../context/AuthContext"; // Import context

export default function AdminDashboardScreen() {
  const { logout } = useAuth(); // Lấy hàm logout từ context

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chào mừng Admin!</Text>
      <Text>Đây là trang quản trị.</Text>
      {/* Các chức năng quản trị */}
      <Button title="Đăng xuất" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
