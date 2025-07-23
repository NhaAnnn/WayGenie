import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Alert } from "react-native";
import axios from "axios";
import { BACKEND_API_BASE_URL } from "../secrets";

const AuthContext = createContext(null);

const TOKEN_KEY = "userToken";
const ROLE_KEY = "userRole";

// Hàm lưu trữ an toàn (dựa vào nền tảng)
const saveAuthData = async (token, role) => {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(ROLE_KEY, role);
      console.log("Saved auth data to AsyncStorage:", { token, role });
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(ROLE_KEY, role);
      console.log("Saved auth data to SecureStore:", { token, role });
    }
  } catch (error) {
    console.error("Failed to save auth data:", error.message);
    throw new Error("Không thể lưu dữ liệu xác thực.");
  }
};

// Hàm lấy token và vai trò an toàn (dựa vào nền tảng)
const getAuthData = async () => {
  try {
    let token = null;
    let role = null;
    if (Platform.OS === "web") {
      token = await AsyncStorage.getItem(TOKEN_KEY);
      role = await AsyncStorage.getItem(ROLE_KEY);
      console.log("Retrieved auth data from AsyncStorage:", { token, role });
    } else {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
      role = await SecureStore.getItemAsync(ROLE_KEY);
      console.log("Retrieved auth data from SecureStore:", { token, role });
    }
    return { token, role };
  } catch (error) {
    console.error("Failed to retrieve auth data:", error.message);
    return { token: null, role: null };
  }
};

// Hàm xóa token và vai trò an toàn (dựa vào nền tảng)
const deleteAuthData = async () => {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(ROLE_KEY);
      console.log("Cleared auth data from AsyncStorage");
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(ROLE_KEY);
      console.log("Cleared auth data from SecureStore");
    }
  } catch (error) {
    console.error("Failed to delete auth data:", error.message);
  }
};

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load token when component mounts
  useEffect(() => {
    const loadToken = async () => {
      setIsLoading(true);
      try {
        const { token, role } = await getAuthData();

        if (token) {
          // Validate JWT format
          const parts = token.split(".");
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]));
              setAuthToken(token);
              setUserRole(role || payload.role || "user");
              axios.defaults.headers.common[
                "Authorization"
              ] = `Bearer ${token}`;
              console.log(
                "Loaded JWT. User role:",
                role || payload.role || "user"
              );
            } catch (e) {
              console.warn("Invalid JWT payload. Clearing token.");
              await deleteAuthData();
              setAuthToken(null);
              setUserRole(null);
            }
          } else {
            console.warn("Invalid JWT format. Clearing token.");
            await deleteAuthData();
            setAuthToken(null);
            setUserRole(null);
          }
        } else {
          console.log("No token found in storage.");
        }
      } catch (e) {
        console.error("Failed to load auth data:", e.message);
        setAuthToken(null);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${BACKEND_API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error(
          "Invalid response from server: Missing token or user data."
        );
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format received from server.");
      }

      const role = user.role || "user";
      await saveAuthData(token, role);
      setAuthToken(token);
      setUserRole(role);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("Login successful. Saved token and role:", { token, role });

      return { success: true };
    } catch (e) {
      console.error("Login failed:", e.response ? e.response.data : e.message);
      setAuthToken(null);
      setUserRole(null);
      const errorMessage =
        e.response?.data?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.";
      setError(errorMessage);
      Alert.alert("Lỗi Đăng Nhập", errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await deleteAuthData();
      setAuthToken(null);
      setUserRole(null);
      delete axios.defaults.headers.common["Authorization"];
      console.log("Logout successful.");
    } catch (e) {
      console.error("Failed to logout:", e.message);
      Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
