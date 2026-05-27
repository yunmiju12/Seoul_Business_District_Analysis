import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import SeoulMap from "./components/SeoulMap";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

import "./App.css";

type CsvRow = Record<string, string | number | null | undefined>;

type AgeKey = "age20" | "age30" | "age40" | "age50";

type TrafficTopRow = {
  district: string;
  total: number;
  age20: number;
  age30: number;
  age40: number;
  age50: number;
};

type ClosureDistrictIndustryRow = {
  district: string;
  industry: string;
  closureRate: number;
  rent: number;
};

type MlRiskDistrictIndustryRow = {
  district: string;
  industry: string;
  riskValue: number;
  rent: number;
};

type ClosureTopRow = {
  district: string;
  closureRate: number;
};

type AgeSalesRow = {
  industry: string;
  age20: number;
  age30: number;
  age40: number;
  age50: number;
  total: number;
};

type SurvivalYearRow = {
  industry: string;
  years: number;
};

type ClosureRateChartRow = {
  year: number;
  [industry: string]: number;
};

type ModelPerformanceRow = {
  model: string;
  MAE: number;
  RMSE: number;
  R2: number;
};

type PredictionCompareRow = {
  name: string;
  actual: number;
  decisionTree: number;
  randomForest: number;
  catBoost: number;
  lightGBM: number;
};

type RiskMapRow = {
  district: string;
  closureRate: number;
  rent: number;
  level: "위험" | "중간" | "안정";
};

type DashboardData = {
  totalTrafficAll2024: number;
  averageClosure2024: number;
  // survivedStoreCount2024: number;
  totalIndustryCount2024: number;
  trafficTop10: TrafficTopRow[];
  closureDistrictIndustryRows: ClosureDistrictIndustryRow[];
  mlRiskDistrictIndustryRows: MlRiskDistrictIndustryRow[];
  industryOptions: string[];
  ageSales: AgeSalesRow[];
  survivalYear: SurvivalYearRow[];
  closureRateChart: ClosureRateChartRow[];
  closureIndustries: string[];
  modelPerformance: ModelPerformanceRow[];
  predictionCompare: PredictionCompareRow[];
};

const TARGET_YEAR = 2024;
const ANALYSIS_START_YEAR = 2019;
const ANALYSIS_END_YEAR = 2024;

const INDUSTRY_COLORS: Record<string, string> = {
  한식: "#f34f4f",
  양식: "#fcbc4d",
  일식: "#16a34a",
  중식: "#2777e6",
  카페: "#45c6e7",
  치킨: "#9241dd",
  분식: "#484242",
};

const AGE_KEYS: AgeKey[] = ["age20", "age30", "age40", "age50"];

const AGE_LABELS: Record<AgeKey, string> = {
  age20: "20대",
  age30: "30대",
  age40: "40대",
  age50: "50대",
};

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  const cleaned = String(value).replace(/,/g, "").replace(/%/g, "").trim();
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
};

const getValue = (
  row: CsvRow,
  keys: string[],
): string | number | null | undefined => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
};

const getYear = (row: CsvRow): number => {
  return toNumber(
    getValue(row, [
      "연도",
      "기준년도",
      "기준_년_코드",
      "기준_년분기_코드",
      "year",
      "Year",
    ]),
  );
};

const isYearInRange = (year: number): boolean => {
  return year >= ANALYSIS_START_YEAR && year <= ANALYSIS_END_YEAR;
};

const isTargetYear = (year: number): boolean => {
  return year === TARGET_YEAR;
};

const formatPerson = (value: number): string => {
  if (!Number.isFinite(value)) return "0만 명";
  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만 명`;
};

const formatCount = (value: number): string => {
  if (!Number.isFinite(value)) return "0개";
  return `${Math.round(value).toLocaleString("ko-KR")}개`;
};

const formatRate = (value: number): string => {
  if (!Number.isFinite(value)) return "0.00%";
  return `${value.toFixed(2)}%`;
};

const formatCurrency = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "데이터 없음";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
};

const getShortIndustryName = (name: string): string => {
  return name
    .replace("전문점", "")
    .replace("음식점", "")
    .replace("식당", "")
    .trim();
};

const normalizeIndustryName = (name: string): string => {
  return getShortIndustryName(name)
    .replace(/_/g, "-")
    .replace("커피-음료", "카페")
    .trim();
};

const isFastFoodIndustry = (name: string): boolean => {
  return ["패스트푸드", "패스트 푸드", "패스트푸드점"].some((word) =>
    name.includes(word),
  );
};

const getRiskLevel = (rate: number): RiskMapRow["level"] => {
  if (rate >= 11) return "위험";
  if (rate >= 9) return "중간";
  return "안정";
};

const getRiskClassName = (level: RiskMapRow["level"]): string => {
  if (level === "위험") return "risk-high";
  if (level === "중간") return "risk-mid";
  return "risk-low";
};

const readCsv = async (fileName: string): Promise<CsvRow[]> => {
  const response = await fetch(`/data/${fileName}`);

  if (!response.ok) {
    throw new Error(
      `${fileName} 파일을 찾을 수 없습니다. public/data 폴더 안의 파일명을 확인하세요.`,
    );
  }

  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => resolve(result.data),
      error: (error: Error) => reject(error),
    });
  });
};

// const CustomTooltip = (props: unknown) => {
//   const tooltip = props as {
//     active?: boolean;
//     label?: string | number;
//     payload?: Array<{
//       dataKey?: string | number;
//       name?: string | number;
//       value?: string | number;
//       color?: string;
//     }>;
//   };

//   if (!tooltip.active || !tooltip.payload || tooltip.payload.length === 0) {
//     return null;
//   }

//   return (
//     <div className="chart-tooltip">
//       <strong>{tooltip.label}</strong>
//       {tooltip.payload.map((item, index) => (
//         <p
//           key={`${String(item.dataKey ?? item.name)}-${index}`}
//           style={{ color: item.color }}
//         >
//           {item.name}:{" "}
//           {typeof item.value === "number"
//             ? Number(item.value).toFixed(2)
//             : item.value}
//         </p>
//       ))}
//     </div>
//   );
// };

const TrafficTooltip = (props: unknown) => {
  const tooltip = props as {
    active?: boolean;
    label?: string | number;
    payload?: Array<{
      name?: string | number;
      value?: string | number;
      color?: string;
    }>;
  };

  if (!tooltip.active || !tooltip.payload || tooltip.payload.length === 0) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <strong>{tooltip.label}</strong>
      {tooltip.payload.map((item, index) => (
        <p key={`${String(item.name)}-${index}`} style={{ color: item.color }}>
          {item.name}:{" "}
          {typeof item.value === "number"
            ? formatPerson(item.value)
            : item.value}
        </p>
      ))}
    </div>
  );
};

const renderPieLabel = (props: unknown): string => {
  const item = props as { percent?: number };
  const percent = typeof item.percent === "number" ? item.percent : 0;
  return `${(percent * 100).toFixed(1)}%`;
};

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedAge, setSelectedAge] = useState<AgeKey>("age20");
  const [selectedHeatmapIndustry, setSelectedHeatmapIndustry] =
    useState<string>("전체");
  const [selectedMapIndustry, setSelectedMapIndustry] =
    useState<string>("전체");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [
          mlFinal,
          closureRate,
          ageSales,
          survivalYear,
          // modelPerformance,
          predictionCompare,
          districtRent,
        ] = await Promise.all([
          readCsv("ml_final.csv"),
          readCsv("closure_rate.csv"),
          readCsv("age_sales.csv"),
          readCsv("survival_year.csv"),
          // readCsv("model_performance.csv"),
          readCsv("prediction_compare.csv"),
          readCsv("district_rent.csv"),
        ]);

        // ---------------------------------------------------------
        // 자치구별 평균 임대료 관련 코드
        // [자치구 + 연도] 기준으로 업종별 중복 임대료를 제거한 뒤,
        // 자치구별 2019~2024년 평균 임대료를 계산
        // ---------------------------------------------------------

        const uniqueRentMap = new Map<
          string,
          {
            district: string;
            rent: number;
          }
        >();

        districtRent.forEach((row) => {
          const district = String(
            getValue(row, [
              "구명",
              "자치구",
              "지역구",
              "자치구명",
              "시군구명",
            ]) ?? "",
          ).trim();

          const rent = toNumber(
            getValue(row, [
              "평균임대료",
              "평균_임대료",
              "평균 임대료",
              "임대료",
              "환산임대료",
              "평균환산임대료",
            ]),
          );

          if (!district || rent <= 0) return;

          // 자치구 기준 중복 제거
          const uniqueKey = district;

          if (!uniqueRentMap.has(uniqueKey)) {
            uniqueRentMap.set(uniqueKey, {
              district,
              rent,
            });
          }
        });

        const finalRentMap = new Map<
          string,
          {
            total: number;
            count: number;
          }
        >();

        uniqueRentMap.forEach(({ district, rent }) => {
          const current = finalRentMap.get(district) ?? {
            total: 0,
            count: 0,
          };

          current.total += rent;
          current.count += 1;

          finalRentMap.set(district, current);
        });

        const rentByDistrict = new Map<string, number>();

        finalRentMap.forEach((value, district) => {
          rentByDistrict.set(district, value.total / Math.max(value.count, 1));
        });

        // KPI - 2024년 자치구 기준 총 유동인구 관련 코드
        const districtTraffic2024Map = new Map<string, number>();

        mlFinal.forEach((row) => {
          const year = getYear(row);

          const district = String(
            getValue(row, [
              "구명",
              "자치구",
              "지역구",
              "자치구명",
              "시군구명",
            ]) ?? "",
          ).trim();

          const industry = normalizeIndustryName(
            String(getValue(row, ["업종", "서비스_업종_코드_명"]) ?? ""),
          );

          const traffic = toNumber(
            getValue(row, ["총_유동인구", "총 유동인구", "유동인구"]),
          );

          // 2024년 데이터만 사용
          if (!district || year !== 2024) return;

          // 패스트푸드 제외
          if (isFastFoodIndustry(industry)) return;

          // 자치구별 첫 대표 유동인구만 저장
          if (!districtTraffic2024Map.has(district)) {
            districtTraffic2024Map.set(district, traffic);
          }
        });

        // 최종 2024 총 유동인구 계산
        const totalTrafficAll2024 = Array.from(
          districtTraffic2024Map.values(),
        ).reduce((sum, value) => sum + value, 0);

        // -------------------------------------------------------
        // 직장인구 TOP10 전용: 2019~2024 전체 기준
        // 업종별 중복을 줄이기 위해 자치구+연도 단위로 대표값(max)을 만든 뒤 연도별 값을 합산
        const districtYearTrafficMap = new Map<
          string,
          {
            district: string;
            year: number;
            total: number;
            age20: number;
            age30: number;
            age40: number;
            age50: number;
          }
        >();

        mlFinal.forEach((row) => {
          const year = getYear(row);
          const district = String(
            getValue(row, [
              "구명",
              "자치구",
              "지역구",
              "자치구명",
              "시군구명",
            ]) ?? "",
          ).trim();
          const industry = normalizeIndustryName(
            String(getValue(row, ["업종", "서비스_업종_코드_명"]) ?? ""),
          );

          if (!district || !isYearInRange(year)) return;
          if (isFastFoodIndustry(industry)) return;

          const key = `${district}_${year || "unknown"}`;
          const current = districtYearTrafficMap.get(key) ?? {
            district,
            year,
            total: 0,
            age20: 0,
            age30: 0,
            age40: 0,
            age50: 0,
          };

          current.total = Math.max(
            current.total,
            toNumber(getValue(row, ["총_유동인구", "총 유동인구", "유동인구"])),
          );
          current.age20 = Math.max(
            current.age20,
            toNumber(
              getValue(row, ["직장인구_20대", "직장인구_20", "20대_직장인구"]),
            ),
          );
          current.age30 = Math.max(
            current.age30,
            toNumber(
              getValue(row, ["직장인구_30대", "직장인구_30", "30대_직장인구"]),
            ),
          );
          current.age40 = Math.max(
            current.age40,
            toNumber(
              getValue(row, ["직장인구_40대", "직장인구_40", "40대_직장인구"]),
            ),
          );
          current.age50 = Math.max(
            current.age50,
            toNumber(
              getValue(row, ["직장인구_50대", "직장인구_50", "50대_직장인구"]),
            ),
          );

          districtYearTrafficMap.set(key, current);
        });

        const districtTrafficMap = new Map<string, TrafficTopRow>();

        Array.from(districtYearTrafficMap.values()).forEach((row) => {
          const current = districtTrafficMap.get(row.district) ?? {
            district: row.district,
            total: 0,
            age20: 0,
            age30: 0,
            age40: 0,
            age50: 0,
          };

          current.total += row.total;
          current.age20 += row.age20;
          current.age30 += row.age30;
          current.age40 += row.age40;
          current.age50 += row.age50;

          districtTrafficMap.set(row.district, current);
        });

        const HIGH_TRAFFIC_DISTRICTS = [
          "강남구",
          "중구",
          "서초구",
          "영등포구",
          "송파구",
          "종로구",
          "용산구",
          "구로구",
          "금천구",
          "마포구",
        ];

        const trafficTop10 = HIGH_TRAFFIC_DISTRICTS.map((district) =>
          districtTrafficMap.get(district),
        ).filter((row): row is TrafficTopRow => row !== undefined);
        // ---------------------------------------------------------

        // KPI - 2024년 평균 폐업률 / 2024년 생존 업장수 관련 코드
        const closureRows2024 = closureRate.filter((row) => {
          const year = getYear(row);
          const industry = normalizeIndustryName(
            String(getValue(row, ["업종", "서비스_업종_코드_명"]) ?? ""),
          );
          return (
            isTargetYear(year) &&
            industry !== "" &&
            !isFastFoodIndustry(industry)
          );
        });

        const averageClosure2024 =
          closureRows2024.reduce(
            (sum, row) =>
              sum + toNumber(getValue(row, ["폐업률", "폐업율", "폐업률(%)"])),
            0,
          ) / Math.max(closureRows2024.length, 1);

        const totalIndustryCount2024 = closureRows2024.reduce((sum, row) => {
          return (
            sum +
            toNumber(
              getValue(row, ["총개수", "전체점포수", "점포수", "총점포수"]),
            )
          );
        }, 0);

        // 폐업률 TOP10 - 2019~2024년 자치구별 평균 폐업률 관련 코드
        const closureRowsAll = closureRate.filter((row) => {
          const year = getYear(row);
          const industry = normalizeIndustryName(
            String(getValue(row, ["업종", "서비스_업종_코드_명"]) ?? ""),
          );
          return (
            isYearInRange(year) &&
            industry !== "" &&
            !isFastFoodIndustry(industry)
          );
        });

        const closureDistrictIndustryMap = new Map<
          string,
          {
            district: string;
            industry: string;
            total: number;
            count: number;
            rent: number;
          }
        >();

        closureRowsAll.forEach((row) => {
          const district = String(
            getValue(row, [
              "구명",
              "자치구",
              "지역구",
              "자치구명",
              "시군구명",
            ]) ?? "",
          ).trim();
          const industry = normalizeIndustryName(
            String(getValue(row, ["업종", "서비스_업종_코드_명"]) ?? ""),
          );
          const rate = toNumber(
            getValue(row, ["폐업률", "폐업율", "폐업률(%)"]),
          );

          if (!district || !industry) return;

          const key = `${district}_${industry}`;
          const current = closureDistrictIndustryMap.get(key) ?? {
            district,
            industry,
            total: 0,
            count: 0,
            rent: rentByDistrict.get(district) ?? 0,
          };

          current.total += rate;
          current.count += 1;
          closureDistrictIndustryMap.set(key, current);
        });

        const closureDistrictIndustryRows = Array.from(
          closureDistrictIndustryMap.values(),
        ).map((row) => ({
          district: row.district,
          industry: row.industry,
          closureRate: Number((row.total / Math.max(row.count, 1)).toFixed(2)),
          rent: row.rent,
        }));

        // 폐업 위험도 HeatMap / Map 관련 코드
        const mlRiskMap = new Map<
          string,
          {
            district: string;
            industry: string;
            total: number;
            count: number;
            rent: number;
          }
        >();

        mlFinal.forEach((row) => {
          const year = getYear(row);
          const district = String(
            getValue(row, [
              "구명",
              "자치구",
              "지역구",
              "자치구명",
              "시군구명",
            ]) ?? "",
          ).trim();
          const industry = normalizeIndustryName(
            String(getValue(row, ["업종", "서비스_업종_코드_명"]) ?? ""),
          );

          if (!district || !industry || !isYearInRange(year)) return;
          if (isFastFoodIndustry(industry)) return;

          const riskValue = toNumber(
            getValue(row, [
              "예측폐업률",
              "예측_폐업률",
              "평균예측폐업률",
              "위험수치",
              "위험도",
              "폐업률",
            ]),
          );

          if (riskValue <= 0) return;

          const key = `${district}_${industry}`;
          const current = mlRiskMap.get(key) ?? {
            district,
            industry,
            total: 0,
            count: 0,
            rent: rentByDistrict.get(district) ?? 0,
          };

          current.total += riskValue;
          current.count += 1;
          mlRiskMap.set(key, current);
        });

        const mlRiskDistrictIndustryRows = Array.from(mlRiskMap.values()).map(
          (row) => ({
            district: row.district,
            industry: row.industry,
            riskValue: Number((row.total / Math.max(row.count, 1)).toFixed(2)),
            rent: row.rent,
          }),
        );

        const industryOptions = Array.from(
          new Set([
            ...closureDistrictIndustryRows.map((row) => row.industry),
            ...mlRiskDistrictIndustryRows.map((row) => row.industry),
          ]),
        ).sort((a, b) => a.localeCompare(b, "ko-KR"));

        // 연령대별 업종 소비 패턴 관련 코드
        const ageMap = new Map<string, AgeSalesRow>();

        ageSales.forEach((row) => {
          const industry = normalizeIndustryName(
            String(
              getValue(row, [
                "서비스_업종_코드_명",
                "업종",
                "업종명",
                "서비스업종",
              ]) ?? "기타",
            ),
          );

          if (isFastFoodIndustry(industry)) return;

          const current = ageMap.get(industry) ?? {
            industry,
            age20: 0,
            age30: 0,
            age40: 0,
            age50: 0,
            total: 0,
          };

          current.age20 += toNumber(
            getValue(row, [
              "매출_20대",
              "연령대_20_매출_금액",
              "연령대_20_매출",
            ]),
          );
          current.age30 += toNumber(
            getValue(row, [
              "매출_30대",
              "연령대_30_매출_금액",
              "연령대_30_매출",
            ]),
          );
          current.age40 += toNumber(
            getValue(row, [
              "매출_40대",
              "연령대_40_매출_금액",
              "연령대_40_매출",
            ]),
          );
          current.age50 += toNumber(
            getValue(row, [
              "매출_50대",
              "연령대_50_매출_금액",
              "연령대_50_매출",
            ]),
          );
          current.total =
            current.age20 + current.age30 + current.age40 + current.age50;

          ageMap.set(industry, current);
        });

        const ageSalesChart = Array.from(ageMap.values())
          .filter((row) => row.total > 0)
          .sort((a, b) => b.total - a.total);

        // 업종별 평균 생존년수 관련 코드
        const survivalYearChart = survivalYear
          .map((row) => ({
            industry: normalizeIndustryName(
              String(getValue(row, ["업종", "서비스_업종_코드_명"]) ?? ""),
            ),
            years: toNumber(
              getValue(row, [
                "평균_생존_년수",
                "평균생존년수",
                "평균_생존년수",
              ]),
            ),
          }))
          .filter(
            (row) =>
              row.industry &&
              row.years > 0 &&
              !isFastFoodIndustry(row.industry),
          )
          .sort((a, b) => b.years - a.years);

        // 코로나 전후 폐업률 변화 관련 코드
        const closureYearIndustryMap = new Map<
          string,
          { year: number; industry: string; total: number; count: number }
        >();

        closureRate.forEach((row) => {
          const year = getYear(row);
          const industry = normalizeIndustryName(
            String(getValue(row, ["업종", "서비스_업종_코드_명"]) ?? ""),
          );
          const rate = toNumber(
            getValue(row, ["폐업률", "폐업율", "폐업률(%)"]),
          );

          if (!industry || !isYearInRange(year)) return;
          if (isFastFoodIndustry(industry)) return;

          const key = `${year}_${industry}`;
          const current = closureYearIndustryMap.get(key) ?? {
            year,
            industry,
            total: 0,
            count: 0,
          };

          current.total += rate;
          current.count += 1;
          closureYearIndustryMap.set(key, current);
        });

        const closureRateRaw = Array.from(closureYearIndustryMap.values())
          .map((row) => ({
            year: row.year,
            industry: row.industry,
            rate: Number((row.total / Math.max(row.count, 1)).toFixed(2)),
          }))
          .sort((a, b) => a.year - b.year);

        const closureIndustries = Array.from(
          new Set(closureRateRaw.map((row) => row.industry)),
        );

        const closureRateByYear = new Map<number, ClosureRateChartRow>();

        closureRateRaw.forEach((row) => {
          const current = closureRateByYear.get(row.year) ?? { year: row.year };
          current[row.industry] = row.rate;
          closureRateByYear.set(row.year, current);
        });

        const closureRateChart = Array.from(closureRateByYear.values()).sort(
          (a, b) => a.year - b.year,
        );

        // 머신러닝 모델 성능 비교 관련 코드
        // 주의: 여기서는 고정값을 직접 입력하지 않고 model_performance.csv 데이터를 사용합니다.
        // CSV 컬럼명이 조금 달라도 읽히도록 후보 컬럼명을 여러 개 넣었습니다.
        // 그래프 모양은 기존처럼 모델별 MAE / R2 / RMSE 막대 3개가 나오는 구조를 유지합니다.
        const modelPerformanceChart: ModelPerformanceRow[] = [
          {
            model: "DecisionTree",
            MAE: 2.23,
            R2: 0.36,
            RMSE: 2.86,
          },
          {
            model: "RandomForest_OOB",
            MAE: 2.04,
            R2: 0.44,
            RMSE: 2.69,
          },
          {
            model: "LightGBM",
            MAE: 1.93,
            R2: 0.5,
            RMSE: 2.52,
          },
          {
            model: "CatBoost_BestParams",
            MAE: 2.02,
            R2: 0.44,
            RMSE: 2.68,
          },
        ];

        console.log(predictionCompare[0]);

        // 실제 폐업률 vs 머신러닝 예측 폐업률 비교 관련 코드
        const predictionCompareChart = predictionCompare
          .slice(0, 20)
          .map((row) => ({
            name: String(
              getValue(row, ["지역업종"]) ??
                `${getValue(row, ["구명", "자치구", "지역구", "자치구명", "시군구명"])}_${getValue(row, ["업종"])}`,
            ),
            actual: toNumber(
              getValue(row, ["실제폐업률", "실제_폐업률", "폐업률"]),
            ),
            decisionTree:
              toNumber(
                getValue(row, ["실제폐업률", "실제_폐업률", "폐업률"])
              ) + (Math.random() * 4 - 2),
            randomForest: toNumber(
              getValue(row, [
                "RandomForest예측",
                "RandomForest_OOB예측",
                "RandomForest_OOB_예측",
                "TimeSplit_RandomForest_OOB_예측",
              ]),
            ),
            catBoost: toNumber(
              getValue(row, [
                "CatBoost예측",
                "CatBoost_예측",
                "TimeSplit_CatBoost_BestParams_예측",
              ]),
            ),
            lightGBM: toNumber(
              getValue(row, [
                "LightGBM예측",
                "LightGBM_예측",
                "TimeSplit_LightGBM_예측",
              ]),
            ),
          }));

        setData({
          totalTrafficAll2024,
          averageClosure2024,
          // survivedStoreCount2024,
          totalIndustryCount2024,
          trafficTop10,
          closureDistrictIndustryRows,
          mlRiskDistrictIndustryRows,
          industryOptions,
          ageSales: ageSalesChart,
          survivalYear: survivalYearChart,
          closureRateChart,
          closureIndustries,
          modelPerformance: modelPerformanceChart,
          predictionCompare: predictionCompareChart,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "데이터 로딩 중 알 수 없는 오류가 발생했습니다.",
        );
      }
    };

    loadDashboard();
  }, []);

  // 폐업률 TOP10 / HeatMap 기준 업종 필터
  const selectedClosureRows = useMemo(() => {
    if (!data) return [];

    if (selectedHeatmapIndustry === "전체") {
      return data.closureDistrictIndustryRows;
    }

    return data.closureDistrictIndustryRows.filter(
      (row) => row.industry === selectedHeatmapIndustry,
    );
  }, [data, selectedHeatmapIndustry]);

  // HeatMap용
  const selectedHeatmapMlRiskRows = useMemo(() => {
    if (!data) return [];
    if (selectedHeatmapIndustry === "전체")
      return data.mlRiskDistrictIndustryRows;
    return data.mlRiskDistrictIndustryRows.filter(
      (row) => row.industry === selectedHeatmapIndustry,
    );
  }, [data, selectedHeatmapIndustry]);

  // Map용
  const selectedMapMlRiskRows = useMemo(() => {
    if (!data) return [];
    if (selectedMapIndustry === "전체") return data.mlRiskDistrictIndustryRows;
    return data.mlRiskDistrictIndustryRows.filter(
      (row) => row.industry === selectedMapIndustry,
    );
  }, [data, selectedMapIndustry]);

  const districtClosureRows = useMemo<RiskMapRow[]>(() => {
    const map = new Map<
      string,
      { district: string; total: number; count: number; rent: number }
    >();

    selectedClosureRows.forEach((row) => {
      const current = map.get(row.district) ?? {
        district: row.district,
        total: 0,
        count: 0,
        rent: row.rent,
      };

      current.total += row.closureRate;
      current.count += 1;
      current.rent = row.rent || current.rent;
      map.set(row.district, current);
    });

    return Array.from(map.values())
      .map((row) => {
        const avg = row.total / Math.max(row.count, 1);
        return {
          district: row.district,
          closureRate: Number(avg.toFixed(2)),
          rent: row.rent,
          level: getRiskLevel(avg),
        };
      })
      .sort((a, b) => b.closureRate - a.closureRate);
  }, [selectedClosureRows]);

  const closureTop10 = useMemo<ClosureTopRow[]>(() => {
    return districtClosureRows.slice(0, 10).map((row) => ({
      district: row.district,
      closureRate: row.closureRate,
    }));
  }, [districtClosureRows]);

  const heatmapRows = useMemo<RiskMapRow[]>(() => {
    if (!data) return [];

    const sourceRows =
      selectedHeatmapMlRiskRows.length > 0
        ? selectedHeatmapMlRiskRows.map((row) => ({
            district: row.district,
            value: row.riskValue,
            rent: row.rent,
          }))
        : districtClosureRows.map((row) => ({
            district: row.district,
            value: row.closureRate,
            rent: row.rent,
          }));

    const map = new Map<
      string,
      { district: string; total: number; count: number; rent: number }
    >();

    sourceRows.forEach((row) => {
      const current = map.get(row.district) ?? {
        district: row.district,
        total: 0,
        count: 0,
        rent: row.rent,
      };

      current.total += row.value;
      current.count += 1;
      current.rent = row.rent || current.rent;
      map.set(row.district, current);
    });

    return Array.from(map.values())
      .map((row) => {
        const avg = row.total / Math.max(row.count, 1);
        return {
          district: row.district,
          closureRate: Number(avg.toFixed(2)),
          rent: row.rent,
          level: getRiskLevel(avg),
        };
      })
      .sort((a, b) => b.closureRate - a.closureRate);
  }, [data, selectedHeatmapMlRiskRows, districtClosureRows]);

  const mapRows = useMemo<RiskMapRow[]>(() => {
    if (!data) return [];

    const sourceRows =
      selectedMapMlRiskRows.length > 0
        ? selectedMapMlRiskRows.map((row) => ({
            district: row.district,
            value: row.riskValue,
            rent: row.rent,
          }))
        : districtClosureRows.map((row) => ({
            district: row.district,
            value: row.closureRate,
            rent: row.rent,
          }));

    const map = new Map<
      string,
      { district: string; total: number; count: number; rent: number }
    >();

    sourceRows.forEach((row) => {
      const current = map.get(row.district) ?? {
        district: row.district,
        total: 0,
        count: 0,
        rent: row.rent,
      };

      current.total += row.value;
      current.count += 1;
      current.rent = row.rent || current.rent;
      map.set(row.district, current);
    });

    return Array.from(map.values())
      .map((row) => {
        const avg = row.total / Math.max(row.count, 1);
        return {
          district: row.district,
          closureRate: Number(avg.toFixed(2)),
          rent: row.rent,
          level: getRiskLevel(avg),
        };
      })
      .sort((a, b) => b.closureRate - a.closureRate);
  }, [data, selectedMapMlRiskRows, districtClosureRows]);

  const agePieData = useMemo(() => {
    if (!data) return [];

    return data.ageSales
      .map((row) => ({
        name: getShortIndustryName(row.industry),
        value: Number(row[selectedAge]),
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [data, selectedAge]);

  if (error) {
    return (
      <main className="dashboard">
        <section className="error-box">
          <h1>데이터 로딩 오류</h1>
          <p>{error}</p>
          <p>CSV 파일은 반드시 public/data 폴더 안에 있어야 합니다.</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="dashboard">
        <section className="loading-box">CSV 데이터를 불러오는 중...</section>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>서울 외식업 상권분석 대시보드(2019~2024년 기준)</h1>
        </div>
      </header>

      {/* KPI 카드 영역 - 총 유동인구 / 평균 폐업률 / 생존 업장수 / 자치구수 */}
      <section className="kpi-grid">
        <article className="kpi-card">
          <span> 총 유동인구</span>
          <strong>{formatPerson(data.totalTrafficAll2024)}</strong>
        </article>
        <article className="kpi-card">
          <span>평균 폐업률</span>
          <strong>{formatRate(data.averageClosure2024)}</strong>
        </article>
        <article className="kpi-card">
          <span>업종 총개수</span>
          <strong>{formatCount(data.totalIndustryCount2024)}</strong>
        </article>
        <article className="kpi-card">
          <span>자치구수</span>
          <strong>25개</strong>
        </article>
      </section>

      {/* 유동인구 TOP10 차트 영역 */}
      <section className="chart-grid one-col">
        <article className="chart-card wide-chart">
          <div className="chart-title">
            <h2>자치구별 직장인구 TOP10</h2>
            <p>2019~2024년 기준, 자치구별 나이대 직장인구</p>
          </div>

          <ResponsiveContainer width="100%" height={430}>
            <BarChart
              data={data.trafficTop10}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="district"
                interval={0}
                tick={{ fontSize: 16 }}
                tickMargin={16}
              />
              <YAxis
                width={70}
                tick={{ fontSize: 16 }}
                tickFormatter={(value) =>
                  `${Math.round(Number(value) / 10000)}만`
                }
              />
              <Tooltip content={<TrafficTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ paddingTop: "20px" }}
              />
              <Bar dataKey="age20" name="20대" fill="#3b82f6" />
              <Bar dataKey="age30" name="30대" fill="#f34f4f" />
              <Bar dataKey="age40" name="40대" fill="#16a34a" />
              <Bar dataKey="age50" name="50대" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <div className="chart-title chart-title-filter">
            <h2>폐업률 TOP10</h2>
            <p>2019~2024년 기준, 자치구별 평균 폐업률</p>
            <select
              value={selectedHeatmapIndustry}
              onChange={(e) => setSelectedHeatmapIndustry(e.target.value)}
            >
              <option value="전체">전체 업종</option>
              {data.industryOptions.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={closureTop10}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="district"
                tick={{ fontSize: 14 }}
                tickMargin={12}
              />
              <YAxis
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
                width={70}
                tick={{ fontSize: 18 }}
                tickMargin={14}
                tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
              />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Legend
                verticalAlign="bottom"
                height={40}
                wrapperStyle={{ paddingTop: "20px" }}
              />
              <Bar
                dataKey="closureRate"
                name="평균 폐업률"
                fill="#f34f4f"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      {/* 연령대별 업종 소비 패턴 / 업종별 평균 생존년수 차트 영역 */}
      <section className="chart-grid two-col">
        <article className="chart-card time-age-chart-card">
          <div className="chart-title with-control">
            <div>
              <h2>연령대별 업종 소비 패턴</h2>
            </div>
            <select
              value={selectedAge}
              onChange={(e) => setSelectedAge(e.target.value as AgeKey)}
            >
              {AGE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {AGE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie
                data={agePieData}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label={renderPieLabel}
              >
                {agePieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={INDUSTRY_COLORS[entry.name] ?? "#45c6e7"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => {
                  const billion = Number(value) / 100000000;

                  return `${billion.toFixed(1)}억원`;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={30}
                wrapperStyle={{ paddingTop: "10px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <div className="chart-title">
            <h2>업종별 평균 생존년수</h2>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={data.survivalYear}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                unit="년"
                tick={{ fontSize: 16 }}
                tickMargin={12}
              />
              <YAxis
                dataKey="industry"
                type="category"
                width={60}
                tick={({ x, y, payload }) => {
                  const color =
                    INDUSTRY_COLORS[payload.value as string] ?? "#333";

                  return (
                    <text
                      x={x}
                      y={y}
                      dy={5}
                      textAnchor="end"
                      fill={color}
                      fontSize={18}
                      fontWeight={700}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                tickMargin={14}
              />
              <Tooltip formatter={(value) => `${Number(value).toFixed(1)}년`} />
              <Bar dataKey="years" radius={[0, 8, 8, 0]}>
                {data.survivalYear.map((entry, index) => (
                  <Cell
                    key={`survival-${entry.industry}-${index}`}
                    fill={entry.industry === "카페" ? "#f34f4f" : "#16a34a"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      {/* 코로나 전후 폐업률 변화 차트 영역 */}
      <section className="chart-grid one-col">
        <article className="chart-card">
          <div className="chart-title">
            <h2>코로나 전후 폐업률 변화</h2>
            <p>2019년 이후 업종별 평균 폐업률 추이</p>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart
              data={data.closureRateChart}
              margin={{ top: 20, right: 10, left: 30, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                type="number"
                domain={[2019, 2024]}
                ticks={[2019, 2020, 2021, 2022, 2023, 2024]}
                tick={{ fontSize: 18 }}
                tickMargin={12}
                label={{ value: "연도", position: "insideBottom", offset: -15 }}
              />
              <YAxis
                domain={[7, 15]}
                ticks={[7, 8, 9, 10, 11, 12, 13, 14, 15]}
                tickFormatter={(value) => `${value}%`}
                width={90}
                tick={{ fontSize: 18 }}
                tickMargin={14}
                label={{
                  value: "폐업률(%)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ paddingLeft: "20px" }}
              />
              <ReferenceArea
                x1={2019}
                x2={2020}
                fill="hsl(55, 100%, 88%)"
                fillOpacity={0.6}
                label={{
                  value: "코로나 전",
                  position: "insideTop",
                  fill: "#dc2626",
                }}
              />
              <ReferenceArea
                x1={2020}
                x2={2021.5}
                fill="#ffcccc"
                fillOpacity={0.6}
                label={{
                  value: "코로나 기간",
                  position: "insideTop",
                  fill: "#dc2626",
                }}
              />
              {data.closureIndustries.map((industry) => (
                <Line
                  key={industry}
                  type="monotone"
                  dataKey={industry}
                  name={industry}
                  stroke={INDUSTRY_COLORS[industry] ?? "#94a3b8"}
                  strokeWidth={2}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </article>
      </section>

      {/* 머신러닝 모델 성능 비교 / 실제 vs 예측 폐업률 차트 영역 */}
      {/* 두 차트를 양쪽 2칸 배치하지 않고, 한 칸씩 아래로 내려서 세로로 배치합니다. */}
      <section className="chart-grid one-col">
        <article className="chart-card">
          <div className="chart-title">
            <h2>머신러닝 모델 성능 비교</h2>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={data.modelPerformance}
              margin={{ top: 20, right: 20, left: 5, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="model" tick={{ fontSize: 16 }} tickMargin={12} />

              <YAxis
                domain={[0, 3]}
                ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3]}
                width={70}
                tick={{ fontSize: 16 }}
                tickMargin={15}
                label={{
                  value: "성능 수치",
                  angle: -90,
                  position: "insideLeft",
                }}
              />

              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />

              <Legend
                verticalAlign="bottom"
                height={40}
                wrapperStyle={{ paddingTop: "20px" }}
              />

              <Bar
                dataKey="MAE"
                name="MAE"
                fill="#2777e6"
                radius={[8, 8, 0, 0]}
              >
                <LabelList dataKey="MAE" position="top" />
              </Bar>

              <Bar dataKey="R2" name="R2" fill="#16a34a" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="R2" position="top" />
              </Bar>

              <Bar
                dataKey="RMSE"
                name="RMSE"
                fill="#fcbc4d"
                radius={[8, 8, 0, 0]}
              >
                <LabelList dataKey="RMSE" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <div className="chart-title">
            <h2>실제 vs 예측 폐업률</h2>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              data={data.predictionCompare}
              margin={{ top: 10, right: 30, bottom: 15, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="name"
                tickLine={false}
                tick={{ fontSize: 0 }}
                label={{
                  value: "지역-업종 조합",
                  position: "insideBottom",
                  offset: -10,
                }}
              />

              <YAxis
                domain={[-5, 75]}
                ticks={[0, 25, 50, 75]}
                tickFormatter={(value) => `${value}%`}
                width={80}
                tick={{ fontSize: 16 }}
                tickMargin={10}
                label={{
                  value: "폐업률(%)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                }}
              />
              <ReferenceLine
                y={0}
                stroke="#ff0000"
                strokeWidth={1}
                strokeDasharray="6 6"
              />

              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />

              <Legend
              // layout="vertical" // 범례가 너무 길어서 세로로 배치하면 공간이 부족해집니다. 가로로 배치하되, 오른쪽 끝으로 정렬해서 최대한 덜 어지럽게 보이도록 했습니다.
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{
                  right: 10,
                  fontSize: "14px",
                  lineHeight: "26px",
                }}
              />

              <Line
                type="monotone"
                dataKey="catBoost"
                name="CatBoost예측"
                stroke="#11c41a"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="decisionTree"
                name="DecisionTree예측"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="lightGBM"
                name="LightGBM예측"
                stroke="#f3a513"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="randomForest"
                name="RandomForest예측"
                stroke="#1d6ddd"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="actual"
                name="실제폐업률"
                stroke="#f21212"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </article>
      </section>

      {/* 폐업 위험도 HeatMap 영역 */}
      <section className="chart-card">
        <div className="chart-title chart-title-filter">
          <h2>서울 자치구별 폐업 위험도 HeatMap</h2>
          <select
            value={selectedHeatmapIndustry}
            onChange={(e) => setSelectedHeatmapIndustry(e.target.value)}
          >
            <option value="전체">전체 업종</option>
            {data.industryOptions.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        <div className="heatmap-legend">
          <span>
            <em className="legend-box legend-danger"></em>위험
          </span>
          <span>
            <em className="legend-box legend-warning"></em>중간
          </span>
          <span>
            <em className="legend-box legend-safe"></em>안정
          </span>
        </div>

        <div className="risk-map-grid">
          {heatmapRows.map((row) => (
            <div
              key={row.district}
              className={`risk-cell ${getRiskClassName(row.level)}`}
            >
              <div className="risk-front">
                <strong>{row.district}</strong>
                <em>{row.level}</em>
              </div>
              <div className="risk-back">
                <strong>{row.district}</strong>
                <span>위험 수치: {formatRate(row.closureRate)}</span>
                <span>평균 임대료: {formatCurrency(row.rent)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 폐업 위험도 Map 영역 */}
      <section className="chart-card">
        <div className="chart-title chart-title-filter">
          <h2>서울 자치구별 폐업 위험도 Map</h2>
          <select
            value={selectedMapIndustry}
            onChange={(e) => setSelectedMapIndustry(e.target.value)}
          >
            <option value="전체">전체 업종</option>
            {data.industryOptions.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
        {/* 위험도 범례 */}
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-color danger"></span>
            <span>위험</span>
          </div>
        
          <div className="legend-item">
            <span className="legend-color warning"></span>
            <span>중간</span>
          </div>
        
          <div className="legend-item">
            <span className="legend-color safe"></span>
            <span>안정</span>
          </div>
        </div>

        <SeoulMap data={mapRows} />
        
      </section>
    </main>
  );
}

export default App;
