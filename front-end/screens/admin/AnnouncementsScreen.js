// screens/AnnouncementsScreen.js
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
} from "react-native";

const AnnouncementsScreen = () => {
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

  return (
    <ScrollView
      style={styles.container}
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
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  selectionContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pickerLabel: {
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
    marginRight: 5,
    flex: 1,
    minWidth: "48%",
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
  archiveButton: {
    backgroundColor: "#888",
  },
});

export default AnnouncementsScreen;
