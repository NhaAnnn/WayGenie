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

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const { register, isLoading, error } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu không khớp");
      return;
    }

    const result = await register(name, email, password);
    if (!result.success) {
      Alert.alert("Lỗi đăng ký", result.error || "Đã xảy ra lỗi khi đăng ký.");
    }
  };

  // Tính toán kích thước dựa trên kích thước màn hình
  const frameWidth = Math.min(dimensions.width * 0.9, 500); // Tối đa 500px
  const isSmallScreen = dimensions.width < 400;
  const isVerySmallScreen = dimensions.width < 350;

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
          <Text
            style={[
              styles.title,
              isSmallScreen && styles.titleSmall,
              isVerySmallScreen && styles.titleVerySmall,
            ]}
          >
            Đăng ký tài khoản
          </Text>

          {/* Ô nhập họ tên */}
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

          {/* Ô nhập email */}
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

          {/* Ô nhập mật khẩu */}
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

          {/* Ô nhập lại mật khẩu */}
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

          {/* Nút đăng ký */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              isLoading && styles.buttonDisabled,
              isSmallScreen && styles.registerButtonSmall,
              isVerySmallScreen && styles.registerButtonVerySmall,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
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

          {/* Liên kết đăng nhập */}
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
