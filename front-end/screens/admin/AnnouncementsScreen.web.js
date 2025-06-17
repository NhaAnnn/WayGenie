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
  Platform,
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
  const [activeTab, setActiveTab] = useState("create");

  // --- MOCK FUNCTIONS ---
  const fetchAnnouncementsFromBackend = async () => {
    setIsLoadingAnnouncements(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoadingAnnouncements(false);
  };

  const sendAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.");
      return;
    }

    setIsSendingAnnouncement(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newAnnouncement = {
      _id: `ann_${Date.now()}`,
      title: announcementTitle,
      message: announcementMessage,
      type: announcementType,
      displayType: announcementDisplayType,
      status: "published",
      timestamp: new Date().toISOString(),
    };

    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    Alert.alert("Thành công", "Thông báo đã được gửi (giả lập).");
    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setIsSendingAnnouncement(false);
  };

  const archiveAnnouncement = (id) => {
    setAnnouncements(announcements.filter((ann) => ann._id !== id));
    Alert.alert("Đã lưu trữ", "Thông báo đã được lưu trữ (giả lập).");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Thông báo</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "create" && styles.activeTab]}
          onPress={() => setActiveTab("create")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "create" && styles.activeTabText,
            ]}
          >
            Tạo thông báo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "list" && styles.activeTab]}
          onPress={() => setActiveTab("list")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "list" && styles.activeTabText,
            ]}
          >
            Danh sách thông báo ({announcements.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === "create" ? (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Tạo thông báo mới</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tiêu đề thông báo</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tiêu đề..."
                value={announcementTitle}
                onChangeText={setAnnouncementTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nội dung thông báo</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập nội dung..."
                value={announcementMessage}
                onChangeText={setAnnouncementMessage}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Loại thông báo</Text>
              <View style={styles.buttonGroup}>
                {[
                  { value: "system", label: "Hệ thống" },
                  { value: "feature_update", label: "Cập nhật tính năng" },
                  { value: "traffic_alert", label: "Cảnh báo giao thông" },
                  { value: "urgent", label: "Khẩn cấp" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.typeButton,
                      announcementType === item.value &&
                        styles.typeButtonActive,
                    ]}
                    onPress={() => setAnnouncementType(item.value)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        announcementType === item.value &&
                          styles.typeButtonTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Kiểu hiển thị</Text>
              <View style={styles.buttonGroup}>
                {[
                  { value: "popup", label: "Popup" },
                  { value: "banner", label: "Banner" },
                  { value: "in_app_list", label: "Danh sách" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.typeButton,
                      announcementDisplayType === item.value &&
                        styles.typeButtonActive,
                    ]}
                    onPress={() => setAnnouncementDisplayType(item.value)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        announcementDisplayType === item.value &&
                          styles.typeButtonTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
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
        ) : (
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Danh sách thông báo</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm thông báo..."
              />
            </View>

            {isLoadingAnnouncements ? (
              <ActivityIndicator
                size="large"
                color="#4e73df"
                style={styles.loader}
              />
            ) : announcements.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Không có thông báo nào
                </Text>
              </View>
            ) : (
              <View style={styles.announcementsGrid}>
                {announcements.map((announcement) => (
                  <View key={announcement._id} style={styles.announcementCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{announcement.title}</Text>
                      <View style={styles.cardBadge}>
                        <Text style={styles.cardBadgeText}>
                          {announcement.type}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardMessage}>
                      {announcement.message}
                    </Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardMetaText}>
                        {new Date(announcement.timestamp).toLocaleString()}
                      </Text>
                      <Text style={styles.cardMetaText}>
                        Hiển thị: {announcement.displayType}
                      </Text>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.editButton}>
                        <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.archiveButton}
                        onPress={() => archiveAnnouncement(announcement._id)}
                      >
                        <Text style={styles.actionButtonText}>Lưu trữ</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fc",
  },
  header: {
    backgroundColor: "#4e73df",
    padding: Platform.OS === "web" ? 20 : 15,
    paddingTop: Platform.OS === "web" ? 30 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
  },
  tab: {
    padding: 15,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4e73df",
  },
  tabText: {
    fontSize: 16,
    color: "#6c757d",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#4e73df",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: Platform.OS === "web" ? 20 : 15,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4e73df",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5a5c69",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d3e2",
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: "#f8f9fc",
    borderWidth: 1,
    borderColor: "#d1d3e2",
  },
  typeButtonActive: {
    backgroundColor: "#4e73df",
    borderColor: "#4e73df",
  },
  typeButtonText: {
    color: "#5a5c69",
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#4e73df",
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 15,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d3e2",
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    width: Platform.OS === "web" ? "40%" : "100%",
  },
  loader: {
    marginTop: 50,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6c757d",
  },
  announcementsGrid: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    flexWrap: "wrap",
    gap: 20,
  },
  announcementCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flex: Platform.OS === "web" ? "1 1 calc(50% - 20px)" : "none",
    minWidth: Platform.OS === "web" ? 300 : "auto",
    marginBottom: Platform.OS === "web" ? 0 : 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4e73df",
    flex: 1,
  },
  cardBadge: {
    backgroundColor: "#f8f9fc",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#d1d3e2",
  },
  cardBadgeText: {
    fontSize: 12,
    color: "#5a5c69",
  },
  cardMessage: {
    color: "#5a5c69",
    marginBottom: 15,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  cardMetaText: {
    fontSize: 12,
    color: "#858796",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  editButton: {
    backgroundColor: "#4e73df",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  archiveButton: {
    backgroundColor: "#e74a3b",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
  },
});

export default AnnouncementsScreen;
