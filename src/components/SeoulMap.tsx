import { useEffect, useState } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";

type RiskRow = {
  district: string;
  closureRate: number;
  rent: number;
  level: "위험" | "중간" | "안정";
};

type Props = {
  data: RiskRow[];
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

export default function SeoulMap({ data }: Props) {
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
        height: "520px",
        borderRadius: "20px",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={[37.5665, 126.978]}
        zoom={11}
        minZoom={11}
        maxZoom={11}
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
            data={geoData}
            style={(feature) => {
              const districtName = getDistrictName(feature);

              const districtData = data.find(
                (row) => row.district === districtName,
              );

              return {
                fillColor: districtData
                  ? getColor(districtData.level)
                  : "#e5e7eb",
                weight: 1,
                color: "#ffffff",
                fillOpacity: 0.85,
              };
            }}
            onEachFeature={(feature, layer) => {
              const districtName = getDistrictName(feature);

              layer.bindTooltip(
                `
                <strong>${districtName}</strong>
                `,
                {
                  permanent: true,
                  direction: "center",
                  className: "district-map-label",
                },
              );
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
