import React from "react";
import { AuthProvider } from "./context/AuthContext"; // Import AuthProvider
import AppNavigator from "./navigation/AppNavigator"; // Import AppNavigator

export default function App() {
  return (
    // Đảm bảo AppNavigator được bao bọc bởi AuthProvider
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
