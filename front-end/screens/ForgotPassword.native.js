import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BACKEND_API_BASE_URL } from "../secrets";

export default function ForgotPassword() {
  const [formData, setFormData] = useState({ email: "", otp: "" });
  const [loading, setLoading] = useState({
    sendingCode: false,
    verifyingOtp: false,
  });
  const [countdown, setCountdown] = useState(0);
  const navigation = useNavigation();

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
        Alert.alert("Lỗi", errorMessage);
        setLoading((prev) => ({ ...prev, [type]: false }));
        return;
      }

      Alert.alert("Thành công", data.message);
      return data;
    } catch (error) {
      console.error(error);
      const errorMessage = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMessage);
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

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Quên mật khẩu?</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={formData.email}
          onChangeText={(value) => handleChange("email", value)}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.otpContainer}>
          <View style={styles.otpInput}>
            <TextInput
              style={styles.input}
              placeholder="Nhập mã xác nhận"
              placeholderTextColor="#999"
              value={formData.otp}
              onChangeText={(value) => handleChange("otp", value)}
            />
          </View>
        </View>
        <View style={styles.buttonSend}>
          <TouchableOpacity
            style={[
              styles.button,
              { width: "auto", paddingHorizontal: 20 },
              (!formData.email || loading.sendingCode) && styles.buttonDisabled,
            ]}
            onPress={handleSendCode}
            disabled={!formData.email || loading.sendingCode}
          >
            <Text style={styles.buttonText}>
              {loading.sendingCode ? `Gửi lại (${countdown}s)` : "Gửi mã OTP"}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            (!formData.otp || loading.verifyingOtp) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!formData.otp || loading.verifyingOtp}
        >
          {loading.verifyingOtp ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đặt lại mật khẩu</Text>
          )}
        </TouchableOpacity>

        <View style={styles.forgotPasswordContainer}></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    padding: 20,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 50,
    paddingLeft: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  otpContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  otpInput: {
    flex: 1,
  },
  buttonSend: {
    marginBottom: 15,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#4A90E2",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#A0B4C1",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },

  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 15,
  },
  footerLink: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "bold",
  },
});
