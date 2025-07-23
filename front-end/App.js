import React from "react";
import Mapbox from "@rnmapbox/maps";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "./secrets.js";
import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";
import Toast, { BaseToast } from "react-native-toast-message";

Mapbox.setAccessToken(MAPBOX_PUBLIC_ACCESS_TOKEN);

const toastConfig = {
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#007BFF",
        backgroundColor: "#fff",
        zIndex: 999999,
        position: "absolute",
      }} // Thêm position: "absolute"
      text1Style={{ fontSize: 16, fontWeight: "bold" }}
      text2Style={{ fontSize: 14 }}
    />
  ),
};

export default function App() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, position: "relative" }}>
        <AppNavigator />
        <Toast
          config={toastConfig}
          style={{ zIndex: 999999, position: "absolute" }}
        />{" "}
        {/* Đảm bảo Toast ở trên cùng */}
      </View>
    </AuthProvider>
  );
}
