import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { MaterialIcons, AntDesign } from "@expo/vector-icons";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_API_BASE_URL } from "../../secrets";
import { useAuth } from "../../context/AuthContext";

const AUTH_API_URL = `${BACKEND_API_BASE_URL}/auth`;

const UserManagementScreen = ({ navigation }) => {
  const { authToken, userRole, userId, isLoading: authLoading } = useAuth();
  const [gmailAccounts, setGmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "email",
    direction: "asc",
  });
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!authToken) {
        toast.error("Vui lòng đăng nhập để xem danh sách người dùng");
        setLoading(false);
        navigation.navigate("Login");
        return;
      }
      if (userRole !== "admin") {
        toast.error("Chỉ admin mới có quyền xem danh sách người dùng");
        setLoading(false);
        navigation.navigate("Home");
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching users from:", AUTH_API_URL);
        console.log("Using token:", authToken);
        console.log("User role:", userRole);

        const response = await axios.get(AUTH_API_URL);
        console.log("API Response:", response.data);

        const formattedData = response.data.map((user) => ({
          id: user._id,
          username: user.username,
          email: user.email,
          status: user.role === "admin" ? "Admin" : "User",
          role: user.role,
          created: new Date(user.createdAt).toISOString().split("T")[0],
        }));

        setGmailAccounts(formattedData);
      } catch (error) {
        console.error(
          "Error fetching users:",
          error.response?.data || error.message
        );
        toast.error(
          error.response?.data?.message ||
            "Không thể lấy danh sách người dùng. Vui lòng thử lại."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken, userRole, authLoading, navigation]);

  const openRoleModal = (accountId) => {
    if (userRole !== "admin") {
      toast.error("Chỉ admin mới có quyền thay đổi vai trò");
      return;
    }
    setSelectedAccountId(accountId);
    setIsRoleModalVisible(true);
  };

  const handleRoleChange = async (newRole) => {
    if (!authToken || userRole !== "admin") {
      toast.error("Chỉ admin mới có quyền thay đổi vai trò");
      setIsRoleModalVisible(false);
      return;
    }

    try {
      console.log(`Updating role for user ${selectedAccountId} to ${newRole}`);
      const response = await axios.patch(
        `${AUTH_API_URL}/${selectedAccountId}/role`,
        {
          role: newRole,
        }
      );
      console.log("Update role response:", response.data);

      setGmailAccounts(
        gmailAccounts.map((account) =>
          account.id === selectedAccountId
            ? {
                ...account,
                role: newRole,
                status: newRole === "admin" ? "Admin" : "User",
              }
            : account
        )
      );
      toast.success("Cập nhật vai trò thành công");
    } catch (error) {
      console.error(
        "Error updating role:",
        error.response?.data || error.message
      );
      toast.error(
        error.response?.data?.message || "Không thể cập nhật vai trò"
      );
    } finally {
      setIsRoleModalVisible(false);
      setSelectedAccountId(null);
    }
  };

  const handleDelete = (account) => {
    if (!authToken) {
      toast.error("Vui lòng đăng nhập để xóa tài khoản");
      navigation.navigate("Login");
      return;
    }
    if (userRole !== "admin") {
      toast.error("Chỉ admin mới có quyền xóa tài khoản");
      navigation.navigate("Home");
      return;
    }

    if (account.id === userId) {
      toast.error("Không thể tự xóa tài khoản admin");
      return;
    }

    setAccountToDelete(account);
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    try {
      console.log(
        "Authorization header:",
        axios.defaults.headers.common["Authorization"]
      );
      console.log(
        "DELETE request URL:",
        `${AUTH_API_URL}/${accountToDelete.id}`
      );
      console.log("Deleting user with ID:", accountToDelete.id);

      const response = await axios.delete(
        `${AUTH_API_URL}/${accountToDelete.id}`
      );
      console.log("Delete response:", response.data);

      setGmailAccounts(
        gmailAccounts.filter((account) => account.id !== accountToDelete.id)
      );
      toast.success("Xóa tài khoản thành công");
    } catch (error) {
      console.error("Error deleting user:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      toast.error(error.response?.data?.message || "Không thể xóa tài khoản");
    } finally {
      setIsDeleteModalVisible(false);
      setAccountToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalVisible(false);
    setAccountToDelete(null);
  };

  const filteredAccounts = gmailAccounts.filter(
    (account) =>
      account.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Admin":
        return "#4CAF50";
      case "User":
        return "#FFC107";
      default:
        return "#9E9E9E";
    }
  };

  const showAccountDetails = (account) => {
    setSelectedAccount(account);
    setIsModalVisible(true);
  };

  if (loading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải danh sách tài khoản...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản Lý Tài Khoản</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm tài khoản..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, { flex: 1 }]}>
          <Text style={styles.headerText}>STT</Text>
        </View>
        <TouchableOpacity
          style={[styles.headerCell, { flex: 2 }]}
          onPress={() => requestSort("username")}
        >
          <Text style={styles.headerText}>Username</Text>
          {sortConfig.key === "username" && (
            <MaterialIcons
              name={
                sortConfig.direction === "asc"
                  ? "arrow-drop-up"
                  : "arrow-drop-down"
              }
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerCell, { flex: 3 }]}
          onPress={() => requestSort("email")}
        >
          <Text style={styles.headerText}>Email</Text>
          {sortConfig.key === "email" && (
            <MaterialIcons
              name={
                sortConfig.direction === "asc"
                  ? "arrow-drop-up"
                  : "arrow-drop-down"
              }
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerCell, { flex: 1.5 }]}
          onPress={() => requestSort("status")}
        >
          <Text style={styles.headerText}>Vai trò</Text>
          {sortConfig.key === "status" && (
            <MaterialIcons
              name={
                sortConfig.direction === "asc"
                  ? "arrow-drop-up"
                  : "arrow-drop-down"
              }
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerCell, { flex: 1.5 }]}
          onPress={() => requestSort("created")}
        >
          <Text style={styles.headerText}>Ngày tạo</Text>
          {sortConfig.key === "created" && (
            <MaterialIcons
              name={
                sortConfig.direction === "asc"
                  ? "arrow-drop-up"
                  : "arrow-drop-down"
              }
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        <View style={[styles.headerCell, { flex: 1, alignItems: "center" }]}>
          <Text style={styles.headerText}>Hành động</Text>
        </View>
      </View>

      <ScrollView style={styles.tableContent}>
        {sortedAccounts.length > 0 ? (
          sortedAccounts.map((account, index) => (
            <View key={account.id} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text style={styles.cellText}>{index + 1}</Text>
              </View>
              <TouchableOpacity
                style={[styles.tableCell, { flex: 2 }]}
                onPress={() => showAccountDetails(account)}
              >
                <Text
                  style={styles.cellText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {account.username}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tableCell, { flex: 3 }]}
                onPress={() => showAccountDetails(account)}
              >
                <Text
                  style={styles.cellText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {account.email}
                </Text>
              </TouchableOpacity>

              <View style={[styles.tableCell, { flex: 1.5 }]}>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => openRoleModal(account.id)}
                  disabled={userRole !== "admin"}
                >
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: getStatusColor(account.status) },
                      ]}
                    />
                    <Text style={styles.selectBoxText}>{account.status}</Text>
                  </View>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={16}
                    color="#555"
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.tableCell, { flex: 1.5 }]}>
                <Text style={styles.cellText}>{account.created}</Text>
              </View>

              <View
                style={[
                  styles.tableCell,
                  styles.actionsCell,
                  { flex: 1, justifyContent: "center", alignItems: "center" },
                ]}
              >
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(account)}
                >
                  <MaterialIcons name="delete" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="email" size={50} color="#ddd" />
            <Text style={styles.emptyText}>Không tìm thấy tài khoản Gmail</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isRoleModalVisible}
        onRequestClose={() => setIsRoleModalVisible(false)}
      >
        <View style={styles.roleModalContainer}>
          <View style={styles.roleModalContent}>
            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => handleRoleChange("user")}
            >
              <Text style={styles.roleOptionText}>User</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => handleRoleChange("admin")}
            >
              <Text style={styles.roleOptionText}>Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roleCancelButton}
              onPress={() => setIsRoleModalVisible(false)}
            >
              <Text style={styles.roleCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết tài khoản</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                {/* <AntDesign name="close" size={24} color="#333" /> */}
              </TouchableOpacity>
            </View>

            {selectedAccount && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Username:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAccount.username}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAccount.email}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vai trò:</Text>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusIndicator,
                        {
                          backgroundColor: getStatusColor(
                            selectedAccount.status
                          ),
                        },
                      ]}
                    />
                    <Text style={styles.detailValue}>
                      {selectedAccount.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày tạo:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAccount.created}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="none"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalText}>
              Bạn đang xóa tài khoản này
            </Text>
            {accountToDelete && (
              <View style={styles.deleteInfoContainer}>
                <Text style={styles.deleteInfoText}>
                  Username: {accountToDelete.username}
                </Text>
                <Text style={styles.deleteInfoText}>
                  Email: {accountToDelete.email}
                </Text>
              </View>
            )}
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalButtonText}>Xóa tài khoản</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDelete}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#fff",
    margin: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  headerCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    color: "#fff",
    fontWeight: "bold",
    marginRight: 5,
  },
  tableContent: {
    flex: 1,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 5,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tableCell: {
    flex: 1,
    justifyContent: "center",
  },
  cellText: {
    color: "#555",
    fontSize: 13,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#fff",
    maxWidth: 100,
  },
  selectBoxText: {
    color: "#555",
    fontSize: 12,
  },
  actionsCell: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    paddingRight: 50,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
  },
  emptyText: {
    marginTop: 15,
    color: "#999",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "20%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  detailLabel: {
    width: 100,
    fontWeight: "bold",
    color: "#555",
  },
  detailValue: {
    flex: 1,
    color: "#333",
  },
  modalButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  roleModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  roleModalContent: {
    width: 280,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  roleOption: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    width: "100%",
    alignItems: "center",
  },
  roleOptionText: {
    fontSize: 14,
    color: "#333",
  },
  roleCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#F44336",
    borderRadius: 4,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  roleCancelText: {
    fontSize: 14,
    color: "white",
  },
  deleteModalContent: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
  },
  deleteModalText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  deleteInfoContainer: {
    paddingLeft: 30,
    marginBottom: 20,
    alignItems: "flex-start",
    width: "100%",
  },
  deleteInfoText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  deleteModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  deleteButton: {
    backgroundColor: "#F44336",
    flex: 1,
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: "#9E9E9E",
    flex: 1,
    marginLeft: 10,
  },
});

export default UserManagementScreen;
