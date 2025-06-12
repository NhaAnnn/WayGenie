// screens/LoginScreen.js (file thực tế của bạn)
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  // Thêm Alert nếu bạn dùng để hiển thị lỗi pop-up
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, authToken, userRole } = useAuth(); // Lấy từ context gốc của bạn

  const handleLogin = async () => {
    const result = await login(username, password);
    if (!result.success) {
      console.error("Đăng nhập thất bại:", result.error);
      // Bạn có thể hiển thị Alert.alert(result.error) ở đây nếu muốn thông báo pop-up
    }
  };

  // Logic điều hướng sau khi đăng nhập thành công sẽ nằm trong AppNavigator
  // isAuthenticated (hoặc authToken) sẽ được dùng để điều hướng tự động bởi AppNavigator
  // Nếu bạn muốn hiển thị màn hình "Đăng nhập thành công" ngay tại đây, bạn sẽ cần logic để kiểm tra authToken hoặc isAuthenticated từ context
  // Ví dụ:
  if (authToken) {
    // Kiểm tra authToken thay vì isAuthenticated nếu bạn dùng context gốc
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.title}>Đăng nhập thành công!</Text>
        <Text style={styles.subtitle}>Chào mừng bạn trở lại!</Text>
        {/* Nút này có thể điều hướng đi đâu đó hoặc làm mới */}
        <TouchableOpacity
          onPress={() => {
            // Thay vì window.location.reload() (chỉ dùng cho web), bạn sẽ cần điều hướng trong React Native
            // Ví dụ: navigation.navigate('Home'); (nếu bạn có navigation prop)
            // Hoặc đơn giản là để AppNavigator tự điều hướng
            console.log("Đăng nhập thành công, AppNavigator sẽ tự điều hướng!");
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Tiếp tục</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Đăng nhập</Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Tên đăng nhập"
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          secureTextEntry
          style={styles.input}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={isLoading}
          style={[styles.button, isLoading && styles.buttonDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (các styles của bạn)
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4A90E2", // background color
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
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
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
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    padding: 20,
  },
});

export default LoginScreen; // <-- CHỈ XUẤT LoginScreen mặc định

// XÓA BỎ DÒNG SAU NẾU CÓ:
// export default function App() {
//   return (
//     <AuthProvider>
//       <LoginScreen />
//     </AuthProvider>
//   );
// }
