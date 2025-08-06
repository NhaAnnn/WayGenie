import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { BACKEND_API_BASE_URL } from "../../secrets";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StatisticalManagementSection = ({ setActiveSection }) => {
  const [dayStats, setDayStats] = useState(null);
  const [monthStats, setMonthStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const STATS_API_URL = `${BACKEND_API_BASE_URL}/search-route/stats`;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
        });
        const thisMonth = today.substring(0, 7);

        // Lấy dữ liệu theo ngày (7 ngày gần nhất)
        const dailyDates = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dailyDates.push(
            date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
          );
        }

        const dailyStatsPromises = dailyDates.map(async (date) => {
          try {
            const response = await axios.get(`${STATS_API_URL}/day/${date}`);
            console.log(`Data for ${date}:`, response.data);
            return {
              date,
              totalRequests: response.data.totalRequests || 0,
              uniqueUsers: response.data.uniqueUsers || 0,
            };
          } catch (err) {
            console.error(`Error fetching ${date}:`, err.message);
            return { date, totalRequests: 0, uniqueUsers: 0 };
          }
        });
        const dailyStatsData = await Promise.all(dailyStatsPromises);
        console.log("Daily stats:", dailyStatsData);
        setDailyStats(dailyStatsData);

        // Lấy dữ liệu theo tháng
        const monthResponse = await axios.get(
          `${STATS_API_URL}/month/${thisMonth}`
        );
        setMonthStats(monthResponse.data);

        // Lấy dữ liệu tất cả (cho tháng)
        const allResponse = await axios.get(`${STATS_API_URL}/all`, {
          params: { page: 1, limit: 1000 },
        });
        const allData = allResponse.data.data;

        const monthlyDates = [];
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          monthlyDates.push(
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
              2,
              "0"
            )}`
          );
        }
        const monthlyStatsData = monthlyDates.map((month) => {
          const monthData = allData.filter((item) =>
            item.dateKey.startsWith(month)
          );
          const totalRequests = monthData.length;
          return { month, totalRequests };
        });
        setMonthlyStats(monthlyStatsData);

        const dayResponse = await axios.get(`${STATS_API_URL}/day/${today}`);
        setDayStats(dayResponse.data);
      } catch (err) {
        console.error(
          "Lỗi chi tiết:",
          err.response ? err.response.data : err.message
        );
        setError("Không thể tải thống kê. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Hàm định dạng ngày từ YYYY-MM-DD sang DD/MM
  const formatDateToDDMM = (dateString) => {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}`;
  };

  const dailyChartData = {
    labels: dailyStats.map((stat) => formatDateToDDMM(stat.date)),
    datasets: [
      {
        label: "Tổng số lượt tìm kiếm (Ngày)",
        data: dailyStats.map((stat) => stat.totalRequests || 0),
        borderColor: "rgba(255, 159, 64, 1)",
        backgroundColor: "rgba(255, 159, 64, 0.5)",
        fill: false,
        tension: 0.1,
        pointRadius: 3,
      },
      {
        label: "Tổng số người dùng truy cập (Ngày)",
        data: dailyStats.map((stat) => stat.uniqueUsers || 0),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        fill: false,
        tension: 0.1,
        pointRadius: 3,
      },
    ],
  };

  const dailyChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Thống kê lượt tìm kiếm và người dùng theo ngày (7 ngày gần nhất)",
        font: { size: 16 },
        color: "#333",
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Ngày", color: "#333" },
        ticks: { color: "#333", font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "Số lượng", color: "#333" },
        ticks: { color: "#333", stepSize: 1, font: { size: 10 } },
      },
    },
  };

  const monthlyChartData = {
    labels: monthlyStats.map((stat) => stat.month.substring(5, 7)),
    datasets: [
      {
        label: "Tổng số lượt tìm kiếm (Tháng)",
        data: monthlyStats.map((stat) => stat.totalRequests || 0),
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        fill: false,
        tension: 0.1,
        pointRadius: 3,
      },
    ],
  };

  const monthlyChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Thống kê lượt tìm kiếm theo tháng năm 2025",
        font: { size: 16 },
        color: "#333",
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Tháng", color: "#333" },
        ticks: { color: "#333", font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "Số lượng", color: "#333" },
        ticks: { color: "#333", stepSize: 10, font: { size: 10 } },
      },
    },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.chartRow}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalTitle}>Tổng lượt tìm kiếm hôm nay</Text>
            <Text style={styles.totalText}>
              {dayStats ? dayStats.totalRequests : 0}
            </Text>
            <Text style={styles.totalTitle}>Tổng người dùng hôm nay</Text>
            <Text style={styles.totalText}>
              {dayStats ? dayStats.uniqueUsers : 0}
            </Text>
          </View>
          <View style={styles.chartContainer}>
            <Line data={dailyChartData} options={dailyChartOptions} />
          </View>
        </View>
        <View style={styles.chartRow}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalTitle}>Tổng lượt tìm kiếm tháng</Text>
            <Text style={styles.totalText}>
              {monthStats ? monthStats.totalRequests : 0}
            </Text>
          </View>
          <View style={styles.chartContainer}>
            <Line data={monthlyChartData} options={monthlyChartOptions} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  contentContainer: { padding: 20, paddingBottom: 20 },
  chartRow: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: "flex-start",
    borderColor: "#666",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
  },
  totalContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 10,
  },
  totalText: { fontSize: 14, color: "#666", marginBottom: 5 },
  chartContainer: {
    flex: 2,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: { fontSize: 16, color: "red", textAlign: "center" },
});

export default StatisticalManagementSection;
