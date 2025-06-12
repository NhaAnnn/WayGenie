// App.js
import React from "react";
import Mapbox from "@rnmapbox/maps";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "./secrets.js";

Mapbox.setAccessToken(MAPBOX_PUBLIC_ACCESS_TOKEN);

import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
