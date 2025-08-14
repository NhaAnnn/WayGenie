import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import axios from "axios";
import { BACKEND_API_BASE_URL } from "../secrets";

const AuthContext = createContext(null);

const TOKEN_KEY = "userToken";
const ROLE_KEY = "userRole";

const BASE_URL = `${BACKEND_API_BASE_URL}/auth`;

const saveAuthData = async (token, role, user) => {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(ROLE_KEY, role);
    await AsyncStorage.setItem("user", JSON.stringify(user));
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(ROLE_KEY, role);
    await SecureStore.setItemAsync("user", JSON.stringify(user));
  }
};

const getAuthData = async () => {
  let token = null;
  let role = null;
  let user = null;
  if (Platform.OS === "web") {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    role = await AsyncStorage.getItem(ROLE_KEY);
    const userData = await AsyncStorage.getItem("user");
    user = userData ? JSON.parse(userData) : null;
  } else {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
    role = await SecureStore.getItemAsync(ROLE_KEY);
    const userData = await SecureStore.getItemAsync("user");
    user = userData ? JSON.parse(userData) : null;
  }
  return { token, role, user };
};

const deleteAuthData = async () => {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(ROLE_KEY);
    await AsyncStorage.removeItem("user");
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
    await SecureStore.deleteItemAsync("user");
  }
};

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const { token, role, user } = await getAuthData();

        if (token) {
          const parts = token.split(".");
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]));
              setAuthToken(token);
              setUserRole(payload.role || "user");
              if (user) {
                setUser(user);
              } else {
                const response = await axios.get(`${BASE_URL}/me`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                setUser(response.data.user);
                await saveAuthData(
                  token,
                  payload.role || "user",
                  response.data.user
                );
              }
              axios.defaults.headers.common[
                "Authorization"
              ] = `Bearer ${token}`;
            } catch (e) {
              console.warn("Invalid JWT format in storage. Clearing token.");
              await deleteAuthData();
              setAuthToken(null);
              setUserRole(null);
              setUser(null);
            }
          } else {
            console.warn("Invalid token format in storage. Clearing token.");
            await deleteAuthData();
            setAuthToken(null);
            setUserRole(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error("Failed to load auth data from storage:", e);
        await deleteAuthData();
        setAuthToken(null);
        setUserRole(null);
        setUser(null);
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
      const response = await axios.post(`${BASE_URL}/login`, {
        email,
        password,
      });

      const { token, user } = response.data;

      if (!token || !user || !user.role) {
        throw new Error(
          `Invalid response format from server. Received: ${JSON.stringify(
            response.data
          )}`
        );
      }

      await saveAuthData(token, user.role, user);
      setAuthToken(token);
      setUserRole(user.role);
      setUser(user);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
        },
      };
    } catch (e) {
      console.error("Login failed:", e.response ? e.response.data : e.message);
      setAuthToken(null);
      setUserRole(null);
      setUser(null);
      setError(
        e.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra tên đăng nhập/email và mật khẩu."
      );
      return {
        success: false,
        error: e.response?.data?.message || "Đăng nhập thất bại.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username, email, password) => {
    setError(null);

    try {
      console.log("Sending register request to:", `${BASE_URL}/register`);
      console.log("Request payload:", { username, email, password });

      const response = await axios.post(`${BASE_URL}/register`, {
        username,
        email,
        password,
      });

      console.log("API response:", response.data);

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error(
          `Invalid response format from server. Received: ${JSON.stringify(
            response.data
          )}`
        );
      }

      const role = user.role || "user";

      await saveAuthData(token, role, { ...user, role });
      setAuthToken(token);
      setUserRole(role);
      setUser({ ...user, role });
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("Register successful. User:", { ...user, role });

      setIsLoading(false);

      return {
        success: true,
        user: {
          id: user.id || null,
          username: user.username || username,
          email: user.email || email,
          role: role,
        },
      };
    } catch (e) {
      console.error(
        "Register failed:",
        e.response ? e.response.data : e.message
      );
      const errorMessage =
        e.response?.data?.message ||
        "Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.";
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await deleteAuthData();
      setAuthToken(null);
      setUserRole(null);
      setUser(null);
      delete axios.defaults.headers.common["Authorization"];
      console.log("Logout successful.");
      return { success: true };
    } catch (e) {
      console.error("Failed to delete auth data:", e);
      setError("Đăng xuất thất bại. Vui lòng thử lại.");
      return { success: false, error: "Đăng xuất thất bại." };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = useCallback(
    (updatedUser) => {
      setUser(updatedUser);
      saveAuthData(authToken, updatedUser.role || userRole, updatedUser);
    },
    [authToken, userRole]
  );

  return (
    <AuthContext.Provider
      value={{
        authToken,
        userRole,
        user,
        isLoading,
        error,
        login,
        logout,
        register,
        updateUser,
      }}
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
