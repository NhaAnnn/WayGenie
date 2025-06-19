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
  const { login, isLoading, error } = useAuth();

  const navigation = useNavigation();

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const handleLogin = async () => {
    const result = await login(email, password);
    if (!result.success) {
      Alert.alert(
        "Lỗi đăng nhập",
        result.error || "Đã xảy ra lỗi khi đăng nhập."
      );
    }
  };

  //
  const handleLoginGoogle = async () => {
    try {
      // 1. Kiểm tra Google Play Services (Android)
      await GoogleSignin.hasPlayServices();

      // 2. Đăng nhập bằng Google, lấy idToken và thông tin user
      const { idToken, user } = await GoogleSignin.signIn();

      // 3. Đăng nhập vào Firebase (optional)
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const firebaseUser = await auth().signInWithCredential(googleCredential);

      // 4. Gửi thông tin về backend bằng Axios
      // const response = await axios.post('localhost:3000/auth/google', {
      //   idToken, // Backend sẽ verify token này
      //   email: user.email,
      //   name: user.name || user.givenName,
      //   avatar: user.photo, // (optional)
      // });

      // 5. Xử lý kết quả từ backend
      if (response.data.success) {
        navigation.navigate("Home");
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    }
  };
  // const handleLoginGoogle = async () => {
  //   try {
  //     const provider = new GoogleAuthProvider();
  //     const auth = getAuth(app);

  //     const result = await signInWithPopup(auth, provider);

  //     const res = await fetch("/api/auth/google", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         name: result.user.displayName,
  //         email: result.user.email,
  //       }),
  //     });
  //     const data = await res.json();
  //     dispatch(signInSuccess(data));
  //     navigate("/");
  //   } catch (error) {
  //     console.log("could not sign in with google", error);
  //   }
  // };
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
              Email
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
            <TouchableOpacity>
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
          {/* Nút đăng nhập */}
          <TouchableOpacity
            style={[
              styles.loginButtonGoogle,
              isLoading && styles.buttonDisabled,
              isSmallScreen && styles.loginButtonSmall,
            ]}
            // onPress={handleLoginGoogle}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.loginButtonText,
                isSmallScreen && styles.loginButtonTextSmall,
              ]}
            >
              ĐĂNG NHẬP BẰNG GOOGLE
            </Text>
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
  loginButtonGoogle: {
    backgroundColor: "#ff0000",
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
