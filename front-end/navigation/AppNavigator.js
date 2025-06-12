// navigation/AppNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"; // Sửa lỗi chính tả ở đây
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { View, ActivityIndicator } from "react-native";

import { useAuth } from "../context/AuthContext";

// Import tất cả các màn hình, đảm bảo đường dẫn chính xác
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/user/HomeScreen";
import CurrentStatusMapScreen from "../screens/user/CurrentStatusMapScreen"; // Changed from screens/CurrentStatusMapScreen
import SimulationMapScreen from "../screens/user/SimulationMapScreen"; // Changed from screens/SimulationMapScreen

// // --- NEW/UPDATED ADMIN SCREENS ---
// import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen"; // New dashboard for admin
// import AdminFeaturesScreen from "../screens/admin/AdminFeaturesScreen"; // Renamed from AdminScreen
// import UserManagementScreen from "../screens/admin/UserManagementScreen";
// import AnnouncementsScreen from "../screens/admin/AnnouncementsScreen";
// import SimulatedTrafficScreen from "../screens/admin/SimulatedTrafficScreen"; // New screen for user management
// import ConfigureRouteScreen from "../screens/admin/ConfigureRouteScreen";
// New screen for route configuration
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator(); // Sửa lỗi chính tả ở đây

// Tab Navigator cho người dùng thông thường
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Trang chủ") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Hiện Trạng") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Mô Phỏng") {
            iconName = focused ? "analytics" : "analytics-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007BFF",
        tabBarInactiveTintColor: "gray",
        headerShown: false, // Ẩn header mặc định cho mỗi màn hình tab
        tabBarStyle: {
          height: Platform.OS === "ios" ? 90 : 60,
          paddingBottom: Platform.OS === "ios" ? 20 : 0,
        },
      })}
    >
      <Tab.Screen name="Trang chủ" component={HomeScreen} />
      <Tab.Screen name="Hiện Trạng" component={CurrentStatusMapScreen} />
      <Tab.Screen name="Mô Phỏng" component={SimulationMapScreen} />
    </Tab.Navigator>
  );
}

// Stack Navigator cho người dùng thông thường
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      {/* Thêm các màn hình khác không nằm trong tab bar tại đây nếu cần */}
    </Stack.Navigator>
  );
}

// Stack Navigator cho quản trị viên
// function AdminStack() {
//   return (
//     // <Stack.Navigator screenOptions={{ headerShown: false }}>
//     //   <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
//     //   <Stack.Screen name="AdminFeatures" component={AdminFeaturesScreen} />
//     //   <Stack.Screen name="UserManagement" component={UserManagementScreen} />
//       <Stack.Screen
//         name="SimulatedTraffic"
//         component={SimulatedTrafficScreen}
//       />
//       <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
//       <Stack.Screen
//         name="ConfigureRouteScreen"
//         component={ConfigureRouteScreen}
//       />
//     </Stack.Navigator>
//   );
// }

// Stack Navigator cho xác thực
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Đây là component chính của AppNavigator, xử lý việc hiển thị Stack phù hợp
export default function AppNavigator() {
  const { authToken, userRole, isLoading } = useAuth(); // Giả định useAuth cung cấp authToken và userRole

  if (isLoading) {
    // Điều này sẽ được hiển thị khi AuthContext đang kiểm tra trạng thái ban đầu
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <>
      {authToken ? ( // Nếu người dùng đã xác thực
        userRole === "admin" ? ( // Kiểm tra vai trò
          <AdminStack /> // Hiển thị các màn hình admin
        ) : (
          <AppStack /> // Hiển thị các màn hình ứng dụng thông thường (bao gồm các tab)
        )
      ) : (
        // Nếu người dùng chưa xác thực
        <AuthStack /> // Hiển thị màn hình đăng nhập
      )}
    </>
  );
}
