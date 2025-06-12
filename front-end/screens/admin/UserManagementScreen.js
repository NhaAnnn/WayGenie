// screens/UserManagementScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";

const UserManagementScreen = () => {
  // Mock User Data (dữ liệu giả lập cho tab Quản lý người dùng)
  const mockUsers = [
    {
      id: "user123",
      email: "user1@example.com",
      status: "active",
      registeredAt: "2023-01-15",
    },
    {
      id: "user456",
      email: "user2@example.com",
      status: "active",
      registeredAt: "2023-02-20",
    },
    {
      id: "user789",
      email: "user3@example.com",
      status: "blocked",
      registeredAt: "2023-03-10",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.sectionTitle}>Danh sách Người dùng (Mô phỏng)</Text>
      {mockUsers.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.cardTitle}>ID: {user.id}</Text>
          <Text>Email: {user.email}</Text>
          <Text>
            Trạng thái:{" "}
            <Text style={{ color: user.status === "active" ? "green" : "red" }}>
              {user.status === "active" ? "Hoạt động" : "Bị chặn"}
            </Text>
          </Text>
          <Text>Đăng ký: {user.registeredAt}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                Alert.alert(
                  "Xem chi tiết",
                  `Chi tiết người dùng: ${user.email}`
                )
              }
            >
              <Text style={styles.actionButtonText}>Xem chi tiết</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                user.status === "active"
                  ? styles.blockButton
                  : styles.unblockButton,
              ]}
              onPress={() =>
                Alert.alert(
                  "Hành động",
                  `${
                    user.status === "active" ? "Chặn" : "Bỏ chặn"
                  } người dùng: ${user.email}`
                )
              }
            >
              <Text style={styles.actionButtonText}>
                {user.status === "active" ? "Chặn" : "Bỏ chặn"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
  },
  blockButton: {
    backgroundColor: "red",
  },
  unblockButton: {
    backgroundColor: "green",
  },
});

export default UserManagementScreen;
