const GH_API_KEY = "YOUR_GRAPH_HOPPER_API_KEY";
const ROUTE_URL = "https://graphhopper.com/api/1/route";

export async function getRoute(startCoords, endCoords, vehicle = "bike") {
  const body = {
    points: [
      [startCoords.lng, startCoords.lat],
      [endCoords.lng, endCoords.lat],
    ],
    vehicle,
    locale: "vi",
    points_encoded: false,
  };

  const res = await fetch(`${ROUTE_URL}?key=${GH_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.paths || data.paths.length === 0)
    throw new Error("Không tìm được tuyến đường");

  const coordinates = data.paths[0].points.coordinates.map(([lng, lat]) => [
    lat,
    lng,
  ]);
  return coordinates;
}
