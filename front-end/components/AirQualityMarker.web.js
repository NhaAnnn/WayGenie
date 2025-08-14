// AirQualityMarker.web.js
import React from "react";

const getAqiStatusAndColor = (aqi) => {
  if (typeof aqi !== "number" || isNaN(aqi)) {
    return { status: "unknown", color: "#c0c0c0", textColor: "#ffffff" };
  }
  if (aqi >= 300) {
    return { status: "hazardous", color: "#7e0023", textColor: "#ffffff" };
  } else if (aqi >= 200) {
    return { status: "very_unhealthy", color: "#8b008b", textColor: "#ffffff" };
  } else if (aqi >= 150) {
    return { status: "unhealthy", color: "#ff0000", textColor: "#ffffff" };
  } else if (aqi >= 100) {
    return {
      status: "unhealthy_sensitive",
      color: "#ff8c00",
      textColor: "#ffffff",
    };
  } else if (aqi > 50) {
    return { status: "moderate", color: "#ffff00", textColor: "#333333" };
  } else {
    return { status: "good", color: "#008000", textColor: "#ffffff" };
  }
};

// Hàm làm đậm màu hex
const darkenColor = (hex, percent) => {
  // Chuyển hex thành RGB
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  // Giảm giá trị RGB theo phần trăm
  r = Math.floor((r * (100 - percent)) / 100);
  g = Math.floor((g * (100 - percent)) / 100);
  b = Math.floor((b * (100 - percent)) / 100);

  // Chuyển lại thành hex
  r = r.toString(16).padStart(2, "0");
  g = g.toString(16).padStart(2, "0");
  b = b.toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
};

// Accept 'onClick' as a prop
const AirQualityMarker = ({ stationData, onClick }) => {
  // <--- ADD onClick PROP HERE
  const aqiValue =
    typeof stationData.aqi === "number" ? Math.round(stationData.aqi) : "N/A";
  const { color: markerColor, textColor } = getAqiStatusAndColor(aqiValue);

  // Tạo màu đậm hơn cho vòng tròn trung tâm
  const darkerColor = darkenColor(markerColor, 20); // Làm đậm hơn 20%

  return (
    <div
      style={{
        position: "relative",
        width: "100px",
        height: "100px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        cursor: "pointer", // Add cursor pointer to indicate it's clickable
      }}
      onClick={onClick} // <--- ATTACH THE onClick HANDLER HERE
      // Add accessibility attributes for better user experience
      role="button"
      aria-label={`AQI ${aqiValue} at ${
        stationData?.stationName || "Unknown Station"
      }`}
    >
      {/* Lớp màu mờ bên ngoài (giống khói tỏa) */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: `${markerColor}40`,
          transform: "scale(1.2)",
          border: "2px solid",
          borderColor: `${markerColor}30`,
          zIndex: 1,
        }}
      ></div>

      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          opacity: 0.8,
          zIndex: 2,
        }}
      ></div>

      <div
        style={{
          width: "40%",
          height: "40%",
          borderRadius: "50%",
          backgroundColor: darkerColor,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "2px solid white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          zIndex: 3,
          position: "relative",
        }}
      >
        <span
          style={{
            fontWeight: "bold",
            fontSize: "18px",
            color: textColor,
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
          {aqiValue}
        </span>
      </div>
    </div>
  );
};

export default AirQualityMarker;
