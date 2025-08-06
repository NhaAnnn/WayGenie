import React, { useState } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UploadScreen = ({ navigation }) => {
  const [nodeFile, setNodeFile] = useState(null);
  const [linkFile, setLinkFile] = useState(null);
  const [shapefile, setShapefile] = useState([]);
  const [loading, setLoading] = useState(false);

  // Xử lý chọn file node.csv
  const handleNodeFileChange = (event) => {
    setNodeFile(event.target.files[0]);
  };

  // Xử lý chọn file link.csv
  const handleLinkFileChange = (event) => {
    setLinkFile(event.target.files[0]);
  };

  // Xử lý chọn nhiều file shapefile
  const handleShapefileChange = (event) => {
    const files = Array.from(event.target.files);
    setShapefile(files);
    console.log(
      "Shapefile selected:",
      files.map((f) => f.name)
    );

    const requiredExts = [".shp", ".shx", ".dbf", ".prj", ".ctf"];
    const selectedExts = files.map((f) => f.name.toLowerCase());
    const missingExts = requiredExts.filter(
      (ext) => !selectedExts.some((name) => name.endsWith(ext))
    );

    if (files.length !== 5) {
      toast.error(
        "Phải chọn đúng 5 file shapefile (.shp, .shx, .dbf, .prj, .ctf).",
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
    } else if (missingExts.length > 0) {
      toast.error(`Thiếu các file shapefile: ${missingExts.join(", ")}.`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Gửi file lên server
  const handleUpload = async () => {
    if (!nodeFile || !linkFile || shapefile.length !== 5) {
      toast.error(
        "Vui lòng chọn đầy đủ các file: node.csv, link.csv, và đúng 5 file shapefile (.shp, .shx, .dbf, .prj, .ctf).",
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
      return;
    }

    const requiredExts = [".shp", ".shx", ".dbf", ".prj", ".ctf"];
    const selectedExts = shapefile.map((f) => f.name.toLowerCase());
    const missingExts = requiredExts.filter(
      (ext) => !selectedExts.some((name) => name.endsWith(ext))
    );

    if (missingExts.length > 0) {
      toast.error(`Thiếu các file shapefile: ${missingExts.join(", ")}.`, {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("nodeFile", nodeFile);
    formData.append("linkFile", linkFile);
    shapefile.forEach((file) => {
      formData.append("shapefile", file);
    });

    try {
      const response = await axios.post(
        "http://localhost:3000/api/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success(response.data.message, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(error.response?.data?.error || error.message, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Giao diện chỉ hoạt động trên web
  if (Platform.OS !== "web") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            Tính năng tải file chỉ hỗ trợ trên web.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Nút Home */}
      <TouchableWithoutFeedback
        onPress={() => navigation.navigate("AdminDashboard")}
      >
        <View style={styles.homeButton}>
          <Ionicons name="home" size={24} color="#3366dd" />
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>
          Tải Dữ Liệu Tuyến Đường Giao Thông Từ File
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tệp node.csv:</Text>
          <View style={styles.fileInputWrapper}>
            <input
              type="file"
              accept=".csv"
              onChange={handleNodeFileChange}
              style={styles.fileInput}
            />
            {nodeFile && <Text style={styles.fileName}>{nodeFile.name}</Text>}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tệp link.csv:</Text>
          <View style={styles.fileInputWrapper}>
            <input
              type="file"
              accept=".csv"
              onChange={handleLinkFileChange}
              style={styles.fileInput}
            />
            {linkFile && <Text style={styles.fileName}>{linkFile.name}</Text>}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Tệp Shapefile (.shp, .shx, .dbf, .prj, .ctf):
          </Text>
          <View style={styles.fileInputWrapper}>
            <input
              type="file"
              accept=".shp,.shx,.dbf,.prj,.ctf"
              multiple
              onChange={handleShapefileChange}
              style={styles.fileInput}
            />
            {shapefile.length > 0 && (
              <Text style={styles.fileName}>
                {shapefile.map((f) => f.name).join(", ")}
              </Text>
            )}
          </View>
        </View>

        <TouchableWithoutFeedback onPress={handleUpload} disabled={loading}>
          <View style={[styles.uploadButton, loading && styles.disabledButton]}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Tải Lên</Text>
            )}
          </View>
        </TouchableWithoutFeedback>

        <Text style={styles.requirementText}>
          Yêu cầu: File shapefile phải được chuyển đổi CRS từ ESRI:53004 sang
          EPSG:4326 bằng GDAL.
        </Text>
      </View>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 30,
  },
  inputContainer: {
    width: "100%",
    maxWidth: 500,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  fileInputWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  fileInput: {
    flex: 1,
    padding: 5,
  },
  fileName: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  uploadButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  requirementText: {
    marginTop: 15,
    fontSize: 14,
    color: "#2c3e50",
    textAlign: "center",
    fontStyle: "italic",
  },
  homeButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 20,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default UploadScreen;
