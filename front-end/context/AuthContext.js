import React, { createContext, useState, useEffect, useContext } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import { Platform } from "react-native"; // Import Platform
import axios from "axios";

const BASE_URL = "http://localhost:5000/api/auth";

export const AuthContext = createContext();

const TOKEN_KEY = "userToken"; // Khai báo một hằng số cho key

// Hàm lưu trữ an toàn (dựa vào nền tảng)
const saveToken = async (token) => {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token); // Dùng AsyncStorage cho web
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token); // Dùng SecureStore cho native
  }
};

// Hàm lấy token an toàn (dựa vào nền tảng)
const getToken = async () => {
  if (Platform.OS === "web") {
    return await AsyncStorage.getItem(TOKEN_KEY); // Dùng AsyncStorage cho web
  } else {
    return await SecureStore.getItemAsync(TOKEN_KEY); // Dùng SecureStore cho native
  }
};

// Hàm xóa token an toàn (dựa vào nền tảng)
const deleteToken = async () => {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY); // Dùng AsyncStorage cho web
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY); // Dùng SecureStore cho native
  }
};

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- HARDCODED TEST ACCOUNTS ---
  const TEST_USERNAME_USER = "user";
  const TEST_PASSWORD_USER = "123";
  const TEST_USERNAME_ADMIN = "admin";
  const TEST_PASSWORD_ADMIN = "123";
  // --- END HARDCODED TEST ACCOUNTS ---

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await getToken(); // Sử dụng hàm getToken đã định nghĩa
        if (token) {
          setAuthToken(token);
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUserRole(payload.role);
          // Chỉ cấu hình axios nếu không phải là tài khoản test và có ý định gọi API thật
          if (!token.startsWith("dummy.")) {
            // Kiểm tra token giả
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }
        }
      } catch (e) {
        console.error(
          "Failed to load auth token from secure store (or async storage)",
          e
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    setError(null);

    // --- LOGIC TEST ĐĂNG NHẬP (CHỈ DÙNG CHO PHÁT TRIỂN) ---
    if (username === TEST_USERNAME_USER && password === TEST_PASSWORD_USER) {
      console.log("Simulating login for testuser (user role)");
      const dummyToken =
        `dummy.eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoi${TEST_USERNAME_USER}` +
        `Iiwicm9sZSI6InVzZXIifQ.signature`;
      await saveToken(dummyToken); // Sử dụng hàm saveToken đã định nghĩa
      setAuthToken(dummyToken);
      setUserRole("user");
      setIsLoading(false);
      return { success: true };
    } else if (
      username === TEST_USERNAME_ADMIN &&
      password === TEST_PASSWORD_ADMIN
    ) {
      console.log("Simulating login for adminuser (admin role)");
      const dummyToken =
        `dummy.eyJpZCI6IjQ1NiIsInVzZXJuYW1lIjoi${TEST_USERNAME_ADMIN}` +
        `Iiwicm9sZSI6ImFkbWluIn0.signature`;
      await saveToken(dummyToken); // Sử dụng hàm saveToken đã định nghĩa
      setAuthToken(dummyToken);
      setUserRole("admin");
      setIsLoading(false);
      return { success: true };
    }
    // --- KẾT THÚC LOGIC TEST ĐĂNG NHẬP ---

    // LOGIC ĐĂNG NHẬP THỰC TẾ
    try {
      const response = await axios.post(`${BASE_URL}/login`, {
        username,
        password,
      });
      const { token } = response.data;

      await saveToken(token); // Sử dụng hàm saveToken đã định nghĩa
      setAuthToken(token);

      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserRole(payload.role);

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return { success: true };
    } catch (e) {
      console.error("Login failed:", e.response ? e.response.data : e.message);
      setAuthToken(null);
      setUserRole(null);
      setError(
        e.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại."
      );
      return {
        success: false,
        error: e.response?.data?.message || "Đăng nhập thất bại.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await deleteToken(); // Sử dụng hàm deleteToken đã định nghĩa
      setAuthToken(null);
      setUserRole(null);
      delete axios.defaults.headers.common["Authorization"];
    } catch (e) {
      console.error(
        "Failed to delete auth token from secure store (or async storage)",
        e
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ authToken, userRole, isLoading, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
