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
  const [hoveredItem, setHoveredItem] = useState(null);
  const scrollViewRef = useRef(null);
  const navigation = useNavigation();
  const { authToken, userRole, logout } = useAuth();

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const closeDropdown = () => {
    setShowDropdown(false);
  };

  const handleHoverIn = (itemName) => {
    setHoveredItem(itemName);
  };

  const handleHoverOut = () => {
    setHoveredItem(null);
  };

  const handleLogout = async () => {
    console.log("Đăng xuất được nhấn");
    try {
      await logout();
      closeDropdown();
      toast.success("Đăng xuất thành công!", {
        position: "top-right",
        autoClose: 2000,
      });
      navigation.navigate("Login");
    } catch (error) {
      console.error("Logout error:", error.message);
      toast.error("Không thể đăng xuất. Vui lòng thử lại.", {
        position: "top-right",
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
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.navItem}>
              <Image
                source={require("../../assets/images/favicon.png")}
                style={styles.navIcon}
              />
              <Text style={styles.navTextICON}>TN-Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("Home")}
              onMouseEnter={() => handleHoverIn("Trang chủ")}
              onMouseLeave={handleHoverOut}
            >
              <Text
                style={[
                  styles.navText,
                  hoveredItem === "Trang chủ" ? styles.hoveredNavText : null,
                ]}
              >
                Trang chủ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("CurrentStatusMap")}
              onMouseEnter={() => handleHoverIn("Hiện trạng")}
              onMouseLeave={handleHoverOut}
            >
              <Text
                style={[
                  styles.navText,
                  hoveredItem === "Hiện trạng" ? styles.hoveredNavText : null,
                ]}
              >
                Hiện trạng
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("SimulationMap")}
              onMouseEnter={() => handleHoverIn("Mô phỏng")}
              onMouseLeave={handleHoverOut}
            >
              <Text
                style={[
                  styles.navText,
                  hoveredItem === "Mô phỏng" ? styles.hoveredNavText : null,
                ]}
              >
                Mô phỏng
              </Text>
            </TouchableOpacity>

            <View style={styles.profileContainer}>
              <TouchableOpacity
                onPress={toggleDropdown}
                onMouseEnter={() => handleHoverIn("Profile")}
                onMouseLeave={handleHoverOut}
                style={styles.avatarContainer}
              >
                <Image
                  source={require("../../assets/images/avatar.jpg")}
                  style={styles.avatar}
                />
              </TouchableOpacity>

              {/* Dropdown Menu - Sử dụng Modal để đảm bảo hiển thị trên các phần tử khác */}
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
                      onMouseEnter={() =>
                        handleHoverIn("Cập nhật thông tin cá nhân")
                      }
                      onMouseLeave={handleHoverOut}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          hoveredItem === "Cập nhật thông tin cá nhân"
                            ? styles.hoveredDropdownText
                            : null,
                        ]}
                      >
                        Cập nhật trang cá nhân
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={handleLogout}
                      onMouseEnter={() => handleHoverIn("Đăng xuất")}
                      onMouseLeave={handleHoverOut}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          hoveredItem === "Đăng xuất"
                            ? styles.hoveredDropdownText
                            : null,
                        ]}
                      >
                        Đăng xuất
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Modal>
            </View>
          </View>
        </View>

        {/* Phần còn lại của code giữ nguyên */}
        {/* Main Content - Split 50/50 */}
        <View style={styles.mainContent}>
          {/* Left Content (50%) */}
          <View style={styles.leftContent}>
            <View style={styles.labSection}>
              <Text style={styles.labTitle}>Cæsmos</Text>
              <Text style={styles.labSubtitle}>RESEARCH LABORATORY</Text>
            </View>

            <View style={styles.universitySection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require("../../assets/images/favicon.png")}
                  style={styles.centerLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.universitySubtitle}>CENTER FOR</Text>
              <Text style={styles.universitySubtitle}>
                ENVIRONMENTAL INTELLIGENCE
              </Text>
            </View>
          </View>

          {/* Right Content (50%) with left-aligned map */}
          <View style={styles.rightContent}>
            <Image
              source={require("../../assets/images/map.jpg")}
              style={styles.mapImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Xin chào!</Text>
          <Text style={styles.question}>Bạn muốn đi đến đâu?</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Kết nối với chúng tôi</Text>
          <View style={styles.socialIcons}>
            {["facebook", "twitter", "github", "google", "instagram"].map(
              (icon) => (
                <TouchableOpacity
                  key={icon}
                  style={styles.iconButton}
                  onMouseEnter={() => handleHoverIn(icon)}
                  onMouseLeave={handleHoverOut}
                >
                  <FontAwesome
                    name={icon}
                    size={24}
                    color={
                      hoveredItem === icon
                        ? "#ffffff"
                        : icon === "facebook"
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
            © {new Date().getFullYear()} TN-Map. All rights reserved.
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
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#3cb371",
    paddingTop: 20,
    paddingBottom: 10,
    zIndex: 100, // Đảm bảo header hiển thị trên các phần tử khác
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  navIcon: {
    width: 22,
    height: 22,
  },
  navTextICON: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  navText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  hoveredNavText: {
    borderBottomWidth: 2,
    borderBottomColor: "white",
  },
  profileContainer: {
    position: "relative",
    zIndex: 101, // Cao hơn header
  },
  avatarContainer: {
    padding: 5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 70,
    paddingRight: 20,
  },
  dropdown: {
    backgroundColor: "white",
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
  },
  dropdownItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  dropdownText: {
    color: "#333",
    fontSize: 14,
  },
  hoveredDropdownText: {
    color: "#3cb371",
    fontWeight: "bold",
  },
  mainContent: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  leftContent: {
    flex: 1,
    paddingRight: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  rightContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: 40,
    paddingLeft: 20,
  },
  mapImage: {
    width: "100%",
    height: 300,
    maxWidth: 500,
  },
  labSection: {
    marginBottom: 30,
    alignItems: "center",
  },
  labTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    fontStyle: "italic",
    marginBottom: 5,
  },
  labSubtitle: {
    fontSize: 16,
    color: "#666",
    letterSpacing: 1,
  },
  universitySection: {
    marginBottom: 10,
    alignItems: "center",
  },
  centerLogo: {
    width: 220,
    height: 60,
    marginBottom: 10,
  },
  universitySubtitle: {
    fontSize: 18,
    color: "#333",
    textAlign: "left",
  },
  greetingSection: {
    marginBottom: 40,
    alignItems: "center",
    clear: "both",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  question: {
    fontSize: 18,
    color: "#666",
  },
  footer: {
    backgroundColor: "#eeeeee",
    paddingVertical: 25,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    marginTop: 20,
    width: "100%",
  },
  footerText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  socialIcons: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  iconButton: {
    marginHorizontal: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  copyright: {
    fontSize: 12,
    color: "#6c757d",
  },
});

export default HomeScreen;
