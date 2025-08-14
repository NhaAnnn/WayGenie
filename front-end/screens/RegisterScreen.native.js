import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { BACKEND_API_BASE_URL } from "../secrets";

const AUTH_API_URL = `${BACKEND_API_BASE_URL}/auth`;

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const navigation = useNavigation();

  const handleRegister = async () => {
    // Kiểm tra định dạng email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Lỗi", "Email không hợp lệ");
      return;
    }

    // Kiểm tra mật khẩu khớp
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu không khớp");
      return;
    }

    // Kiểm tra độ dài mật khẩu
    if (password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLocalLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_URL}/register`, {
        username,
        email,
        password,
      });

      setLocalLoading(false);

      if (
        response.data.message === "Đăng ký thành công!" &&
        response.data.user
      ) {
        Alert.alert("Thành công", "Đăng ký thành công!", [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
          },
        ]);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err) {
      setLocalLoading(false);
      let errorMessage = "Lỗi không xác định";
      if (err.response) {
        switch (err.response.status) {
          case 400:
            errorMessage = "Vui lòng điền đầy đủ thông tin";
            break;
          case 409:
            errorMessage = "Tên người dùng hoặc email đã tồn tại";
            break;
          case 500:
            errorMessage = "Lỗi server, vui lòng thử lại sau";
            break;
          default:
            errorMessage = err.response.data.message || "Lỗi không xác định";
        }
      }
      Alert.alert("Lỗi", `Lỗi đăng ký: ${errorMessage}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Đăng ký tài khoản</Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Tên người dùng"
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Nhập lại mật khẩu"
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          onPress={handleRegister}
          disabled={localLoading}
          style={[styles.button, localLoading && styles.buttonDisabled]}
        >
          {localLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng ký</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Bạn đã có tài khoản?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.footerLink}> Đăng nhập</Text>
          </TouchableOpacity>
        </View>
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
  },
  footerLink: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "bold",
  },
});
