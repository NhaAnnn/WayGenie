// D:\WayGenie\front-end\app\index.tsx
import { Redirect } from 'expo-router';
import React from 'react';

// Trong Expo Router, app/index.tsx thường là một route.
// Chúng ta sẽ chuyển hướng nó đến trang chính hoặc trang đăng nhập
// để AppNavigator (được render trong _layout.tsx) xử lý logic xác thực.
export default function IndexScreen() {
  return <Redirect href="/MainTabs" />; // Hoặc href="/Login" nếu bạn muốn luôn bắt đầu từ Login
}
