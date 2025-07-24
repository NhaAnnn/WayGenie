import React, { useState, useEffect } from "react";
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
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const { login, isLoading, userRole } = useAuth();
  const navigation = useNavigation();

  // Xử lý thay đổi kích thước màn hình
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    try {
      const result = await login(email, password);
      if (result.success) {
        Alert.alert("Thành công", "Bạn đã đăng nhập thành công!", [
          {
            text: "OK",
            onPress: () => {
              // Chuyển hướng dựa trên vai trò người dùng
              const targetScreen =
                userRole === "admin" ? "AdminDashboard" : "Home";
              navigation.reset({
                index: 0,
                routes: [{ name: targetScreen }],
              });
            },
          },
        ]);
      }
      // Lỗi đã được xử lý trong AuthContext, không cần hiển thị lại
    } catch (error) {
      console.error("Unexpected error during login:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.");
    }
  };

  // Tính toán kích thước dựa trên kích thước màn hình
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
          {/* Tiêu đề */}
          <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>
            Đăng nhập
          </Text>

          {/* Ô nhập email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isSmallScreen && styles.labelSmall]}>
              Email
            </Text>
            <TextInput
              style={[styles.input, isSmallScreen && styles.inputSmall]}
              placeholder="Nhập email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Ô nhập mật khẩu */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isSmallScreen && styles.labelSmall]}>
              Mật khẩu
            </Text>
            <TextInput
              style={[styles.input, isSmallScreen && styles.inputSmall]}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.divider} />
          <View style={styles.forgotPasswordContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text
                style={[
                  styles.footerLink,
                  isSmallScreen && styles.footerLinkSmall,
                ]}
              >
                Quên mật khẩu?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nút đăng nhập */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.buttonDisabled,
              isSmallScreen && styles.loginButtonSmall,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.loginButtonText,
                  isSmallScreen && styles.loginButtonTextSmall,
                ]}
              >
                ĐĂNG NHẬP
              </Text>
            )}
          </TouchableOpacity>

          {/* Liên kết đăng ký */}
          <View style={[styles.footer, isSmallScreen && styles.footerSmall]}>
            <Text
              style={[
                styles.footerText,
                isSmallScreen && styles.footerTextSmall,
              ]}
            >
              Bạn chưa có tài khoản?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text
                style={[
                  styles.footerLink,
                  isSmallScreen && styles.footerLinkSmall,
                ]}
              >
                {" "}
                Đăng ký
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 15,
  },
  loginButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonSmall: {
    padding: 12,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loginButtonTextSmall: {
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
  },
  footerSmall: {
    marginTop: 15,
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  footerTextSmall: {
    fontSize: 12,
  },
  footerLink: {
    color: "#007AFF",
    fontSize: 14,
  },
  footerLinkSmall: {
    fontSize: 12,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 10,
  },
});
