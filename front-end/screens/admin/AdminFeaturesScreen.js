// screens/AdminFeaturesScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform, // Import Platform for conditional styling
} from "react-native";
// Removed TabView, TabBar, and Picker imports
// import { TabView, TabBar } from "react-native-tab-view";
// import { Picker } from "@react-native-picker/picker";

// Removed axios import for server simulation
// import axios from "axios";

// Removed Base URL as we are simulating the server
// const NODE_MONGO_BACKEND_BASE_URL = "http://localhost:3000";

const AdminFeaturesScreen = () => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "users", title: "Người dùng" },
    { key: "traffic", title: "Giao thông giả lập" },
    { key: "announcements", title: "Thông báo" },
  ]);

  // --- States for Announcements ---
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState("system");
  const [announcementDisplayType, setAnnouncementDisplayType] =
    useState("popup");
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [announcements, setAnnouncements] = useState([
    {
      _id: "ann_1",
      title: "Chào mừng đến với WayGenie!",
      message: "Ứng dụng bản đồ thông minh của bạn đã sẵn sàng.",
      type: "system",
      displayType: "popup",
      status: "published",
      timestamp: new Date("2024-01-01T09:00:00Z").toISOString(),
    },
    {
      _id: "ann_2",
      title: "Cập nhật tính năng mới: Mô phỏng giao thông",
      message: "Khám phá chức năng mô phỏng giao thông nâng cao của chúng tôi.",
      type: "feature_update",
      displayType: "banner",
      status: "published",
      timestamp: new Date("2024-05-15T10:30:00Z").toISOString(),
    },
  ]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);

  // --- States for Simulated Traffic Incidents (NOW MOCKED) ---
  const [incidentLocation, setIncidentLocation] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentType, setIncidentType] = useState("accident");
  const [incidentSeverity, setIncidentSeverity] = useState("medium");
  const [isAddingIncident, setIsAddingIncident] = useState(false);

  // MOCK data for simulated incidents
  const [simulatedIncidents, setSimulatedIncidents] = useState([
    {
      id: "sim_1",
      location: "Nguyễn Thị Minh Khai",
      description: "Tắc đường nhẹ",
      type: "congestion",
      severity: "low",
      isActive: true,
      timestamp: new Date("2024-06-01T10:00:00Z"),
    },
    {
      id: "sim_2",
      location: "Cầu Sài Gòn",
      description: "Tai nạn giao thông",
      type: "accident",
      severity: "high",
      isActive: true,
      timestamp: new Date("2024-06-05T14:30:00Z"),
    },
    {
      id: "sim_3",
      location: "Đường Tôn Đức Thắng",
      description: "Đang sửa chữa đường",
      type: "road_closure",
      severity: "medium",
      isActive: false,
      timestamp: new Date("2024-05-20T08:00:00Z"),
    },
  ]);

  // Mock User Data (for User Management tab)
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

  // --- MOCK ANNOUNCEMENT FUNCTIONS (in-memory simulation) ---

  // No actual fetching, just a placeholder function
  const fetchAnnouncementsFromBackend = async () => {
    setIsLoadingAnnouncements(true);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Data is already in state, so no fetch needed
    setIsLoadingAnnouncements(false);
  };

  const sendAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.");
      return;
    }

    setIsSendingAnnouncement(true);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newAnnouncement = {
      _id: `ann_${Date.now()}`, // Unique ID
      title: announcementTitle,
      message: announcementMessage,
      type: announcementType,
      displayType: announcementDisplayType,
      status: "published",
      timestamp: new Date().toISOString(),
    };

    setAnnouncements((prevAnnouncements) => [
      newAnnouncement,
      ...prevAnnouncements,
    ]);
    Alert.alert("Thành công", "Thông báo đã được gửi (giả lập).");
    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setIsSendingAnnouncement(false);
  };

  // --- SIMULATED TRAFFIC INCIDENT FUNCTIONS (in-memory simulation) ---

  const addSimulatedIncident = () => {
    if (!incidentLocation || !incidentDescription) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ địa điểm và mô tả sự cố.");
      return;
    }

    setIsAddingIncident(true);
    // Simulate adding to a mock array
    const newIncident = {
      id: `sim_${Date.now()}`, // Unique ID
      location: incidentLocation,
      description: incidentDescription,
      type: incidentType,
      severity: incidentSeverity,
      isActive: true,
      timestamp: new Date(),
    };

    setSimulatedIncidents((prevIncidents) => [newIncident, ...prevIncidents]);
    Alert.alert("Thành công", "Sự cố giả lập đã được thêm (mô phỏng).");
    setIncidentLocation("");
    setIncidentDescription("");
    setIsAddingIncident(false);
  };

  const toggleIncidentActiveStatus = (docId, currentStatus) => {
    setSimulatedIncidents((prevIncidents) =>
      prevIncidents.map((incident) =>
        incident.id === docId
          ? { ...incident, isActive: !currentStatus }
          : incident
      )
    );
    Alert.alert("Thành công", "Đã cập nhật trạng thái sự cố (mô phỏng).");
  };

  // --- TAB RENDERERS ---

  const renderUserManagementTab = () => (
    <ScrollView
      style={styles.tabContent}
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

  const renderSimulatedTrafficTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.sectionTitle}>Thêm sự cố giao thông giả lập</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Địa điểm (ví dụ: Đường X, Quận Y)"
          value={incidentLocation}
          onChangeText={setIncidentLocation}
        />
        <TextInput
          style={styles.input}
          placeholder="Mô tả (ví dụ: Tắc đường, Tai nạn)"
          value={incidentDescription}
          onChangeText={setIncidentDescription}
          multiline
          numberOfLines={3}
        />
        {/* Custom selection for Incident Type */}
        <View style={styles.selectionContainer}>
          <Text style={styles.pickerLabel}>Loại sự cố:</Text>
          <View style={styles.selectionButtons}>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                incidentType === "accident" && styles.selectionButtonActive,
              ]}
              onPress={() => setIncidentType("accident")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  incidentType === "accident" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Tai nạn
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                incidentType === "congestion" && styles.selectionButtonActive,
              ]}
              onPress={() => setIncidentType("congestion")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  incidentType === "congestion" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Tắc đường
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                incidentType === "road_closure" && styles.selectionButtonActive,
              ]}
              onPress={() => setIncidentType("road_closure")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  incidentType === "road_closure" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Đóng đường
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                incidentType === "natural_disaster" &&
                  styles.selectionButtonActive,
              ]}
              onPress={() => setIncidentType("natural_disaster")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  incidentType === "natural_disaster" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Thiên tai
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Custom selection for Incident Severity */}
        <View style={styles.selectionContainer}>
          <Text style={styles.pickerLabel}>Mức độ nghiêm trọng:</Text>
          <View style={styles.selectionButtons}>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                incidentSeverity === "low" && styles.selectionButtonActive,
              ]}
              onPress={() => setIncidentSeverity("low")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  incidentSeverity === "low" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Thấp
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                incidentSeverity === "medium" && styles.selectionButtonActive,
              ]}
              onPress={() => setIncidentSeverity("medium")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  incidentSeverity === "medium" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Trung bình
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                incidentSeverity === "high" && styles.selectionButtonActive,
              ]}
              onPress={() => setIncidentSeverity("high")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  incidentSeverity === "high" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Cao
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={addSimulatedIncident}
          disabled={isAddingIncident}
        >
          {isAddingIncident ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Thêm sự cố</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Các sự cố giả lập hiện có</Text>
      {simulatedIncidents.length === 0 ? (
        <Text style={styles.noDataText}>Chưa có sự cố giả lập nào.</Text>
      ) : (
        simulatedIncidents.map((incident) => (
          <View key={incident.id} style={styles.card}>
            <Text style={styles.cardTitle}>Địa điểm: {incident.location}</Text>
            <Text>Mô tả: {incident.description}</Text>
            <Text>Loại: {incident.type}</Text>
            <Text>Mức độ: {incident.severity}</Text>
            <Text>
              Trạng thái:{" "}
              <Text style={{ color: incident.isActive ? "green" : "grey" }}>
                {incident.isActive ? "Đang hoạt động" : "Đã hủy kích hoạt"}
              </Text>
            </Text>
            <Text>
              Thời gian:{" "}
              {incident.timestamp
                ? incident.timestamp.toLocaleString() // Use toLocaleString for Date object
                : "N/A"}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  incident.isActive
                    ? styles.deactivateButton
                    : styles.activateButton,
                ]}
                onPress={() =>
                  toggleIncidentActiveStatus(incident.id, incident.isActive)
                }
              >
                <Text style={styles.actionButtonText}>
                  {incident.isActive ? "Hủy kích hoạt" : "Kích hoạt lại"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderAnnouncementsTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.sectionTitle}>Tạo thông báo mới</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Tiêu đề thông báo"
          value={announcementTitle}
          onChangeText={setAnnouncementTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Nội dung thông báo"
          value={announcementMessage}
          onChangeText={setAnnouncementMessage}
          multiline
          numberOfLines={3}
        />
        {/* Custom selection for Announcement Type */}
        <View style={styles.selectionContainer}>
          <Text style={styles.pickerLabel}>Loại thông báo:</Text>
          <View style={styles.selectionButtons}>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                announcementType === "system" && styles.selectionButtonActive,
              ]}
              onPress={() => setAnnouncementType("system")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  announcementType === "system" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Hệ thống
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                announcementType === "feature_update" &&
                  styles.selectionButtonActive,
              ]}
              onPress={() => setAnnouncementType("feature_update")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  announcementType === "feature_update" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Cập nhật tính năng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                announcementType === "traffic_alert" &&
                  styles.selectionButtonActive,
              ]}
              onPress={() => setAnnouncementType("traffic_alert")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  announcementType === "traffic_alert" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Cảnh báo giao thông
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                announcementType === "urgent" && styles.selectionButtonActive,
              ]}
              onPress={() => setAnnouncementType("urgent")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  announcementType === "urgent" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Khẩn cấp
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Custom selection for Announcement Display Type */}
        <View style={styles.selectionContainer}>
          <Text style={styles.pickerLabel}>Kiểu hiển thị:</Text>
          <View style={styles.selectionButtons}>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                announcementDisplayType === "popup" &&
                  styles.selectionButtonActive,
              ]}
              onPress={() => setAnnouncementDisplayType("popup")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  announcementDisplayType === "popup" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Popup (Modal)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                announcementDisplayType === "banner" &&
                  styles.selectionButtonActive,
              ]}
              onPress={() => setAnnouncementDisplayType("banner")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  announcementDisplayType === "banner" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Banner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                announcementDisplayType === "in_app_list" &&
                  styles.selectionButtonActive,
              ]}
              onPress={() => setAnnouncementDisplayType("in_app_list")}
            >
              <Text
                style={[
                  styles.selectionButtonText,
                  announcementDisplayType === "in_app_list" &&
                    styles.selectionButtonTextActive,
                ]}
              >
                Danh sách trong ứng dụng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={sendAnnouncement}
          disabled={isSendingAnnouncement}
        >
          {isSendingAnnouncement ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi thông báo</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Các thông báo hiện có</Text>
      {isLoadingAnnouncements ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : announcements.length === 0 ? (
        <Text style={styles.noDataText}>Chưa có thông báo nào.</Text>
      ) : (
        announcements.map((announcement) => (
          <View key={announcement._id} style={styles.card}>
            <Text style={styles.cardTitle}>Tiêu đề: {announcement.title}</Text>
            <Text>Nội dung: {announcement.message}</Text>
            <Text>Loại: {announcement.type}</Text>
            <Text>Hiển thị: {announcement.displayType}</Text>
            <Text>Trạng thái: {announcement.status}</Text>
            {/* MongoDB stores dates as ISO 8601 strings, convert to Date object */}
            <Text>
              Thời gian: {new Date(announcement.timestamp).toLocaleString()}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  Alert.alert(
                    "Chỉnh sửa",
                    `Chỉnh sửa thông báo: ${announcement.title}`
                  )
                }
              >
                <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.archiveButton]}
                onPress={() =>
                  Alert.alert(
                    "Lưu trữ",
                    `Lưu trữ thông báo: ${announcement.title}`
                  )
                }
              >
                <Text style={styles.actionButtonText}>Lưu trữ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderCurrentTabContent = () => {
    switch (routes[index].key) {
      case "users":
        return renderUserManagementTab();
      case "traffic":
        return renderSimulatedTrafficTab();
      case "announcements":
        return renderAnnouncementsTab();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Quản lý Tính năng Admin</Text>
      {/* Custom Tab Bar */}
      <View style={styles.customTabBar}>
        {routes.map((route, i) => (
          <TouchableOpacity
            key={route.key}
            style={[
              styles.tabButton,
              index === i ? styles.tabButtonActive : {},
            ]}
            onPress={() => setIndex(i)}
          >
            <Text
              style={[
                styles.tabButtonText,
                index === i ? styles.tabButtonTextActive : {},
              ]}
            >
              {route.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {renderCurrentTabContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 50, // Điều chỉnh padding cho header
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007BFF",
    textAlign: "center",
    paddingBottom: 15,
  },
  // Styles for custom Tab Bar
  customTabBar: {
    flexDirection: "row",
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 5, // Khoảng cách giữa tab bar và nội dung
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "white",
  },
  tabButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  tabButtonTextActive: {
    color: "#007BFF",
  },
  tabContentContainer: {
    flex: 1, // Đảm bảo nội dung tab chiếm hết không gian còn lại
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 50, // Đảm bảo có đủ không gian cuộn ở cuối
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
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  // Styles for custom selection buttons (replaces Picker)
  selectionContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pickerLabel: {
    // Reused for consistency, but now just a label for the selection
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
    fontWeight: "bold",
  },
  selectionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  selectionButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginBottom: 8,
    marginRight: 5, // Add some right margin for spacing between buttons
    flex: 1, // Allow buttons to take available space
    minWidth: "48%", // Approx 2 buttons per row, adjust as needed
    alignItems: "center",
  },
  selectionButtonActive: {
    backgroundColor: "#007BFF",
  },
  selectionButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  selectionButtonTextActive: {
    color: "white",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  noDataText: {
    textAlign: "center",
    color: "#777",
    marginTop: 20,
    fontSize: 16,
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
  deactivateButton: {
    backgroundColor: "orange",
  },
  activateButton: {
    backgroundColor: "green",
  },
  archiveButton: {
    backgroundColor: "#888",
  },
});

export default AdminFeaturesScreen;
