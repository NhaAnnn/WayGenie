const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");
const proj4 = require("proj4");
const gdal = require("gdal-async");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "./secrets.env") });

// Cấu hình đường dẫn cơ sở cho dữ liệu
const BASE_DATA_PATH = "C:\\Users\\TRONG NHAN\\Downloads"; // Thay đổi nếu đường dẫn này khác

const NODE_FILE = path.join(BASE_DATA_PATH, "node.csv");
const LINK_FILE = path.join(BASE_DATA_PATH, "link.csv");
const SHAPEFILE_PATH = path.join(BASE_DATA_PATH, "map_HN_link1_link.shp");

const MONGO_URI = process.env.MONGODB_URI;

const NODES_COLLECTION = "NODES";
const LINKS_COLLECTION = "LINKS";

// ĐỊNH NGHĨA CỐ ĐỊNH HỆ QUY CHIẾU GỐC VÀ ĐÍCH
// Nguồn: ESRI:53004
const SOURCE_CRS_PROJ4_STRING =
  "+proj=merc +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +R=6371000 +units=m +no_defs";
// Đích: EPSG:4326 (WGS84)
const TARGET_CRS_PROJ4_STRING = "+proj=longlat +datum=WGS84 +no_defs";

// Định nghĩa cho proj4
proj4.defs("ESRI:53004", SOURCE_CRS_PROJ4_STRING);
proj4.defs("EPSG:4326", TARGET_CRS_PROJ4_STRING);

async function processData() {
  let client;
  let gdalSourceCRS = null;
  let gdalTargetCRS = null;
  let gdalCoordTransform = null;
  let dataset = null; // Biến để giữ dataset GDAL

  try {
    console.log("Bắt đầu xử lý dữ liệu...");

    if (!MONGO_URI) {
      throw new Error(
        "MONGO_URI không được định nghĩa. Vui lòng kiểm tra file .env hoặc biến môi trường."
      );
    }

    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log("Đã kết nối thành công tới MongoDB Atlas!");

    const db = client.db();
    const nodesCollection = db.collection(NODES_COLLECTION);
    const linksCollection = db.collection(LINKS_COLLECTION);

    await nodesCollection.deleteMany({});
    await linksCollection.deleteMany({});
    console.log("Đã xóa dữ liệu cũ trong MongoDB.");

    // KHỞI TẠO CÁC ĐỐI TƯỢNG CRS VÀ TRANSFORMER CỦA GDAL
    // Chúng ta sẽ buộc GDAL sử dụng ESRI:53004 làm CRS nguồn
    try {
      gdalSourceCRS = gdal.SpatialReference.fromProj4(SOURCE_CRS_PROJ4_STRING);
      gdalTargetCRS = gdal.SpatialReference.fromEPSG(4326); // Hoặc fromProj4(TARGET_CRS_PROJ4_STRING)
      gdalCoordTransform = new gdal.CoordinateTransformation(
        gdalSourceCRS,
        gdalTargetCRS
      );
      console.log(`Đã tạo chuyển đổi CRS GDAL từ ESRI:53004 sang EPSG:4326.`);
    } catch (e) {
      console.error(`Lỗi khi khởi tạo GDAL CRS/Transformer: ${e.message}`);
      console.error(`Không thể tiếp tục xử lý geometry cho links.`);
      gdalCoordTransform = null; // Đảm bảo nó là null nếu có lỗi
    }

    // --- 1. Đọc và xử lý file node.csv ---
    console.log(`Đọc file NODE từ: ${NODE_FILE}`);
    const nodes = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(NODE_FILE)
        .pipe(
          csv({
            separator: ",",
            skipLines: 1,
            headers: [
              "NODE:NO",
              "XCOORD",
              "YCOORD",
              "ZCOORD",
              "OSM_NODE_ID",
              "WKTLOC",
              "VOLPRT",
            ],
          })
        )
        .on("data", (row) => {
          if (
            row &&
            row["NODE:NO"] &&
            !isNaN(parseFloat(row.XCOORD)) &&
            !isNaN(parseFloat(row.YCOORD))
          ) {
            try {
              // Chuyển đổi tọa độ NODE TỪ ESRI:53004 SANG EPSG:4326
              const [longitude, latitude] = proj4("ESRI:53004", "EPSG:4326", [
                parseFloat(row.XCOORD),
                parseFloat(row.YCOORD),
              ]);
              nodes.push({
                node_id: parseInt(row["NODE:NO"]),
                location: {
                  type: "Point",
                  coordinates: [longitude, latitude],
                },
                osm_node_id: parseInt(row.OSM_NODE_ID) || null,
                volprt: parseFloat(row.VOLPRT) || 0,
              });
            } catch (e) {
              console.warn(
                `Lỗi chuyển đổi tọa độ NODE: ${row["NODE:NO"]}, X: ${row.XCOORD}, Y: ${row.YCOORD}. Bỏ qua.`,
                e.message
              );
            }
          }
        })
        .on("end", () => {
          console.log(`Đã đọc ${nodes.length} NODE.`);
          resolve();
        })
        .on("error", reject);
    });

    if (nodes.length > 0) {
      await nodesCollection.insertMany(nodes);
      await nodesCollection.createIndex({ location: "2dsphere" });
      console.log(`Đã chèn ${nodes.length} nodes vào MongoDB và tạo index.`);
    } else {
      console.log("Không có node nào để chèn vào MongoDB.");
    }

    // --- 2. Đọc và xử lý file link.csv ---
    console.log(`\nĐọc file LINK từ: ${LINK_FILE}`);
    const linksData = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(LINK_FILE)
        .pipe(
          csv({
            separator: ",",
            skipLines: 1,
            headers: [
              "LINK:NO",
              "FROMNODENO",
              "TONODENO",
              "NAME",
              "TSYSSET",
              "LENGTH",
              "NUMLANES",
              "CAPPRT",
              "V0PRT",
              "VOLVEHPRT",
              "VC",
              "VOLPCUPRT",
              "VOLVEH_TSYS",
              "VOLCAPRATIOPRT",
              "LENGTHDIR",
              "FROMNODEORIENTATION",
              "VCUR_PRTSYS_BIKE",
              "VCUR_PRTSYS_CAR",
              "VCUR_PRTSYS_CO",
              "VCUR_PRTSYS_HGV",
              "VCUR_PRTSYS_MC",
              "IMP_PRTSYS(BIKE,AH)",
              "IMP_PRTSYS(BIKE,AP)",
              "IMP_PRTSYS(CAR,AH)",
              "IMP_PRTSYS(CAR,AP)",
              "IMP_PRTSYS(CO,AH)",
              "IMP_PRTSYS(CO,AP)",
              "IMP_PRTSYS(HGV,AH)",
              "IMP_PRTSYS(HGV,AP)",
              "IMP_PRTSYS(MC,AH)",
              "IMP_PRTSYS(MC,AP)",
            ],
          })
        )
        .on("data", (row) => {
          if (row && row["LINK:NO"]) {
            const parsedLinkNo = parseInt(row["LINK:NO"]);
            if (isNaN(parsedLinkNo)) {
              console.warn(
                `CSV Parsing Warning: LINK:NO "${row["LINK:NO"]}" is not a valid number. Skipping row.`
              );
              return;
            }

            const parsedData = {
              linkNo: parsedLinkNo,
              FROMNODENO: parseInt(row.FROMNODENO) || 0,
              TONODENO: parseInt(row.TONODENO) || 0,
              NAME: row.NAME,
              TSYSSET: row.TSYSSET,
              LENGTH: parseFloat(String(row.LENGTH).replace("km", "")) || 0,
              NUMLANES: parseInt(row.NUMLANES) || 0,
              CAPPRT: parseFloat(row.CAPPRT) || 0,
              V0PRT: parseFloat(String(row.V0PRT).replace("km/h", "")) || 0,
              VOLVEHPRT: parseFloat(row["VOLVEHPRT"]) || 0,
              VC: parseFloat(row.VC) || 0,
              VOLPCUPRT: parseFloat(row["VOLPCUPRT"]) || 0,
              VOLVEH_TSYS: parseFloat(row["VOLVEH_TSYS"]) || 0,
              VOLCAPRATIOPRT: parseFloat(row["VOLCAPRATIOPRT"]) || 0,
              LENGTHDIR: row.LENGTHDIR,
              FROMNODEORIENTATION: row.FROMNODEORIENTATION,
              VCUR_PRTSYS_BIKE:
                parseFloat(String(row.VCUR_PRTSYS_BIKE).replace("km/h", "")) ||
                0,
              VCUR_PRTSYS_CAR:
                parseFloat(String(row.VCUR_PRTSYS_CAR).replace("km/h", "")) ||
                0,
              VCUR_PRTSYS_CO:
                parseFloat(String(row.VCUR_PRTSYS_CO).replace("km/h", "")) || 0,
              VCUR_PRTSYS_HGV:
                parseFloat(String(row.VCUR_PRTSYS_HGV).replace("km/h", "")) ||
                0,
              VCUR_PRTSYS_MC:
                parseFloat(String(row.VCUR_PRTSYS_MC).replace("km/h", "")) || 0,
              IMP_PRTSYS_BIKE_AH: parseFloat(row["IMP_PRTSYS(BIKE,AH)"]) || 0,
              IMP_PRTSYS_BIKE_AP: parseFloat(row["IMP_PRTSYS(BIKE,AP)"]) || 0,
              IMP_PRTSYS_CAR_AH: parseFloat(row["IMP_PRTSYS(CAR,AH)"]) || 0,
              IMP_PRTSYS_CAR_AP: parseFloat(row["IMP_PRTSYS(CAR,AP)"]) || 0,
              IMP_PRTSYS_CO_AH: parseFloat(row["IMP_PRTSYS(CO,AH)"]) || 0,
              IMP_PRTSYS_CO_AP: parseFloat(row["IMP_PRTSYS(CO,AP)"]) || 0,
              IMP_PRTSYS_HGV_AH: parseFloat(row["IMP_PRTSYS(HGV,AH)"]) || 0,
              IMP_PRTSYS_HGV_AP: parseFloat(row["IMP_PRTSYS(HGV,AP)"]) || 0,
              IMP_PRTSYS_MC_AH: parseFloat(row["IMP_PRTSYS(MC,AH)"]) || 0,
              IMP_PRTSYS_MC_AP: parseFloat(row["IMP_PRTSYS(MC,AP)"]) || 0,
              geometry: null,
            };
            linksData.push(parsedData);
          }
        })
        .on("end", () => {
          console.log(`Đã đọc ${linksData.length} LINK.`);
          resolve();
        })
        .on("error", reject);
    });

    const linksMap = new Map(linksData.map((link) => [link.linkNo, link]));

    console.log("\n--- Debugging linksMap keys ---");
    let mapDebugCount = 0;
    for (const [key, value] of linksMap.entries()) {
      console.log(
        `Map Key: ${key}, Type: ${typeof key}, Value LINK:NO: ${value.linkNo}`
      );
      mapDebugCount++;
      if (mapDebugCount >= 5) break;
    }
    console.log("-----------------------------\n");

    console.log(`\nĐọc và xử lý Geometry từ Shapefile: ${SHAPEFILE_PATH}`);
    let linksWithGeometry = 0;

    // XỬ LÝ SHAPEFILE (Bây giờ GDAL cũng sẽ sử dụng ESRI:53004 làm nguồn)
    if (gdalCoordTransform) {
      // Chỉ tiếp tục nếu transformer GDAL được khởi tạo thành công
      try {
        dataset = gdal.open(SHAPEFILE_PATH);
        console.log("Shapefile đã được mở thành công!");

        const layer = dataset.layers.get(0);
        console.log(`Tên lớp: ${layer.name}`);
        console.log(`Số lượng features: ${layer.features.count()}`);

        // Kiểm tra CRS tự động nhận diện của Shapefile (chỉ để thông báo)
        if (layer.srs) {
          console.log(
            `GDAL tự động nhận diện CRS của Shapefile là: ${layer.srs.toProj4()}`
          );
          console.log(`Lưu ý: Chúng ta đang buộc chuyển đổi từ ESRI:53004.`);
        } else {
          console.warn(
            `Không tìm thấy thông tin CRS trong Shapefile (.prj file có thể thiếu hoặc không hợp lệ).`
          );
          console.warn(
            `Lưu ý: Chúng ta vẫn đang buộc chuyển đổi từ ESRI:53004.`
          );
        }

        layer.features.forEach((feature, index) => {
          const rawLinkIdInShp = feature.fields.get("NO");
          const linkIdInShp = parseInt(rawLinkIdInShp);

          if (isNaN(linkIdInShp)) {
            console.warn(
              `Shapefile Parsing Warning: 'NO' field "${rawLinkIdInShp}" for feature ${index} is not a valid number after parseInt. Skipping feature.`
            );
            return;
          }

          const link = linksMap.get(linkIdInShp);
          let geometry = feature.getGeometry();

          if (index < 10 || linkIdInShp === 5348) {
            console.log(
              `\nProcessing Feature ${index} (SHP Link ID: ${linkIdInShp}, CSV Link Exists: ${!!link})`
            );
            if (geometry) {
              console.log(
                `   Initial Geometry type: ${
                  geometry.wkbType
                }, IsEmpty: ${geometry.isEmpty()}`
              );
              try {
                const geoJsonObj = geometry.toObject();
                console.log(
                  `   Initial GeoJSON Type: ${
                    geoJsonObj.type
                  }, First 5 coordinates: ${
                    geoJsonObj.coordinates
                      ? JSON.stringify(geoJsonObj.coordinates.slice(0, 5))
                      : "No coordinates array"
                  }`
                );
              } catch (e) {
                console.warn(
                  `   Error converting initial geometry to GeoJSON object: ${e.message}`
                );
              }
            } else {
              console.warn(
                `   Initial geometry is null/undefined for SHP Link ID: ${linkIdInShp}.`
              );
            }
          }

          if (link && geometry && !geometry.isEmpty()) {
            try {
              geometry.transform(gdalCoordTransform); // Sử dụng transformer đã tạo sẵn
              const geoJsonObj = geometry.toObject();

              if (geoJsonObj.type === "LineString" && geoJsonObj.coordinates) {
                const uniqueCoordinates = [];
                if (geoJsonObj.coordinates.length > 0) {
                  uniqueCoordinates.push(geoJsonObj.coordinates[0]);
                  for (let i = 1; i < geoJsonObj.coordinates.length; i++) {
                    const prevCoord = geoJsonObj.coordinates[i - 1];
                    const currCoord = geoJsonObj.coordinates[i];
                    if (
                      !(
                        prevCoord[0] === currCoord[0] &&
                        prevCoord[1] === currCoord[1]
                      )
                    ) {
                      uniqueCoordinates.push(currCoord);
                    }
                  }
                }

                if (uniqueCoordinates.length < 2) {
                  console.warn(
                    `Link ID ${linkIdInShp}: LineString chỉ có 1 đỉnh duy nhất sau khi lọc trùng lặp. Bỏ qua geometry này.`
                  );
                  link.geometry = null;
                } else {
                  link.geometry = {
                    type: geoJsonObj.type,
                    coordinates: uniqueCoordinates,
                  };
                  linksWithGeometry++;
                }
              } else if (
                geoJsonObj.type === "Point" ||
                geoJsonObj.type === "Polygon"
              ) {
                link.geometry = geoJsonObj;
                linksWithGeometry++;
              } else {
                console.warn(
                  `Link ID ${linkIdInShp}: Loại geometry không được hỗ trợ hoặc không có tọa độ: ${geoJsonObj.type}. Bỏ qua geometry.`
                );
                link.geometry = null;
              }

              if (index < 10 || linkIdInShp === 5348) {
                if (link.geometry) {
                  const transformedGeoJsonObj = link.geometry;
                  console.log(
                    `   Transformed GeoJSON Type: ${
                      transformedGeoJsonObj.type
                    }, First 5 coordinates (transformed): ${
                      transformedGeoJsonObj.coordinates
                        ? JSON.stringify(
                            transformedGeoJsonObj.coordinates.slice(0, 5)
                          )
                        : "No coordinates array"
                    }`
                  );
                } else {
                  console.log(
                    `   Transformed geometry for link ID ${linkIdInShp} set to null due to invalidity.`
                  );
                }
              }
            } catch (transformError) {
              console.error(
                `Lỗi chuyển đổi geometry cho link ID ${linkIdInShp}: ${transformError.message}. Bỏ qua geometry này.`
              );
              link.geometry = null;
            }
          } else {
            if (index < 10 || linkIdInShp === 5348) {
              console.warn(
                `Skipping link ID ${linkIdInShp}: No matching CSV link or geometry is missing/empty.`
              );
            }
          }
        });
      } catch (error) {
        console.error("Lỗi trong quá trình xử lý Shapefile:", error.message);
        console.warn(
          "Không thể tải hoặc xử lý Shapefile. Các links sẽ không có thông tin geometry."
        );
        gdalCoordTransform = null; // Đảm bảo gdalCoordTransform là null nếu có lỗi
      }
    } else {
      console.warn(
        "Không thể tạo GDAL CRS/Transformer. Bỏ qua xử lý geometry cho links."
      );
    }

    console.log(
      `Đã xử lý ${linksWithGeometry} link có geometry hợp lệ từ Shapefile.`
    );

    const linksToInsert = Array.from(linksMap.values()).filter(
      (link) => link.geometry !== null
    );

    console.log(
      `Số lượng links có geometry hợp lệ để chèn vào MongoDB: ${linksToInsert.length}`
    );

    if (linksToInsert.length > 0) {
      await linksCollection.insertMany(linksToInsert);
      await linksCollection.createIndex({ geometry: "2dsphere" });
      console.log(
        `Đã chèn ${linksToInsert.length} links vào MongoDB và tạo index.`
      );
    } else {
      console.log("Không có link nào có geometry hợp lệ để chèn vào MongoDB.");
    }
  } catch (error) {
    console.error("Lỗi trong quá trình xử lý dữ liệu chung:", error);
    if (error.message.includes("Cannot find module 'gdal-async'")) {
      console.error(
        "--> Lỗi: Thư viện 'gdal-async' chưa được cài đặt hoặc cài đặt không thành công."
      );
      console.error(
        "   Hãy đảm bảo bạn đã cài đặt các dependency của GDAL/OGR trên hệ thống và chạy 'npm install gdal-async' thành công."
      );
    }
    if (
      error.message.includes("No such file or directory") ||
      error.message.includes("ENOENT")
    ) {
      console.error(
        "--> Lỗi: Không tìm thấy file dữ liệu. Vui lòng kiểm tra lại đường dẫn trong các biến NODE_FILE, LINK_FILE, SHAPEFILE_PATH."
      );
    }
    if (error.name === "MongoNetworkError") {
      console.error(
        "--> Lỗi kết nối MongoDB: Kiểm tra kết nối mạng, cài đặt firewall, và đảm bảo MongoDB Atlas cho phép kết nối từ địa chỉ IP của bạn."
      );
    }
  } finally {
    if (client) {
      await client.close();
      console.log("Đã đóng kết nối MongoDB.");
    }
    if (dataset) {
      dataset.close(); // Đảm bảo dataset GDAL được đóng
      console.log("Đã đóng dataset GDAL.");
    }
  }
}

processData();
