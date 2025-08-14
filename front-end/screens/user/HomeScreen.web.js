import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const HomeScreen = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigation = useNavigation();
  const { logout } = useAuth();

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const closeDropdown = () => {
    setShowDropdown(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      closeDropdown();
      toast.success("Đăng xuất thành công!", { autoClose: 2000 });
      navigation.navigate("Login");
    } catch (error) {
      console.error("Logout error:", error.message);
      toast.error("Không thể đăng xuất. Vui lòng thử lại.", {
        autoClose: 3000,
      });
    }
  };

  const handleProfileUpdate = () => {
    closeDropdown();
    navigation.navigate("PersonalInfoScreen");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.navBar}>
            <View style={styles.navItem}>
              <Image
                source={require("../../assets/images/favicon.png")}
                style={styles.navIcon}
              />
              <Text style={styles.navTextICON}>WayGenie</Text>
            </View>
            <View style={styles.profileContainer}>
              <TouchableOpacity
                onPress={toggleDropdown}
                style={styles.avatarContainer}
              >
                <Image
                  source={require("../../assets/images/avatar.jpg")}
                  style={styles.avatar}
                />
              </TouchableOpacity>

              <Modal
                visible={showDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={closeDropdown}
              >
                <Pressable style={styles.modalOverlay} onPress={closeDropdown}>
                  <View style={styles.dropdown}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={handleProfileUpdate}
                    >
                      <Text style={styles.dropdownText}>
                        Cập nhật trang cá nhân
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={handleLogout}
                    >
                      <Text style={styles.dropdownText}>Đăng xuất</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Modal>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Welcome and Description */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Chào mừng đến với WayGenie</Text>
            <Text style={styles.welcomeSubtitle}>
              Khám phá và mô phỏng hiện trạng môi trường của Hà Nội.
            </Text>
          </View>

          {/* Navigation Cards */}
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("CurrentStatusMap")}
            >
              <FontAwesome name="map" size={40} color="#4A90E2" />
              <Text style={styles.cardTitle}>Hiện trạng</Text>
              <Text style={styles.cardDescription}>
                Xem bản đồ hiện trạng môi trường.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("SimulationMap")}
            >
              <FontAwesome name="line-chart" size={40} color="#4A90E2" />
              <Text style={styles.cardTitle}>Mô phỏng</Text>
              <Text style={styles.cardDescription}>
                Mô phỏng các kịch bản môi trường.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("Contact")}
            >
              <FontAwesome name="info-circle" size={40} color="#4A90E2" />
              <Text style={styles.cardTitle}>Liên hệ hỗ trợ</Text>
              <Text style={styles.cardDescription}>
                Tìm hiểu về dự án và nhóm nghiên cứu.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Kết nối với chúng tôi</Text>
          <View style={styles.socialIcons}>
            {["facebook", "twitter", "github", "google", "instagram"].map(
              (icon) => (
                <TouchableOpacity key={icon} style={styles.iconButton}>
                  <FontAwesome
                    name={icon}
                    size={24}
                    color={
                      icon === "facebook"
                        ? "#3b5998"
                        : icon === "twitter"
                        ? "#1da1f2"
                        : icon === "github"
                        ? "#333"
                        : icon === "google"
                        ? "#db4437"
                        : "#e1306c"
                    }
                  />
                </TouchableOpacity>
              )
            )}
          </View>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} WayGenie. All rights reserved.
          </Text>
        </View>
      </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA", // Light background
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  navIcon: {
    width: 25,
    height: 25,
    marginRight: 10,
  },
  navTextICON: {
    color: "#4A90E2",
    fontSize: 24,
    fontWeight: "bold",
  },
  profileContainer: {
    position: "relative",
  },
  avatarContainer: {
    padding: 5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#4A90E2",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  dropdown: {
    position: "absolute",
    right: 20,
    top: 60,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    minWidth: 200,
    paddingVertical: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownText: {
    color: "#555",
    fontSize: 16,
  },
  mainContent: {
    padding: 40,
    alignItems: "center",
  },
  welcomeSection: {
    marginBottom: 50,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    maxWidth: 600,
  },
  cardContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    width: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transitionDuration: "0.3s",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
    color: "#333",
  },
  cardDescription: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#EFEFEF",
    paddingVertical: 25,
    alignItems: "center",
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  footerText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#555",
  },
  socialIcons: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  iconButton: {
    marginHorizontal: 10,
    padding: 8,
  },
  copyright: {
    fontSize: 12,
    color: "#888",
  },
});

export default HomeScreen;
