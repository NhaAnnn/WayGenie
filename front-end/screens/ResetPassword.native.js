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
import { useNavigation, useRoute } from "@react-navigation/native";
import { BACKEND_API_BASE_URL } from "../secrets";

export default function ResetPassword() {
  const [formData, setFormData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

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
      Alert.alert(
        "Lỗi",
        "Vui lòng nhập đầy đủ email, mật khẩu mới và xác nhận mật khẩu."
      );
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu và xác nhận không khớp.");
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
        Alert.alert("Lỗi", errorMessage);
        return;
      }

      Alert.alert("Thành công", data.message, [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Đặt lại mật khẩu</Text>

        <TextInput
          style={styles.input}
          placeholder="Mật khẩu mới"
          placeholderTextColor="#999"
          value={formData.newPassword}
          onChangeText={(value) => handleChange("newPassword", value)}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Nhập lại mật khẩu"
          placeholderTextColor="#999"
          value={formData.confirmPassword}
          onChangeText={(value) => handleChange("confirmPassword", value)}
          secureTextEntry
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!validateValue || loading) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!validateValue || loading}
        >
          {loading ? (
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
