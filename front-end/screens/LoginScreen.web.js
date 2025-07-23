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
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const { login, isLoading } = useAuth();

  const navigation = useNavigation();

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await login(email, password);
      if (result.success) {
        // Hiển thị thông báo thành công
        if (Platform.OS === "web") {
          toast.success("Đăng nhập thành công!", {
            position: "top-right",
            autoClose: 2000, // Thông báo hiển thị trong 2 giây
          });
        } else {
          Alert.alert("Thành công", "Bạn đã đăng nhập thành công!", [
            { text: "OK" }, // Không cần hành động vì sẽ chuyển hướng
          ]);
        }

        // Chuyển hướng sau 2 giây để người dùng đọc thông báo
        setTimeout(() => {
          const targetScreen =
            result.user.role === "admin" ? "AdminDashboard" : "Home";
          navigation.reset({
            index: 0,
            routes: [{ name: targetScreen }],
          });
        }, 2000); // Độ trễ 2 giây
      } else {
        // Hiển thị thông báo lỗi
        const errorMessage = result.error || "Đã xảy ra lỗi khi đăng nhập.";
        if (Platform.OS === "web") {
          toast.error(errorMessage, {
            position: "top-right",
            autoClose: 3000, // Thông báo lỗi hiển thị trong 3 giây
          });
        } else {
          Alert.alert("Lỗi", errorMessage);
        }
      }
    } catch (error) {
      // Xử lý lỗi bất ngờ
      console.error("Unexpected error during login:", error);
      const errorMessage = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.";
      if (Platform.OS === "web") {
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        Alert.alert("Lỗi", errorMessage);
      }
    }
  };

  // Tính toán kích thước dựa trên kích thước màn hình
  const frameWidth = Math.min(dimensions.width * 0.9, 500); // Tối đa 500px
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
              Username hoặc Email
            </Text>
            <TextInput
              style={[styles.input, isSmallScreen && styles.inputSmall]}
              placeholder="Email"
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

          {/* Liên kết đăng ký/quên mật khẩu */}
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
