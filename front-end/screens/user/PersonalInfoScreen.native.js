import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert, // Import Alert for user feedback
} from "react-native";

const PersonalInfoScreen = ({ navigation }) => {
  // State for editable user information
  const [name, setName] = useState("Nguyễn Văn A");
  const [email, setEmail] = useState("nguyenvana@example.com");
  const [phone, setPhone] = useState("0912345678");
  const [address, setAddress] = useState("Số 1, Đường ABC, Quận 1, TP.HCM");

  // State to control edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Handle saving changes
  const handleSaveChanges = () => {
    // Here you would typically send data to a backend API
    console.log("Saving changes:", { name, email, phone, address });
    Alert.alert("Thành công", "Thông tin cá nhân đã được lưu.");
    setIsEditing(false); // Exit edit mode after saving
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>{"< Quay lại"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? "Hủy" : "Chỉnh sửa"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Họ và tên:</Text>
            {isEditing ? (
              <TextInput
                style={styles.valueInput}
                value={name}
                onChangeText={setName}
              />
            ) : (
              <Text style={styles.valueText}>{name}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            {isEditing ? (
              <TextInput
                style={styles.valueInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.valueText}>{email}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Số điện thoại:</Text>
            {isEditing ? (
              <TextInput
                style={styles.valueInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.valueText}>{phone}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Địa chỉ:</Text>
            {isEditing ? (
              <TextInput
                style={[styles.valueInput, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.valueText}>{address}</Text>
            )}
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveChanges}
          >
            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f2f5", // Light grey background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007BFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  editButton: {
    padding: 5,
  },
  editButtonText: {
    fontSize: 16,
    color: "#007BFF",
  },
  scrollContent: {
    padding: 20,
    alignItems: "center", // Center content horizontally
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 400, // Max width for larger screens
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#555",
    width: 120, // Fixed width for labels
  },
  valueText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  valueInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#f9f9f9",
  },
  multilineInput: {
    minHeight: 60, // For multiline text input
    textAlignVertical: "top", // Align text to the top for multiline
  },
  saveButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PersonalInfoScreen;
