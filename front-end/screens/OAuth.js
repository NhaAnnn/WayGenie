import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";
import axios from "axios";

const handleLoginGoogle = async () => {
  try {
    // 1. Kiểm tra Google Play Services (Android)
    await GoogleSignin.hasPlayServices();

    // 2. Đăng nhập Google và lấy idToken
    const { idToken, user } = await GoogleSignin.signIn();

    // 3. Đăng nhập vào Firebase (tùy chọn)
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    const firebaseUser = await auth().signInWithCredential(googleCredential);

    // 4. Gửi thông tin về backend
    const response = await axios.post("localhost:3000/auth/google", {
      idToken, // Backend sẽ verify token này
      email: user.email,
      name: user.givenName || user.name,
      avatar: user.photo, // (Tùy chọn)
    });

    // 5. Xử lý kết quả từ backend
    if (response.data.success) {
      navigation.navigate("Home");
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    Alert.alert("Lỗi", error.message);
  }
};
