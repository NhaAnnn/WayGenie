const GH_API_KEY = "YOUR_GRAPH_HOPPER_API_KEY"; // Thay bằng API key thật
const GEOCODE_URL = "https://graphhopper.com/api/1/geocode";

export async function geocodeAddress(address) {
  const res = await fetch(
    `${GEOCODE_URL}?q=${encodeURIComponent(address)}&key=${GH_API_KEY}&limit=1`
  );
  const data = await res.json();
  if (!data.hits || data.hits.length === 0)
    throw new Error("Không tìm thấy địa chỉ");
  return {
    lat: data.hits[0].point.lat,
    lng: data.hits[0].point.lng,
  };
}
