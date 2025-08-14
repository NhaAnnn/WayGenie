import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Định nghĩa BACKEND_API_BASE_URL (thay bằng URL thực tế của bạn)
import { BACKEND_API_BASE_URL } from "../secrets";
export default function ResetPassword() {
  const [formData, setFormData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove?.();
  }, []);

  useEffect(() => {
    if (!route.params?.isSuccess) {
      navigation.navigate("Login");
    }
    if (route.params?.email) {
      setFormData((prev) => ({ ...prev, email: route.params.email }));
    }
  }, [route.params?.email, navigation]);

  const handleChange = (id, value) => {
    setFormData({ ...formData, [id]: value });
  };

  const validateValue = Object.values(formData).every((el) => el);

  const handleSubmit = async () => {
    if (!validateValue) {
      const errorMessage =
        "Vui lòng nhập đầy đủ email, mật khẩu mới và xác nhận mật khẩu.";
      if (Platform.OS === "web") {
        toast.error(errorMessage, { position: "top-right", autoClose: 3000 });
      } else {
        Alert.alert("Lỗi", errorMessage);
      }
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      const errorMessage = "Mật khẩu và xác nhận không khớp.";
      if (Platform.OS === "web") {
        toast.error(errorMessage, { position: "top-right", autoClose: 3000 });
      } else {
        Alert.alert("Lỗi", errorMessage);
      }
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_API_BASE_URL}/forgot/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMessage = data.message || "Đã xảy ra lỗi.";
        if (Platform.OS === "web") {
          toast.error(errorMessage, { position: "top-right", autoClose: 3000 });
        } else {
          Alert.alert("Lỗi", errorMessage);
        }
        return;
      }

      if (Platform.OS === "web") {
        toast.success(data.message, {
          position: "top-right",
          autoClose: 1000,
          onClose: () => navigation.navigate("Login"),
        });
      } else {
        Alert.alert("Thành công", data.message, [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.";
      if (Platform.OS === "web") {
        toast.error(errorMessage, { position: "top-right", autoClose: 3000 });
      } else {
        Alert.alert("Lỗi", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const frameWidth = Math.min(dimensions.width * 0.9, 500);
  const isSmallScreen = dimensions.width < 400;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.frame, { width: frameWidth }]}>
          <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>
            Đặt lại mật khẩu
          </Text>

          {/* Ô nhập mật khẩu mới */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isSmallScreen && styles.labelSmall]}>
              Mật khẩu mới
            </Text>
            <TextInput
              style={[styles.input, isSmallScreen && styles.inputSmall]}
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor="#999"
              value={formData.newPassword}
              onChangeText={(value) => handleChange("newPassword", value)}
              secureTextEntry
            />
          </View>

          {/* Ô nhập xác nhận mật khẩu */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isSmallScreen && styles.labelSmall]}>
              Xác nhận mật khẩu
            </Text>
            <TextInput
              style={[styles.input, isSmallScreen && styles.inputSmall]}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#999"
              value={formData.confirmPassword}
              onChangeText={(value) => handleChange("confirmPassword", value)}
              secureTextEntry
            />
          </View>

          {/* Hiển thị lỗi khi mật khẩu không khớp */}
          {formData.newPassword &&
            formData.confirmPassword &&
            formData.newPassword !== formData.confirmPassword && (
              <Text
                style={[
                  styles.errorText,
                  isSmallScreen && styles.errorTextSmall,
                ]}
              >
                Mật khẩu không khớp
              </Text>
            )}

          {/* Nút xác nhận */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!validateValue || loading) && styles.buttonDisabled,
              isSmallScreen && styles.submitButtonSmall,
            ]}
            onPress={handleSubmit}
            disabled={!validateValue || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.submitButtonText,
                  isSmallScreen && styles.submitButtonTextSmall,
                ]}
              >
                Đặt lại mật khẩu
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      {Platform.OS === "web" && (
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
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  frame: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  titleSmall: {
    fontSize: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#444",
  },
  labelSmall: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  inputSmall: {
    padding: 10,
    fontSize: 14,
  },
  errorText: {
    color: "#ff0000",
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },
  errorTextSmall: {
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonSmall: {
    padding: 12,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  submitButtonTextSmall: {
    fontSize: 14,
  },
  buttonDisabled: {
    backgroundColor: "#999",
    opacity: 0.7,
  },
});
