import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const SimulationTrafficCallout = ({ data, onClose, onConfigureSimulation }) => {
  return (
    <View style={styles.calloutContainer}>
      <View style={styles.calloutContent}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Thông tin tuyến đường</Text>
        <Text style={styles.detail}>ID: {data.id}</Text>
        <Text style={styles.detail}>Từ nút: {data.fromNode ?? "N/A"}</Text>
        <Text style={styles.detail}>Đến nút: {data.toNode ?? "N/A"}</Text>
        <Text style={styles.detail}>
          Độ dài: {data.length ? `${data.length} km` : "N/A"}
        </Text>
        <Text style={styles.detail}>
          Trạng thái:
          {data.status === "smooth"
            ? "Thông thoáng"
            : data.status === "moderate"
            ? "Trung bình"
            : "Tắc nghẽn"}
        </Text>
        <Text style={styles.detail}>VC: {(data.VC || 0).toFixed(2)}</Text>
        {data.incidentType && (
          <>
            <Text style={styles.detail}>
              Sự cố:
              {data.incidentType === "accident" ? "Tai nạn" : "Đóng đường"}
            </Text>
            <Text style={styles.detail}>
              Mô tả: {data.incidentDescription ?? "N/A"}
            </Text>
            <Text style={styles.detail}>
              Mức độ: {data.incidentSeverity === "high" ? "Cao" : "Trung bình"}
            </Text>
          </>
        )}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={() => onConfigureSimulation(data.id)}
          >
            <Text style={styles.simulateButtonText}>Mô phỏng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    // Để calloutContent tự quản lý kích thước và vị trí, container này chỉ đơn giản là chứa nó
    backgroundColor: "transparent",
    alignItems: "center", // Giúp calloutContent căn giữa nếu nó nhỏ hơn
    justifyContent: "center",
  },
  calloutContent: {
    backgroundColor: "white",
    borderRadius: 12, // Bo góc mềm mại hơn
    padding: 20, // Tăng padding để nội dung có không gian thở
    paddingTop: 40, // Tăng padding top để có chỗ cho nút đóng
    width: 220, // Tăng nhẹ chiều rộng để trông cân đối hơn
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Bóng đổ rõ hơn, tạo chiều sâu
    shadowOpacity: 0.15, // Giảm nhẹ độ đậm của bóng
    shadowRadius: 10, // Tăng bán kính bóng để mượt hơn
    elevation: 8, // Elevation cho Android
    position: "relative", // Quan trọng để nút đóng có thể absolute
  },
  title: {
    fontSize: 16, // Tăng cỡ chữ tiêu đề
    fontWeight: "bold",
    marginBottom: 15, // Tăng khoảng cách dưới tiêu đề
    color: "#2c3e50", // Màu chữ đậm hơn
    textAlign: "center", // Căn giữa tiêu đề
  },
  detail: {
    fontSize: 14, // Tăng cỡ chữ chi tiết
    color: "#4a4a4a", // Màu chữ chi tiết tối hơn, dễ đọc hơn
    marginBottom: 8, // Tăng khoảng cách giữa các dòng chi tiết
    lineHeight: 20, // Đảm bảo khoảng cách dòng đủ lớn
  },
  buttonWrapper: {
    // New style for button wrapper
    marginTop: 15, // Khoảng cách từ chi tiết đến nút
    alignItems: "center", // Căn giữa nút
  },
  simulateButton: {
    backgroundColor: "#1a73e8", // Màu xanh dương Google Material, nổi bật hơn
    paddingVertical: 12, // Tăng padding dọc
    paddingHorizontal: 25, // Tăng padding ngang
    borderRadius: 8, // Bo góc mềm mại
    alignItems: "center",
    justifyContent: "center",
    // Thêm bóng cho nút
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  simulateButtonText: {
    color: "white",
    fontSize: 15, // Cỡ chữ lớn hơn
    fontWeight: "bold", // Đậm hơn
  },
  closeButton: {
    position: "absolute",
    top: 10, // Dịch xuống một chút
    right: 10, // Dịch vào một chút
    backgroundColor: "red", // Màu xám nhẹ nhàng hơn, không quá chói
    width: 28, // Kích thước lớn hơn một chút
    height: 28,
    borderRadius: 14, // Giữ tròn
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    // Thêm bóng nhẹ cho nút đóng
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  closeButtonText: {
    fontWeight: "bold",
    color: "white", // Màu chữ xám đậm hơn cho dấu X
    fontSize: 16, // Cỡ chữ lớn hơn cho dấu X
  },
});

export default SimulationTrafficCallout;
