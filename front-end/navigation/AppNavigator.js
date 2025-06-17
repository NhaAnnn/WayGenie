// navigation/AppNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";

// Import các màn hình
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/user/HomeScreen";
import CurrentStatusMapScreen from "../screens/user/CurrentStatusMapScreen";
import SimulationMapScreen from "../screens/user/SimulationMapScreen";
import RegisterScreen from "../screens/RegisterScreen.web";
// import MapScreen from "../screens/user/MapScreen.web";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminFeaturesScreen from "../screens/admin/AdminFeaturesScreen";
import UserManagementScreen from "../screens/admin/UserManagementScreen";
import AnnouncementsScreen from "../screens/admin/AnnouncementsScreen";
import SimulatedTrafficScreen from "../screens/admin/SimulatedTrafficScreen";
import ConfigureRouteScreen from "../screens/admin/ConfigureRouteScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator cho người dùng thông thường (chỉ dành cho mobile)
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
        headerShown: false,
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

// Stack Navigator cho người dùng thông thường trên mobile
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      {/* Thêm các màn hình khác không nằm trong tab bar tại đây nếu cần */}
    </Stack.Navigator>
  );
}

// Stack Navigator cho người dùng thông thường trên web
function WebStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="CurrentStatusMap"
        component={CurrentStatusMapScreen}
      />
      <Stack.Screen name="SimulationMap" component={SimulationMapScreen} />

      {/* Thêm các màn hình khác nếu cần */}
    </Stack.Navigator>
  );
}

// Stack Navigator cho quản trị viên
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminFeatures" component={AdminFeaturesScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen
        name="SimulatedTraffic"
        component={SimulatedTrafficScreen}
      />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen
        name="ConfigureRouteScreen"
        component={ConfigureRouteScreen}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator cho xác thực
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { authToken, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <>
      {authToken ? (
        userRole === "admin" ? (
          <AdminStack />
        ) : Platform.OS === "web" ? (
          <WebStack />
        ) : (
          <AppStack />
        )
      ) : (
        <AuthStack />
      )}
    </>
  );
}
