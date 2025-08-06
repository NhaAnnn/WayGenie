import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_API_BASE_URL } from "../../secrets";
import { Ionicons } from "@expo/vector-icons";

const ProfileUpdate = () => {
  const { authToken, user, updateUser } = useAuth();
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Fetch user information when the screen loads
  useEffect(() => {
    if (user) {
      const initialFormData = {
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
      };
      setFormData(initialFormData);
      setIsDataLoading(false);
    } else {
      setIsDataLoading(false);
      toast.error(
        "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.",
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
      navigation.navigate("Login");
    }
  }, [user, navigation]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const newFormData = { ...prev, [field]: value };
      return newFormData;
    });
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone number format
  const isValidPhone = (phone) => {
    const phoneRegex = /^(\+?\d{1,3}[- ]?)?\d{3}[- ]?\d{3}[- ]?\d{4}$/;
    return phoneRegex.test(phone);
  };

  // Validate address format
  const isValidAddress = (address) => {
    return address.length >= 3 && address.length <= 200;
  };

  // Submit updated user information
  const handleUpdate = async () => {
    if (
      !formData.username ||
      !formData.email ||
      !formData.phone ||
      !formData.address
    ) {
      toast.error("Vui lòng điền đầy đủ tất cả các trường.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error("Email không hợp lệ.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!isValidPhone(formData.phone)) {
      toast.error("Số điện thoại không hợp lệ.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!isValidAddress(formData.address)) {
      toast.error("Địa chỉ phải từ 3 ký tự trở lên.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/auth/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Lỗi khi cập nhật thông tin.");
      }

      if (!data.user) {
        throw new Error("Dữ liệu người dùng không được trả về từ API.");
      }

      const updatedFormData = {
        username: data.user.username || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        address: data.user.address || "",
      };
      setFormData(updatedFormData);

      if (updateUser) {
        const updatedUser = {
          ...user,
          username: data.user.username || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          address: data.user.address || "",
          role: data.user.role || user.role,
        };
        updateUser(updatedUser);
      }

      toast.success("Thông tin cá nhân của bạn đã được cập nhật.", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (error) {
      toast.error(error.message || "Không thể cập nhật thông tin.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3cb371" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ToastContainer />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="arrow-back" size={24} color="#3366dd" />
        </TouchableOpacity>
        <Text style={styles.title}>Cập nhật thông tin cá nhân</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(value) => handleInputChange("username", value)}
              placeholder="Nhập username"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              placeholder="Nhập email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => handleInputChange("phone", value)}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Địa chỉ</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(value) => handleInputChange("address", value)}
              placeholder="Nhập địa chỉ"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Đang cập nhật..." : "Cập nhật"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 20,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    flex: 1,
    textAlign: "center",
  },
  form: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: "50%",
    alignSelf: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#333",
    width: "100%",
  },
  buttonContainer: {
    alignItems: "center",
  },
  button: {
    backgroundColor: "#3cb371",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: "center",
    width: "50%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonDisabled: {
    backgroundColor: "#a0a0a0",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});

export default ProfileUpdate;
