import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { Ionicons, FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const ContactScreen = () => {
  const navigation = useNavigation();

  // Hàm xử lý cuộc gọi điện thoại
  const handlePhoneCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Hàm xử lý gửi email
  const handleEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  // Hàm xử lý các link mạng xã hội
  const handleSocialLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <Text style={styles.title}>Liên hệ & Hỗ trợ</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={24} color="#4A90E2" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Email hỗ trợ</Text>
              <TouchableOpacity
                onPress={() => handleEmail("support@yourcompany.com")}
              >
                <Text style={styles.contactValue}>support@yourcompany.com</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={24} color="#4A90E2" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Tổng đài hỗ trợ</Text>
              <TouchableOpacity
                onPress={() => handlePhoneCall("1900-1234-5678")}
              >
                <Text style={styles.contactValue}>1900-1234-5678</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={24} color="#4A90E2" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Địa chỉ văn phòng</Text>
              <Text style={styles.contactValue}>
                123 Đường ABC, Quận 1, TP. Hồ Chí Minh
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Theo dõi chúng tôi</Text>
        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() =>
              handleSocialLink("https://www.facebook.com/yourcompany")
            }
          >
            <FontAwesome name="facebook" size={30} color="#3b5998" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() =>
              handleSocialLink("https://www.twitter.com/yourcompany")
            }
          >
            <FontAwesome name="twitter" size={30} color="#00acee" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() =>
              handleSocialLink("https://www.instagram.com/yourcompany")
            }
          >
            <FontAwesome name="instagram" size={30} color="#E1306C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() =>
              handleSocialLink("https://discord.gg/your-invite-link")
            }
          >
            <FontAwesome5 name="discord" size={30} color="#5865F2" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    position: "absolute",
    left: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  scrollContent: {
    padding: 20,
    width: "70%",
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    marginTop: 15,
  },
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  contactTextContainer: {
    marginLeft: 15,
  },
  contactLabel: {
    fontSize: 14,
    color: "#888",
  },
  contactValue: {
    fontSize: 16,
    color: "#4A90E2",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 10,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialButton: {
    padding: 10,
  },
  emergencyCard: {
    backgroundColor: "#D9534F",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  emergencyTextContainer: {
    marginLeft: 15,
  },
  emergencyLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  emergencyValue: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginTop: 5,
  },
});

export default ContactScreen;
