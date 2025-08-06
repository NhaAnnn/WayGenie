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
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminFeaturesScreen from "../screens/admin/AdminFeaturesScreen";
import UserManagementScreen from "../screens/admin/UserManagementScreen";
import AnnouncementsScreen from "../screens/admin/AnnouncementsScreen";
import SimulatedTrafficScreen from "../screens/admin/SimulatedTrafficScreen";
import ConfigureRouteScreen from "../screens/admin/ConfigureRouteScreen";
import PersonalInfoScreen from "../screens/user/PersonalInfoScreen";
import StationManagement from "../screens/admin/StationManagement.web";
import CordinateManagement from "../screens/admin/CordinateManagement.web";
import RouteManagement from "../screens/admin/RouteManagement.web";
import UploadManagement from "../screens/admin/UploadManagement";
import ForgotPassword from "../screens/ForgotPassword";
import ResetPassword from "../screens/ResetPassword";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator cho người dùng thông thường (chỉ dành cho mobile)
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "CurrentStatusMap") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "SimulationMap") {
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="CurrentStatusMap" component={CurrentStatusMapScreen} />
      <Tab.Screen name="SimulationMap" component={SimulationMapScreen} />
    </Tab.Navigator>
  );
}

// Stack Navigator cho người dùng thông thường trên mobile
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
    </Stack.Navigator>
  );
}

// Stack Navigator cho người dùng thông thường trên web
function WebStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="PersonalInfoScreen" component={PersonalInfoScreen} />
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
        name="CoordinateManagement"
        component={CordinateManagement}
      />
      <Stack.Screen
        name="SimulatedTraffic"
        component={SimulatedTrafficScreen}
      />
      <Stack.Screen name="RouteManagement" component={RouteManagement} />
      <Stack.Screen name="StationManagement" component={StationManagement} />
      <Stack.Screen name="UploadManagement" component={UploadManagement} />
      <Stack.Screen
        name="ConfigureRouteScreen"
        component={ConfigureRouteScreen}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator for authentication
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
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
        userRole === "admin" && Platform.OS === "web" ? (
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
