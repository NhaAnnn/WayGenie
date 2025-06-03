// navigation/AppNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import HomeScreen from "../screens/web/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import AdminDashboardScreen from "../screens/web/AdminDashboardScreen";

// THÊM DÒNG NÀY ĐỂ IMPORT CÁC COMPONENT TỪ REACT-NATIVE
import { View, ActivityIndicator } from "react-native";

const Stack = createNativeStackNavigator();

function AppStack() {
  // Các màn hình cho người dùng đã đăng nhập (cả User và Admin)
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      {/* Các màn hình khác của ứng dụng */}
    </Stack.Navigator>
  );
}

function AdminStack() {
  // Các màn hình chỉ dành cho Admin
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      {/* Các màn hình quản trị khác */}
    </Stack.Navigator>
  );
}

function AuthStack() {
  // Màn hình đăng nhập/đăng ký
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      {/* Nếu có màn hình đăng ký: <Stack.Screen name="Register" component={RegisterScreen} /> */}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { authToken, userRole, isLoading } = useAuth();

  if (isLoading) {
    // Hiển thị màn hình tải (splash screen) trong khi kiểm tra token
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {authToken ? ( // Nếu có token, tức là đã đăng nhập
        userRole === "admin" ? ( // Nếu vai trò là admin
          <AdminStack />
        ) : (
          // Nếu vai trò là user hoặc khác admin
          <AppStack />
        )
      ) : (
        // Nếu không có token, chuyển đến màn hình đăng nhập
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
