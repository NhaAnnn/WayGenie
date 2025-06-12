// context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import { Platform } from "react-native"; // Import Platform
import axios from "axios"; // Ensure axios is installed if you use it for real API calls

const AuthContext = createContext(null);

const TOKEN_KEY = "userToken";
const ROLE_KEY = "userRole"; // Thêm key để lưu vai trò một cách riêng biệt

// Hàm lưu trữ an toàn (dựa vào nền tảng)
const saveAuthData = async (token, role) => {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(ROLE_KEY, role);
  } else {
    // SecureStore lý tưởng cho các giá trị nhỏ, nhạy cảm
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(ROLE_KEY, role); // Lưu vai trò vào SecureStore
  }
};

// Hàm lấy token và vai trò an toàn (dựa vào nền tảng)
const getAuthData = async () => {
  let token = null;
  let role = null;
  if (Platform.OS === "web") {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    role = await AsyncStorage.getItem(ROLE_KEY);
  } else {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
    role = await SecureStore.getItemAsync(ROLE_KEY); // Lấy vai trò từ SecureStore
  }
  return { token, role };
};

// Hàm xóa token và vai trò an toàn (dựa vào nền tảng)
const deleteAuthData = async () => {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(ROLE_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
  }
};

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Trạng thái tải ban đầu
  const [error, setError] = useState(null); // Để lưu trữ lỗi đăng nhập

  // --- HARDCODED TEST ACCOUNTS (Chỉ dùng cho Phát triển) ---
  const TEST_USERNAME_USER = "user";
  const TEST_PASSWORD_USER = "123";
  const TEST_USERNAME_ADMIN = "admin";
  const TEST_PASSWORD_ADMIN = "123";
  // --- END HARDCODED TEST ACCOUNTS ---

  useEffect(() => {
    const loadToken = async () => {
      try {
        const { token, role } = await getAuthData(); // Sử dụng hàm getAuthData

        if (token) {
          // Xử lý token giả lập (dummy token)
          if (token.startsWith("dummy.")) {
            setAuthToken(token);
            // Dựa vào logic của bạn, vai trò đã được lưu riêng biệt hoặc suy ra từ token
            // Trong ví dụ này, chúng ta giả định role đã được lưu cùng với token
            setUserRole(role);
            console.log("Loaded dummy token. User role:", role);
          } else {
            // Xử lý JWT thật
            const parts = token.split(".");
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              setAuthToken(token);
              setUserRole(payload.role || "user"); // Ưu tiên vai trò từ payload JWT
              axios.defaults.headers.common[
                "Authorization"
              ] = `Bearer ${token}`;
              console.log("Loaded real JWT. User role:", payload.role);
            } else {
              console.warn(
                "Invalid JWT format loaded from storage. Clearing token."
              );
              await deleteAuthData(); // Xóa token không hợp lệ
              setAuthToken(null);
              setUserRole(null);
            }
          }
        }
      } catch (e) {
        console.error(
          "Failed to load auth data from storage. Clearing any invalid data.",
          e
        );
        await deleteAuthData(); // Xóa bất kỳ dữ liệu lỗi nào
        setAuthToken(null);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    setError(null); // Xóa lỗi cũ

    // --- LOGIC TEST ĐĂNG NHẬP (CHỈ DÙNG CHO PHÁT TRIỂN) ---
    if (username === TEST_USERNAME_USER && password === TEST_PASSWORD_USER) {
      console.log("Simulating login for testuser (user role)");
      const dummyToken = `dummy.eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoi${TEST_USERNAME_USER}Iiwicm9sZSI6InVzZXIifQ.signature`;
      const dummyRole = "user";
      await saveAuthData(dummyToken, dummyRole); // Lưu cả token và vai trò
      setAuthToken(dummyToken);
      setUserRole(dummyRole);
      setIsLoading(false);
      return { success: true };
    } else if (
      username === TEST_USERNAME_ADMIN &&
      password === TEST_PASSWORD_ADMIN
    ) {
      console.log("Simulating login for adminuser (admin role)");
      const dummyToken = `dummy.eyJpZCI6IjQ1NiIsInVzZXJuYW1lIjoi${TEST_USERNAME_ADMIN}Iiwicm9sZSI6ImFkbWluIn0.signature`;
      const dummyRole = "admin";
      await saveAuthData(dummyToken, dummyRole); // Lưu cả token và vai trò
      setAuthToken(dummyToken);
      setUserRole(dummyRole);
      setIsLoading(false);
      return { success: true };
    }
    // --- KẾT THÚC LOGIC TEST ĐĂNG NHẬP ---

    // LOGIC ĐĂNG NHẬP THỰC TẾ (Nếu không phải tài khoản test)
    try {
      const response = await axios.post(`${BASE_URL}/login`, {
        username,
        password,
      });
      const { token } = response.data; // Giả sử API trả về { token: "..." }

      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format received from server.");
      }
      const payload = JSON.parse(atob(parts[1])); // Giải mã payload JWT
      const role = payload.role || "user"; // Lấy vai trò từ payload hoặc mặc định là 'user'

      await saveAuthData(token, role); // Lưu token và vai trò thật
      setAuthToken(token);
      setUserRole(role);
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
      await deleteAuthData(); // Sử dụng hàm deleteAuthData
      setAuthToken(null);
      setUserRole(null);
      delete axios.defaults.headers.common["Authorization"]; // Xóa header Auth
    } catch (e) {
      console.error("Failed to delete auth token from storage.", e);
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
  const context = useContext(AuthContext);
  if (context === null) {
    // Kiểm tra null thay vì undefined
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
