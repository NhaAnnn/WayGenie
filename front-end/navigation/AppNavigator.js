import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"; // Corrected typo
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { View, ActivityIndicator } from "react-native";

import { useAuth } from "../context/AuthContext";

// Import all screens, ensure paths are correct
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/user/HomeScreen";
import CurrentStatusMapScreen from "../screens/user/CurrentStatusMapScreen";
import SimulationMapScreen from "../screens/user/SimulationMapScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminFeaturesScreen from "../screens/admin/AdminFeaturesScreen";
import UserManagementScreen from "../screens/admin/UserManagementScreen";
import AnnouncementsScreen from "../screens/admin/AnnouncementsScreen";
import SimulatedTrafficScreen from "../screens/admin/SimulatedTrafficScreen";
import ConfigureRouteScreen from "../screens/admin/ConfigureRouteScreen";
import PersonalInfoScreen from "../screens/user/PersonalInfoScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator for regular users
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

// Stack Navigator for regular users
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
    </Stack.Navigator>
  );
}

// Stack Navigator for admin
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

// Stack Navigator for authentication
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Main AppNavigator component
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
        ) : (
          <AppStack />
        )
      ) : (
        <AuthStack />
      )}
    </>
  );
}
