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
  Alert,
} from "react-native";
import { MaterialIcons, AntDesign } from "@expo/vector-icons";

const ViewGmailAccounts = ({ navigation }) => {
  // State management
  const [gmailAccounts, setGmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "email",
    direction: "asc",
  });

  // Mock data - Replace with actual API call
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockData = [
          {
            id: 1,
            email: "admin@gmail.com",
            status: "Active",
            created: "2023-01-15",
            lastLogin: "2023-06-01",
          },
          {
            id: 2,
            email: "user1@gmail.com",
            status: "Active",
            created: "2023-02-20",
            lastLogin: "2023-06-10",
          },
          {
            id: 3,
            email: "user2@gmail.com",
            status: "Inactive",
            created: "2023-03-10",
            lastLogin: "2023-05-15",
          },
          {
            id: 4,
            email: "support@gmail.com",
            status: "Active",
            created: "2023-04-05",
            lastLogin: "2023-06-05",
          },
          {
            id: 5,
            email: "test@gmail.com",
            status: "Suspended",
            created: "2023-05-12",
            lastLogin: "2023-05-20",
          },
        ];

        setGmailAccounts(mockData);
      } catch (error) {
        Alert.alert("Error", "Failed to fetch Gmail accounts");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter accounts based on search query
  const filteredAccounts = gmailAccounts.filter(
    (account) =>
      account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort accounts
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Handle sort request
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "#4CAF50";
      case "Inactive":
        return "#FFC107";
      case "Suspended":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  // Show account details modal
  const showAccountDetails = (account) => {
    setSelectedAccount(account);
    setIsModalVisible(true);
  };

  // Handle delete account
  const handleDelete = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setGmailAccounts(
              gmailAccounts.filter((account) => account.id !== id)
            );
            Alert.alert("Success", "Account deleted successfully");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading Gmail accounts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Gmail Accounts Management</Text>
        <View style={{ width: 24 }} /> {/* For alignment */}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search accounts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
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
              color="#333"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCell}
          onPress={() => requestSort("status")}
        >
          <Text style={styles.headerText}>Status</Text>
          {sortConfig.key === "status" && (
            <MaterialIcons
              name={
                sortConfig.direction === "asc"
                  ? "arrow-drop-up"
                  : "arrow-drop-down"
              }
              size={20}
              color="#333"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCell}
          onPress={() => requestSort("lastLogin")}
        >
          <Text style={styles.headerText}>Last Login</Text>
          {sortConfig.key === "lastLogin" && (
            <MaterialIcons
              name={
                sortConfig.direction === "asc"
                  ? "arrow-drop-up"
                  : "arrow-drop-down"
              }
              size={20}
              color="#333"
            />
          )}
        </TouchableOpacity>

        <View style={[styles.headerCell, { alignItems: "center" }]}>
          <Text style={styles.headerText}>Actions</Text>
        </View>
      </View>

      {/* Table Content */}
      <ScrollView style={styles.tableContent}>
        {sortedAccounts.length > 0 ? (
          sortedAccounts.map((account) => (
            <View key={account.id} style={styles.tableRow}>
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

              <View style={styles.tableCell}>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(account.status) },
                    ]}
                  />
                  <Text style={styles.cellText}>{account.status}</Text>
                </View>
              </View>

              <View style={styles.tableCell}>
                <Text style={styles.cellText}>{account.lastLogin}</Text>
              </View>

              <View style={[styles.tableCell, styles.actionsCell]}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    navigation.navigate("EditGmailAccount", { account })
                  }
                >
                  <MaterialIcons name="edit" size={20} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(account.id)}
                >
                  <MaterialIcons name="delete" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="email" size={50} color="#ddd" />
            <Text style={styles.emptyText}>No Gmail accounts found</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Account Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddGmailAccount")}
      >
        <AntDesign name="plus" size={20} color="white" />
        <Text style={styles.addButtonText}>Add New Account</Text>
      </TouchableOpacity>

      {/* Account Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account Details</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <AntDesign name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedAccount && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAccount.email}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
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
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAccount.created}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Login:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAccount.lastLogin}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
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
    fontSize: 18,
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
    paddingVertical: 15,
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
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  actionsCell: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    padding: 5,
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
  addButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2196F3",
    padding: 15,
    margin: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
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
});

export default ViewGmailAccounts;
