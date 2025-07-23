import React, { useState } from "react";
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
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [localLoading, setLocalLoading] = useState(false); // Trạng thái tải cục bộ
  const { register, error } = useAuth();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const frameWidth = Math.min(width * 0.9, 500);
  const isSmallScreen = width < 400;
  const isVerySmallScreen = width < 350;

  const handleRegister = async () => {
    if (!name.trim()) {
      if (Platform.OS === "web") {
        toast.error("Vui lòng nhập họ và tên", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        Alert.alert("Lỗi", "Vui lòng nhập họ và tên");
      }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (Platform.OS === "web") {
        toast.error("Email không hợp lệ", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        Alert.alert("Lỗi", "Email không hợp lệ");
      }
      return;
    }

    if (password !== confirmPassword) {
      if (Platform.OS === "web") {
        toast.error("Mật khẩu không khớp", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        Alert.alert("Lỗi", "Mật khẩu không khớp");
      }
      return;
    }

    setLocalLoading(true);
    const result = await register(name, email, password);
    setLocalLoading(false);

    if (!result.success) {
      if (Platform.OS === "web") {
        toast.error("Lỗi đăng ký: " + result.error, {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        Alert.alert("Lỗi", "Lỗi đăng ký: " + result.error);
      }
      // Không điều hướng, giữ người dùng ở lại màn hình Register
    } else {
      if (Platform.OS === "web") {
        toast.success("Đăng ký thành công!", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        Alert.alert("Thành công", "Đăng ký thành công!");
      }
      // Không điều hướng, để AppNavigator xử lý
    }
  };

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
          <Text
            style={[
              styles.title,
              isSmallScreen && styles.titleSmall,
              isVerySmallScreen && styles.titleVerySmall,
            ]}
          >
            Đăng ký tài khoản
          </Text>

          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                isSmallScreen && styles.labelSmall,
                isVerySmallScreen && styles.labelVerySmall,
              ]}
            >
              Họ và tên
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall,
                isVerySmallScreen && styles.inputVerySmall,
              ]}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                isSmallScreen && styles.labelSmall,
                isVerySmallScreen && styles.labelVerySmall,
              ]}
            >
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall,
                isVerySmallScreen && styles.inputVerySmall,
              ]}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                isSmallScreen && styles.labelSmall,
                isVerySmallScreen && styles.labelVerySmall,
              ]}
            >
              Mật khẩu
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall,
                isVerySmallScreen && styles.inputVerySmall,
              ]}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                isSmallScreen && styles.labelSmall,
                isVerySmallScreen && styles.labelVerySmall,
              ]}
            >
              Nhập lại mật khẩu
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall,
                isVerySmallScreen && styles.inputVerySmall,
              ]}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[
              styles.registerButton,
              localLoading && styles.buttonDisabled,
              isSmallScreen && styles.registerButtonSmall,
              isVerySmallScreen && styles.registerButtonVerySmall,
            ]}
            onPress={handleRegister}
            disabled={localLoading}
          >
            {localLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.registerButtonText,
                  isSmallScreen && styles.registerButtonTextSmall,
                  isVerySmallScreen && styles.registerButtonTextVerySmall,
                ]}
              >
                ĐĂNG KÝ
              </Text>
            )}
          </TouchableOpacity>

          <View
            style={[
              styles.footer,
              isSmallScreen && styles.footerSmall,
              isVerySmallScreen && styles.footerVerySmall,
            ]}
          >
            <Text
              style={[
                styles.footerText,
                isSmallScreen && styles.footerTextSmall,
                isVerySmallScreen && styles.footerTextVerySmall,
              ]}
            >
              Bạn đã có tài khoản?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text
                style={[
                  styles.footerLink,
                  isSmallScreen && styles.footerLinkSmall,
                  isVerySmallScreen && styles.footerLinkVerySmall,
                ]}
              >
                Đăng nhập
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {Platform.OS === "web" && <ToastContainer />}
    </KeyboardAvoidingView>
  );
}

// ... (styles giữ nguyên)
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
  titleVerySmall: {
    fontSize: 18,
    marginBottom: 15,
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
  labelVerySmall: {
    fontSize: 13,
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
  inputVerySmall: {
    padding: 8,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 15,
  },
  registerButton: {
    backgroundColor: "#34C759",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  registerButtonSmall: {
    padding: 12,
  },
  registerButtonVerySmall: {
    padding: 10,
  },
  registerButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  registerButtonTextSmall: {
    fontSize: 14,
  },
  registerButtonTextVerySmall: {
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
    alignItems: "center",
  },
  footerSmall: {
    marginTop: 15,
  },
  footerVerySmall: {
    marginTop: 10,
    flexDirection: "column",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  footerTextSmall: {
    fontSize: 12,
  },
  footerTextVerySmall: {
    fontSize: 11,
    marginBottom: 5,
  },
  footerLink: {
    color: "#007AFF",
    fontSize: 14,
    marginLeft: 5,
  },
  footerLinkSmall: {
    fontSize: 12,
  },
  footerLinkVerySmall: {
    fontSize: 11,
    marginLeft: 0,
  },
});
