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
import { useNavigation } from "@react-navigation/native";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { BACKEND_API_BASE_URL } from "../secrets";

export default function ForgotPassword() {
  const [formData, setFormData] = useState({ email: "", otp: "" });
  const [loading, setLoading] = useState({
    sendingCode: false,
    verifyingOtp: false,
  });
  const [countdown, setCountdown] = useState(0);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const navigation = useNavigation();

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove?.();
  }, []);

  const handleChange = (id, value) => {
    setFormData({ ...formData, [id]: value });
  };

  // Hàm gọi API và xử lý lỗi chung
  const fetchApi = async (url, body, type) => {
    try {
      setLoading((prev) => ({ ...prev, [type]: true }));
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMessage = data.message || "Đã xảy ra lỗi.";
        if (Platform.OS === "web") {
          toast.error(errorMessage, { position: "top-right", autoClose: 3000 });
        } else {
          Alert.alert("Lỗi", errorMessage);
        }
        setLoading((prev) => ({ ...prev, [type]: false }));
        return;
      }

      if (Platform.OS === "web") {
        toast.success(data.message, { position: "top-right", autoClose: 3000 });
      } else {
        Alert.alert("Thành công", data.message);
      }
      return data;
    } catch (error) {
      console.error(error);
      const errorMessage = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.";
      if (Platform.OS === "web") {
        toast.error(errorMessage, { position: "top-right", autoClose: 3000 });
      } else {
        Alert.alert("Lỗi", errorMessage);
      }
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Gửi mã OTP
  const handleSendCode = async () => {
    if (!formData.email || loading.sendingCode) return;

    setCountdown(30);
    await fetchApi(
      `${BACKEND_API_BASE_URL}/forgot/forgot-password`,
      { email: formData.email },
      "sendingCode"
    );
  };

  // Đếm ngược thời gian gửi lại mã
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Xác thực mã OTP
  const handleSubmit = async () => {
    if (!formData.otp || loading.verifyingOtp) return;

    const data = await fetchApi(
      `${BACKEND_API_BASE_URL}/forgot/verify-otp`,
      formData,
      "verifyingOtp"
    );
    if (data) {
      setTimeout(() => {
        navigation.navigate("ResetPassword", {
          email: formData.email,
          isSuccess: true,
        });
      }, 1500);
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
            Quên mật khẩu?
          </Text>

          {/* Ô nhập email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isSmallScreen && styles.labelSmall]}>
              Email
            </Text>
            <TextInput
              style={[styles.input, isSmallScreen && styles.inputSmall]}
              placeholder="Email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(value) => handleChange("email", value)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Ô nhập mã OTP và nút gửi mã */}
          <View style={[styles.inputGroup, styles.otpContainer]}>
            <View style={styles.otpInput}>
              <Text style={[styles.label, isSmallScreen && styles.labelSmall]}>
                Mã xác nhận
              </Text>
              <TextInput
                style={[styles.input, isSmallScreen && styles.inputSmall]}
                placeholder="Nhập mã xác nhận"
                placeholderTextColor="#999"
                value={formData.otp}
                onChangeText={(value) => handleChange("otp", value)}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendCodeButton,
                (!formData.email || loading.sendingCode) &&
                  styles.buttonDisabled,
                isSmallScreen && styles.sendCodeButtonSmall,
              ]}
              onPress={handleSendCode}
              disabled={!formData.email || loading.sendingCode}
            >
              {loading.sendingCode ? (
                <Text
                  style={[
                    styles.sendCodeButtonText,
                    isSmallScreen && styles.sendCodeButtonTextSmall,
                  ]}
                >
                  Gửi lại sau {countdown}s
                </Text>
              ) : (
                <Text
                  style={[
                    styles.sendCodeButtonText,
                    isSmallScreen && styles.sendCodeButtonTextSmall,
                  ]}
                >
                  Gửi mã
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Nút xác thực */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!formData.otp || loading.verifyingOtp) && styles.buttonDisabled,
              isSmallScreen && styles.submitButtonSmall,
            ]}
            onPress={handleSubmit}
            disabled={!formData.otp || loading.verifyingOtp}
          >
            {loading.verifyingOtp ? (
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
  otpContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  otpInput: {
    flex: 1,
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
  sendCodeButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 42,
  },
  sendCodeButtonSmall: {
    padding: 10,
    height: 38,
  },
  sendCodeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  sendCodeButtonTextSmall: {
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
