    // D:\WayGenie\front-end\app\_layout.tsx
    import React from "react";
    import { Stack } from "expo-router";
    import { View, ActivityIndicator } from "react-native";

    import { AuthProvider, useAuth } from "../context/AuthContext";
    import AppNavigator from "../navigation/AppNavigator";

    // Đây là component RootLayout chính của Expo Router
    export default function RootLayout() { // <-- Đây là default export
      return (
        // AuthProvider cần bao bọc toàn bộ navigator
        <AuthProvider>
          <RootNavigatorContent />
        </AuthProvider>
      );
    }

    // Component nội bộ để xử lý logic hiển thị dựa trên trạng thái xác thực
    function RootNavigatorContent() {
      const { isLoading } = useAuth(); // Lấy isLoading từ AuthContext

      if (isLoading) {
        return (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        );
      }

      // AppNavigator sẽ xử lý việc hiển thị Stack phù hợp (Auth, App, Admin)
      return <AppNavigator />;
    }
    