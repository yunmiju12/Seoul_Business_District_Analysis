import { useEffect, useState } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";

type RiskRow = {
  district: string;
  closureRate: number;
  level: "위험" | "중간" | "안정";
};

type Props = {
  data: RiskRow[];
  selectedDistrict?: string | null;
  onDistrictClick?: (district: string) => void;
};

const getColor = (level: RiskRow["level"]) => {
  if (level === "위험") return "#f34f4f";
  if (level === "중간") return "#fcbc4d";
  return "#16a34a";
};

const getDistrictName = (feature: any): string => {
  return (
    feature?.properties?.name ??
    feature?.properties?.SIG_KOR_NM ??
    feature?.properties?.sggnm ??
    ""
  );
};

export default function SeoulMap({
  data,
  selectedDistrict,
  onDistrictClick,
}: Props) {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    fetch("/data/seoul.geojson")
      .then((res) => res.json())
      .then((json) => setGeoData(json));
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "500px",
        borderRadius: "20px",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={[37.5665, 126.978]}
        zoom={11}
        minZoom={10.8}
        maxZoom={10.8}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        attributionControl={false}
        style={{
          width: "100%",
          height: "100%",
          background: "#f8fafc",
        }}
      >
        {geoData && (
          <GeoJSON
            key={selectedDistrict ?? "none"}
            data={geoData}
            style={(feature) => {
              const districtName = getDistrictName(feature);
              const districtData = data.find(
                (row) => row.district === districtName,
              );
              const isSelected = selectedDistrict === districtName;

              return {
                fillColor: districtData
                  ? getColor(districtData.level)
                  : "#e5e7eb",
                weight: isSelected ? 3 : 1,
                color: isSelected ? "#111827" : "#ffffff",
                fillOpacity: districtData ? 0.85 : 0.45,
                cursor: "pointer",
              };
            }}
            onEachFeature={(feature, layer) => {
              const districtName = getDistrictName(feature);

              layer.bindTooltip(
                `
                <div class="map-tooltip">
                  <strong>${districtName}</strong>
                </div>
                `,
                {
                  permanent: true,
                  direction: "center",
                  className: "district-map-label",
                },
              );

              layer.on({
                click: () => {
                  if (!districtName) return;
                  onDistrictClick?.(districtName);
                },
              });
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
