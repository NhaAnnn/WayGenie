import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  LayoutAnimation, // Import LayoutAnimation for smooth transitions
  Platform,
  UIManager,
} from "react-native";
import axios from "axios";

// Assume these are correctly imported from your project
import { transportModes } from "../data/transportModes";
import { MAPBOX_PUBLIC_ACCESS_TOKEN } from "../secrets";
import RouteDetailsModal from "./RouteDetailsModal";
import { Ionicons } from "@expo/vector-icons";

// Enable LayoutAnimation for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

// Default coordinates for Hanoi (example)
const DEFAULT_HANOI_COORDS = [21.0278, 105.8342]; // Latitude, Longitude

const RouteFindingPanel = ({ onRouteSelected, onClearRoute }) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState("driving"); // Initialize with default value

  const [startCoords, setStartCoords] = useState(null); // [lon, lat]
  const [endCoords, setEndCoords] = useState(null); // [lon, lat]

  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null); // 'start' or 'end'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const debouncedStartText = useDebounce(start, 300);
  const debouncedEndText = useDebounce(end, 300);

  const [suggestedRoutes, setSuggestedRoutes] = useState([]); // Contains all suggested routes from Mapbox
  const [isRouteDetailsModalVisible, setIsRouteDetailsModalVisible] =
    useState(false);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null); // Selected route details to show in modal

  // New state to control visibility of transport modes and criteria options
  const [hasPerformedInitialSearch, setHasPerformedInitialSearch] =
    useState(false);

  // State for routing criteria
  const [routingCriteria] = useState([
    { id: "fastest", name: "Nhanh nhất" },
    { id: "shortest", name: "Ngắn nhất" },
    { id: "least_traffic", name: "Ít tắc đường" },
    { id: "least_polluted", name: "Ít ô nhiễm" },
  ]);
  const [selectedRoutingCriterionId, setSelectedRoutingCriterionId] =
    useState("fastest");

  // State to control panel expansion/collapse
  const [isPanelExpanded, setIsPanelExpanded] = useState(true); // Start expanded

  // Refs and state for TextInput positions to correctly place suggestion lists
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const [startInputLayout, setStartInputLayout] = useState(null);
  const [endInputLayout, setEndInputLayout] = useState(null);
  const [panelLayout, setPanelLayout] = useState(null); // Layout of the entire panel

  // Set default Hanoi coordinates on initial load if start is empty
  useEffect(() => {
    if (!startCoords && start === "") {
      setStartCoords([DEFAULT_HANOI_COORDS[1], DEFAULT_HANOI_COORDS[0]]);
      setStart("Hà Nội (Mặc định)");
    }
  }, []);

  // Effect for debounced start text autocomplete
  useEffect(() => {
    if (activeInput === "start") {
      handleAutocomplete(debouncedStartText, "start");
    }
  }, [debouncedStartText, activeInput]);

  // Effect for debounced end text autocomplete
  useEffect(() => {
    if (activeInput === "end") {
      handleAutocomplete(debouncedEndText, "end");
    }
  }, [debouncedEndText, activeInput]);

  // Effect to re-fetch route when mode or criterion changes (only if an initial search was performed)
  useEffect(() => {
    if (hasPerformedInitialSearch && startCoords && endCoords) {
      fetchRoute();
    }
  }, [mode, selectedRoutingCriterionId, hasPerformedInitialSearch]);

  /**
   * Toggles the expansion state of the panel.
   * Also dismisses the keyboard and clears suggestions.
   */
  const togglePanelExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Smooth transition
    setIsPanelExpanded((prev) => !prev);
    Keyboard.dismiss(); // Dismiss keyboard when toggling
    setSuggestions([]); // Clear suggestions when toggling
    setActiveInput(null); // Clear active input
  };

  /**
   * Handles autocomplete suggestions from Mapbox Geocoding API.
   * @param {string} text - The input text for which to get suggestions.
   * @param {'start' | 'end'} inputType - Indicates which input field is active.
   */
  const handleAutocomplete = async (text, inputType) => {
    if (!text) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          text
        )}.json`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            limit: 5,
            language: "vi",
            country: "vn",
            types: "place,locality,address,poi,district,region",
          },
        }
      );
      const hits = res.data.features.map((feature) => ({
        name: feature.place_name,
        coords: [feature.center[0], feature.center[1]], // Store as [lon, lat]
      }));

      setSuggestions(hits);
      setError("");
    } catch (e) {
      console.error(
        "Mapbox Autocomplete Error:",
        e.response ? e.response.data : e.message
      );
      setSuggestions([]);
      setError("Không thể lấy gợi ý địa điểm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Selects a suggestion from the autocomplete list and updates the corresponding input field.
   * @param {object} place - The selected place object with name and coordinates.
   */
  const selectSuggestion = (place) => {
    Keyboard.dismiss();
    if (activeInput === "start") {
      setStart(place.name);
      setStartCoords(place.coords);
    } else {
      setEnd(place.name);
      setEndCoords(place.coords);
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const fetchRoute = async () => {
    if (!startCoords || !endCoords) {
      setError("Vui lòng chọn điểm đi và điểm đến.");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestedRoutes([]);

    try {
      const startLonLat = `${startCoords[0]},${startCoords[1]}`;
      const endLonLat = `${endCoords[0]},${endCoords[1]}`;

      const currentMode = mode || "driving";

      console.log("Searching for route with:", {
        startLonLat,
        endLonLat,
        mode: currentMode,
        criterion: selectedRoutingCriterionId,
      });

      const res = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${currentMode}/${startLonLat};${endLonLat}`,
        {
          params: {
            access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
            geometries: "geojson",
            overview: "full",
            steps: true,
            alternatives: true,
          },
        }
      );

      console.log(
        "Response from Mapbox Directions API:",
        JSON.stringify(res.data, null, 2)
      );

      if (res.data.routes && res.data.routes.length > 0) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Smooth transition
        setSuggestedRoutes(res.data.routes);
        setHasPerformedInitialSearch(true); // Successfully searched, show options
        // Removed: setIsPanelExpanded(false); // This line is removed to prevent automatic collapse

        const allGeoJSONs = res.data.routes.map((route) => route.geometry);

        onRouteSelected(
          startCoords, // Is [lon, lat]
          endCoords, // Is [lon, lat]
          allGeoJSONs // PASS ALL GEOJSONs ARRAY
        );
        console.log("Route found successfully and map updated.");
      } else {
        setError("Không tìm thấy tuyến đường cho các điểm đã chọn.");
        console.warn("No routes found from API.");
      }
    } catch (error) {
      console.error(
        "Mapbox Directions API Error:",
        error.response ? error.response.data : error.message
      );
      if (error.response && error.response.status === 401) {
        setError(
          "Lỗi xác thực API. Vui lòng kiểm tra lại Access Token Mapbox của bạn."
        );
      } else if (error.response && error.response.data) {
        setError(
          `Lỗi tìm đường: ${error.response.data.message || error.message}`
        );
      } else {
        setError(
          `Không thể lấy dữ liệu tuyến đường: ${error.message}. Vui lòng kiểm tra kết nối hoặc thử lại.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the 'Find Route' button press.
   * Displays an alert if start/end points are not selected from suggestions.
   */
  const handleFindRoute = () => {
    if (!startCoords || !endCoords) {
      Alert.alert("Thông báo", "Vui lòng chọn điểm đi và điểm đến từ gợi ý.");
      return;
    }
    fetchRoute();
  };

  /**
   * Shows the detailed information modal for a selected route.
   * @param {object} route - The route object to display details for.
   */
  const showRouteDetails = (route) => {
    setSelectedRouteDetails(route);
    setIsRouteDetailsModalVisible(true);
  };

  /**
   * Closes the route details modal.
   */
  const closeRouteDetailsModal = () => {
    setIsRouteDetailsModalVisible(false);
    setSelectedRouteDetails(null);
  };

  // Callback to get the layout of the main panel
  const onPanelLayout = (event) => {
    setPanelLayout(event.nativeEvent.layout);
  };

  // Function to get absolute layout of an input field
  const getAbsoluteLayout = (ref) => {
    return new Promise((resolve) => {
      if (ref.current) {
        // Use measureInWindow to get absolute coordinates within the window
        ref.current.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      } else {
        resolve(null);
      }
    });
  };

  // Function to handle touches anywhere outside inputs/suggestions
  const handleScreenPress = () => {
    // Only dismiss keyboard and suggestions if an input is active
    if (activeInput) {
      Keyboard.dismiss();
      setActiveInput(null);
      setSuggestions([]); // Clear suggestions when losing focus
    }
  };

  return (
    <View
      style={[styles.container, !isPanelExpanded && styles.containerCollapsed]}
      onLayout={onPanelLayout}
    >
      {/* TouchableWithoutFeedback covers the entire panel to dismiss keyboard/suggestions */}
      <TouchableWithoutFeedback onPress={handleScreenPress}>
        {/* ScrollView for the panel content */}
        <ScrollView
          keyboardShouldPersistTaps="handled" // Important for TouchableOpacity within suggestions to work
          contentContainerStyle={styles.scrollContent}
        >
          {/* Input Fields for Start and End Points */}
          <View style={styles.inputContainer}>
            {/* Start Input Group */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={startInputRef} // Assign ref
                style={styles.input}
                placeholder="📍 Điểm đi"
                value={start}
                onChangeText={setStart}
                onFocus={async () => {
                  setActiveInput("start");
                  setSuggestions([]);
                  const layout = await getAbsoluteLayout(startInputRef);
                  setStartInputLayout(layout);
                  if (!isPanelExpanded) {
                    // Expand panel if it's collapsed and input gets focus
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut
                    );
                    setIsPanelExpanded(true);
                  }
                }}
                onBlur={() => {
                  // Keep empty for TouchableWithoutFeedback to handle suggestion dismissal
                }}
                placeholderTextColor="#888"
              />
            </View>

            {/* End Input Group */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={endInputRef} // Assign ref
                style={styles.input}
                placeholder="🏁 Điểm đến"
                value={end}
                onChangeText={setEnd}
                onFocus={async () => {
                  setActiveInput("end");
                  setSuggestions([]);
                  const layout = await getAbsoluteLayout(endInputRef);
                  setEndInputLayout(layout);
                  if (!isPanelExpanded) {
                    // Expand panel if it's collapsed and input gets focus
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut
                    );
                    setIsPanelExpanded(true);
                  }
                }}
                onBlur={() => {
                  // Keep empty for TouchableWithoutFeedback to handle suggestion dismissal
                }}
                placeholderTextColor="#888"
              />
            </View>
          </View>

          {/* Transport Mode Selection and Routing Criteria - Only visible after initial search AND when panel is expanded */}
          {hasPerformedInitialSearch && isPanelExpanded && (
            <View style={styles.modeAndCriteriaContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.modeScroll}
                contentContainerStyle={styles.modeScrollContent}
              >
                {transportModes.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.modeButton,
                      mode === item.mapboxProfile && styles.modeButtonSelected,
                    ]}
                    onPress={() => setMode(item.mapboxProfile)}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        mode === item.mapboxProfile && styles.modeTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Routing Criteria Controls */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.criteriaScroll}
                contentContainerStyle={styles.criteriaScrollContent}
              >
                {routingCriteria.map((criterion) => (
                  <TouchableOpacity
                    key={criterion.id}
                    style={[
                      styles.criteriaButton, // Specific style for criterion button
                      selectedRoutingCriterionId === criterion.id
                        ? styles.criteriaButtonSelected
                        : {},
                    ]}
                    onPress={() => setSelectedRoutingCriterionId(criterion.id)}
                  >
                    <Text
                      style={[
                        styles.criteriaText, // Specific style for criterion text
                        selectedRoutingCriterionId === criterion.id
                          ? styles.criteriaTextSelected
                          : {},
                      ]}
                    >
                      {criterion.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Find Route Button - Only visible when expanded */}
          {isPanelExpanded && (
            <TouchableOpacity
              style={styles.findButton}
              onPress={handleFindRoute}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="search" size={16} color="#fff" />
                  <Text style={styles.findButtonText}>Tìm đường</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {isPanelExpanded && error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Suggested Routes Display - Only visible after initial search AND when panel is expanded */}
          {suggestedRoutes.length > 0 && isPanelExpanded && (
            <View style={styles.suggestedRoutesContainer}>
              <Text style={styles.suggestedRoutesTitle}>
                Các Lộ trình Gợi ý:
              </Text>
              {/* ScrollView to scroll the list of routes if many */}
              <ScrollView
                style={styles.suggestedRoutesList}
                nestedScrollEnabled
              >
                {suggestedRoutes.map((item, index) => (
                  <TouchableOpacity
                    key={`route-${index}`}
                    style={styles.suggestedRouteItem}
                    onPress={() => showRouteDetails(item)}
                  >
                    <Text style={styles.suggestedRouteText}>
                      <Text>{`Lộ trình ${index + 1}: `}</Text>
                      <Text style={styles.routeDetailHighlight}>
                        {(item.distance / 1000).toFixed(1)} km
                      </Text>
                      <Text>{` (`}</Text>
                      <Text style={styles.routeDetailHighlight}>
                        {(item.duration / 60).toFixed(0)} phút
                      </Text>
                      <Text>{`)`}</Text>
                    </Text>
                    {/* Add icon or indicator for the main route if needed */}
                    {index === 0 && (
                      <Text style={styles.mainRouteIndicator}> (Đề xuất)</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Render Suggestions Overlay outside ScrollView, positioned absolutely */}
      {activeInput === "start" &&
        suggestions.length > 0 &&
        startInputLayout &&
        panelLayout && (
          <ScrollView
            style={[
              styles.suggestionListAbsoluteOverlay,
              {
                top:
                  startInputLayout.y -
                  panelLayout.y +
                  startInputLayout.height +
                  2,
                left: startInputLayout.x - panelLayout.x,
                width: startInputLayout.width,
              },
            ]}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`s_start_overlay_${item.coords[0]}_${item.coords[1]}_${index}`}
                onPress={() => selectSuggestion(item)}
                style={styles.suggestionItem}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

      {activeInput === "end" &&
        suggestions.length > 0 &&
        endInputLayout &&
        panelLayout && (
          <ScrollView
            style={[
              styles.suggestionListAbsoluteOverlay,
              {
                top:
                  endInputLayout.y - panelLayout.y + endInputLayout.height + 2,
                left: endInputLayout.x - panelLayout.x,
                width: endInputLayout.width,
              },
            ]}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`s_end_overlay_${item.coords[0]}_${item.coords[1]}_${index}`}
                onPress={() => selectSuggestion(item)}
                style={styles.suggestionItem}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

      {/* Expand/Collapse Handle at the bottom of the panel */}
      <TouchableOpacity
        style={styles.collapseHandle}
        onPress={togglePanelExpanded}
      >
        {/* <Text style={styles.collapseHandleText}>
          {isPanelExpanded ? "▲" : "▼"}
        </Text> */}
        <Ionicons
          name={isPanelExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#1976d2"
        />
      </TouchableOpacity>

      {/* Route Details Modal */}
      <RouteDetailsModal
        isVisible={isRouteDetailsModalVisible}
        onClose={closeRouteDetailsModal}
        route={selectedRouteDetails}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 4,
    position: "absolute", // Position it absolutely within its parent
    top: 0, // Stick to the top edge
    left: 0, // Span from the left edge
    right: 0, // Span to the right edge
    zIndex: 1000, // Ensure it's above other map elements if used with a map
    marginHorizontal: 10, // Add some horizontal margin for better appearance
    marginTop: 40, // Add some top margin to avoid status bar overlap
    maxHeight: "90%", // Default max height when expanded
    overflow: "hidden", // Crucial for smooth collapse/expand animations
  },
  containerCollapsed: {
    maxHeight: "5%",
    maxWidth: "20%", // Adjusted max height for a more compact look
  },
  scrollContent: {
    paddingBottom: 5,
  },
  inputContainer: {
    marginBottom: 5,
  },
  inputGroup: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    fontSize: 14,
    color: "#333",
  },
  suggestionListAbsoluteOverlay: {
    position: "absolute",
    backgroundColor: "#fff",
    maxHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 2000,
    paddingVertical: 5,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  suggestionText: {
    fontSize: 13,
    color: "#333",
  },
  modeAndCriteriaContainer: {
    flexDirection: "column",
    marginBottom: 10,
    // Keep this low so suggestions overlay it
  },
  modeScroll: {
    flexDirection: "row",
    marginBottom: 5,
    paddingVertical: 5,
    backgroundColor: "#e3f2fd", // Changed to light blue
    borderRadius: 10,
  },
  modeScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modeButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 3,
  },
  modeButtonSelected: {
    backgroundColor: "#1976d2", // Blue
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontSize: 11,
    color: "#1976d2", // Blue text
    fontWeight: "500",
  },
  modeTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  criteriaScroll: {
    flexDirection: "row",
    paddingVertical: 5,
    backgroundColor: "#e3f2fd", // Changed to light blue
    borderRadius: 10,
  },
  criteriaScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  criteriaButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 3,
  },
  criteriaButtonSelected: {
    backgroundColor: "#1976d2", // Blue
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  criteriaText: {
    fontSize: 11,
    color: "#1976d2", // Blue text
    fontWeight: "500",
  },
  criteriaTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  findButton: {
    backgroundColor: "#1976d2", // Blue
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row", // For icon + text
    justifyContent: "center",
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 8,
  },
  findButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 6, // Space for icon
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 5,
    fontSize: 11,
  },
  suggestedRoutesContainer: {
    marginTop: 10,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    overflow: "hidden", // Keep overflow: hidden so route suggestions don't spill out
    maxHeight: 150,
  },
  suggestedRoutesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    color: "#333",
  },
  suggestedRoutesList: {
    maxHeight: 120,
  },
  suggestedRouteItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  suggestedRouteText: {
    fontSize: 13,
    color: "#555",
  },
  routeDetailHighlight: {
    fontWeight: "bold",
    color: "#007BFF",
  },
  mainRouteIndicator: {
    fontSize: 11,
    color: "#28a745",
    fontWeight: "bold",
    marginLeft: 5,
  },
  collapseHandle: {
    // Removed position: 'absolute', bottom, left, right
    height: 20, // Height of the handle
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    // borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    // marginTop: 5, // Added margin to separate from content above
  },
  collapseHandleText: {
    fontSize: 20,
    color: "#666",
    fontWeight: "bold",
  },
});

export default RouteFindingPanel;
