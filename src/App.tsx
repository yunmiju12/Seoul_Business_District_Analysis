import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
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
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

import "./App.css";

type CsvRow = Record<string, string | number | null | undefined>;

type AgeKey = "age20" | "age30" | "age40" | "age50" | "age60";

type TrafficTopRow = {
  district: string;
  total: number;
  age20: number;
  age30: number;
  age40: number;
  age50: number;
};

type ClosureTopRow = {
  district: string;
  industry: string;
  year: number;
  closureRate: number;
};

type AgeSalesRow = {
  industry: string;
  age20: number;
  age30: number;
  age40: number;
  age50: number;
  age60: number;
  total: number;
};

type TimeIndustryRow = {
  time: string;
  카페: number;
  한식: number;
  치킨: number;
  술집: number;
};

type AgeTimeIndustryData = Record<AgeKey, TimeIndustryRow[]>;

type SurvivalYearRow = {
  industry: string;
  years: number;
};

type SurvivalRateRawRow = {
  industry: string;
  year: number;
  rate: number;
};

type ClosureRateChartRow = {
  year: number;
  [industry: string]: number;
};
type SurvivalRateChartRow = {
  year: number;
  [industry: string]: string | number;
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
  randomForest: number;
  catBoost: number;
  lightGBM: number;
};

type RiskMapRow = {
  district: string;
  closureRate: number;
  rent: number; // 평균 임대료
  level: "위험" | "중간" | "안정";
};

type DashboardData = {
  totalTrafficAll: number;
  trafficTop10: TrafficTopRow[];
  closureTop10: ClosureTopRow[];
  ageSales: AgeSalesRow[];
  ageTimeIndustryData: AgeTimeIndustryData;
  survivalYear: SurvivalYearRow[];
  survivalRateRaw: SurvivalRateRawRow[];
  survivalRateChart: SurvivalRateChartRow[];
  survivalIndustries: string[];
  closureRateChart: ClosureRateChartRow[];
  closureIndustries: string[];
  modelPerformance: ModelPerformanceRow[];
  predictionCompare: PredictionCompareRow[];
  riskMap: RiskMapRow[];
};


// const COLORS = [
//   "#f34f4f",
//   "#fcbc4d",
//   "#16a34a",
//   "#2777e6",
//   "#45c6e7",
//   "#9241dd",
//   "#484242",
// ];

const INDUSTRY_COLORS: Record<string, string> = {
  한식: "#f34f4f",
  양식: "#fcbc4d",
  일식: "#16a34a",
  중식: "#2777e6",
  "커피-음료": "#45c6e7",
  "패스트푸드점": "#9241dd",
  "치킨": "#9241dd",
  "분식": "#484242",
};

const AGE_KEYS: AgeKey[] = ["age20", "age30", "age40", "age50", "age60"];

const AGE_LABELS: Record<AgeKey, string> = {
  age20: "20대",
  age30: "30대",
  age40: "40대",
  age50: "50대",
  age60: "60대 이상",
};

const ageTimeIndustryData: AgeTimeIndustryData = {
  age20: [
    { time: "오전", 카페: 320, 한식: 160, 치킨: 60, 술집: 20 },
    { time: "점심", 카페: 240, 한식: 300, 치킨: 90, 술집: 40 },
    { time: "저녁", 카페: 180, 한식: 230, 치킨: 390, 술집: 360 },
    { time: "야간", 카페: 90, 한식: 80, 치킨: 240, 술집: 520 },
  ],
  age30: [
    { time: "오전", 카페: 260, 한식: 230, 치킨: 70, 술집: 20 },
    { time: "점심", 카페: 180, 한식: 480, 치킨: 120, 술집: 50 },
    { time: "저녁", 카페: 150, 한식: 340, 치킨: 430, 술집: 330 },
    { time: "야간", 카페: 60, 한식: 90, 치킨: 220, 술집: 360 },
  ],
  age40: [
    { time: "오전", 카페: 180, 한식: 300, 치킨: 50, 술집: 10 },
    { time: "점심", 카페: 130, 한식: 560, 치킨: 100, 술집: 30 },
    { time: "저녁", 카페: 100, 한식: 420, 치킨: 360, 술집: 220 },
    { time: "야간", 카페: 40, 한식: 100, 치킨: 160, 술집: 180 },
  ],
  age50: [
    { time: "오전", 카페: 120, 한식: 320, 치킨: 40, 술집: 5 },
    { time: "점심", 카페: 90, 한식: 520, 치킨: 80, 술집: 20 },
    { time: "저녁", 카페: 70, 한식: 460, 치킨: 250, 술집: 120 },
    { time: "야간", 카페: 20, 한식: 90, 치킨: 90, 술집: 70 },
  ],
  age60: [
    { time: "오전", 카페: 80, 한식: 260, 치킨: 20, 술집: 5 },
    { time: "점심", 카페: 60, 한식: 420, 치킨: 40, 술집: 10 },
    { time: "저녁", 카페: 40, 한식: 330, 치킨: 120, 술집: 40 },
    { time: "야간", 카페: 10, 한식: 50, 치킨: 30, 술집: 20 },
  ],
};


const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  const cleaned = String(value).replace(/,/g, "").replace(/%/g, "").trim();
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
};

// 숫자를 "만 명" 단위로 변환하는 함수
const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "0만 명";
  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만 명`;
};

const formatRate = (value: number): string => {
  if (!Number.isFinite(value)) return "0.00%";
  return `${value.toFixed(2)}%`;
};

const readCsv = async (fileName: string): Promise<CsvRow[]> => {
  const response = await fetch(`/data/${fileName}`);

  if (!response.ok) {
    throw new Error(
      `${fileName} 파일을 찾을 수 없습니다. public/data 폴더 안에 파일명이 정확히 있는지 확인하세요.`,
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

const groupSum = (
  rows: CsvRow[],
  keyName: string,
  valueName: string,
): { name: string; value: number }[] => {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    const key = String(row[keyName] ?? "기타");
    const value = toNumber(row[valueName]);
    map.set(key, (map.get(key) ?? 0) + value);
  });

  return Array.from(map, ([name, value]) => ({ name, value }));
};

// 폐업률 기준으로 위험도를 나누는 함수
// 11% 이상: 위험
// 9% 이상 ~ 11% 미만: 중간
// 9% 미만: 안정
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

const CustomTooltip = (props: unknown) => {
  const tooltip = props as {
    active?: boolean;
    label?: string | number;
    payload?: Array<{
      dataKey?: string | number;
      name?: string | number;
      value?: string | number;
      color?: string;
    }>;
  };

  if (!tooltip.active || !tooltip.payload || tooltip.payload.length === 0)
    return null;

  return (
    <div className="chart-tooltip">
      <strong>{tooltip.label}</strong>
      {tooltip.payload.map((item, index) => (
        <p
          key={`${String(item.dataKey ?? item.name)}-${index}`}
          style={{ color: item.color }}
        >
          {item.name}:{" "}
          {typeof item.value === "number"
            ? item.value.toLocaleString("ko-KR")
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

const getShortIndustryName = (name: string): string => {
  return name
    .replace("전문점", "")
    .replace("음식점", "")
    .replace("식당", "")
    .trim();
};

const normalizeIndustryName = (name: string): string => {
  return getShortIndustryName(name)
    .replace("_", "-")
    .trim();
};

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedTimeAge, setSelectedTimeAge] = useState<AgeKey>("age20");
  const [error, setError] = useState<string>("");
  
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [
          mlFinal,
          closureRate,
          ageSales,
          survivalYear,
          survivalRate,
          modelPerformance,
          predictionCompare,
          districtRent,
        ] = await Promise.all([
          readCsv("ml_final.csv"),
          readCsv("closure_rate.csv"),
          readCsv("age_sales.csv"),
          readCsv("survival_year.csv"),
          readCsv("survival_rate.csv"),
          readCsv("model_performance.csv"),
          readCsv("prediction_compare.csv"),
          readCsv("district_rent.csv"),
        ]);

        const totalTrafficAll = groupSum(
          mlFinal,
          "구명",
          "총_유동인구",
        ).reduce((sum, row) => sum + row.value, 0);

        const trafficTop10 = groupSum(mlFinal, "구명", "총_유동인구")
          .map((item) => {
            const districtRows = mlFinal.filter(
              (row) => String(row["구명"]) === item.name,
            );
        
            const age20 = districtRows.reduce(
              (sum, row) => sum + toNumber(row ["직장인구_20대"]),
              0,
            );
        
            const age30 = districtRows.reduce(
              (sum, row) => sum + toNumber(row ["직장인구_30대"]),
              0,
            );
        
            const age40 = districtRows.reduce(
              (sum, row) => sum + toNumber(row ["직장인구_40대"]),
              0,
            );
        
            const age50 = districtRows.reduce(
              (sum, row) => sum + toNumber(row ["직장인구_50대"]),
              0,
            );
        
            return {
              district: item.name,
              total: item.value,
        
              // 90만 미만은 0 처리
              age20: age20 >= 900000 ? age20 : 0,
              age30: age30 >= 900000 ? age30 : 0,
              age40: age40 >= 900000 ? age40 : 0,
              age50: age50 >= 900000 ? age50 : 0,
            };
          })
        
          // 모든 나이대가 0이면 제거
          .filter(
            (row) =>
              row.age20 > 0 ||
              row.age30 > 0 ||
              row.age40 > 0 ||
              row.age50 > 0
          )
        
          // 유동인구 높은 순
          .sort((a, b) => b.total - a.total);

        const closureMap = new Map<string, ClosureTopRow & { count: number }>();

        closureRate.forEach((row) => {
          const district = String(row["구명"] ?? "");
          const industry = String(row["업종"] ?? "");
          const year = toNumber(row["연도"]);
          const key = `${district}_${industry}`;
          const closureValue = toNumber(row["폐업률"]);
          const current = closureMap.get(key);

          if (current) {
            current.closureRate += closureValue;
            current.count += 1;
            current.year = Math.max(current.year, year);
          } else {
            closureMap.set(key, {
              district,
              industry,
              year,
              closureRate: closureValue,
              count: 1,
            });
          }
        });
 
        // 구업종별 평균 폐업률이 높은 TOP10 조합을 구한다.
        const closureTop10 = Array.from(closureMap.values())
          .map((row) => ({
            district: row.district,
            industry: row.industry,
            year: row.year,
            closureRate: row.count > 0 ? row.closureRate / row.count : 0,
          }))
          .sort((a, b) => b.closureRate - a.closureRate)
          .slice(0, 10);

        // 연령대별 시간대 업종 소비 패턴 그래프용 데이터
        const ageMap = new Map<string, AgeSalesRow>();

        ageSales.forEach((row) => {
          const industry = String(
            row["서비스_업종_코드_명"] ??
            row["업종"] ??
            row["업종명"] ??
            row["서비스업종"] ??
            "기타"
          );
        
          const current = ageMap.get(industry) ?? {
            industry,
            age20: 0,
            age30: 0,
            age40: 0,
            age50: 0,
            age60: 0,
            total: 0,
          };
        
          current.age20 += toNumber(row["매출_20대"] ?? row["연령대_20_매출_금액"]);
          current.age30 += toNumber(row["매출_30대"] ?? row["연령대_30_매출_금액"]);
          current.age40 += toNumber(row["매출_40대"] ?? row["연령대_40_매출_금액"]);
          current.age50 += toNumber(row["매출_50대"] ?? row["연령대_50_매출_금액"]);
          current.age60 += toNumber(row["매출_60대이상"] ?? row["연령대_60_이상_매출_금액"]);
        
          current.total =
            current.age20 +
            current.age30 +
            current.age40 +
            current.age50 +
            current.age60;
        
          ageMap.set(industry, current);
        });
        
        const ageSalesChart = Array.from(ageMap.values())
          .filter((row) => row.total > 0)
          .sort((a, b) => b.total - a.total);
        
        console.log("ageSalesChart:", ageSalesChart);
        
        // 연령대별 시간대 업종 소비 패턴 그래프용 데이터
        const survivalYearChart = survivalYear
          .map((row) => ({
            industry: String(row["업종"] ?? ""),
            years: toNumber(row["평균_생존_년수"]),
          }))
          .sort((a, b) => b.years - a.years);

        const survivalRateRaw = survivalRate
          .map((row) => ({
            industry: String(row["업종"] ?? ""),
            year: toNumber(row["연도"]),
            rate: toNumber(row["평균_생존율"]),
          }))
          .filter((row) => row.industry !== "" && row.year > 0)
          .sort((a, b) => a.year - b.year);

        const survivalIndustries = Array.from(
          new Set(survivalRateRaw.map((row) => row.industry)),
        );

        const survivalRateByYear = new Map<number, SurvivalRateChartRow>();

        survivalRateRaw.forEach((row) => {
          const current = survivalRateByYear.get(row.year) ?? {
            year: row.year,
          };
          current[row.industry] = row.rate;
          survivalRateByYear.set(row.year, current);
        });
          
        const survivalRateChart = Array.from(survivalRateByYear.values()).sort(
          (a, b) => a.year - b.year,
        );

        // 코로나 전후 폐업률 추이 그래프용 데이터
        // closure_rate.csv를 업종 + 연도 기준으로 평균 처리한다.
        const closureYearIndustryMap = new Map<
          string,
          { year: number; industry: string; total: number; count: number }
        >();

        closureRate.forEach((row) => {
          const year = toNumber(row["연도"]);
          const industry = String(row["업종"] ?? "");
          const rate = toNumber(row["폐업률"]);

          if (!industry || year <= 0) return;

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
            rate: row.count > 0 ? Number((row.total / row.count).toFixed(2)) : 0,
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

        const modelPerformanceChart = modelPerformance.map((row) => ({
          model: String(row["Model"] ?? ""),
          MAE: toNumber(row["MAE"]),
          RMSE: toNumber(row["RMSE"]),
          R2: Number(toNumber(row["R2"]).toFixed(3)),
        }));

        const predictionCompareChart = predictionCompare
          .slice(0, 20)
          .map((row) => ({
            name: String(row["지역업종"] ?? `${row["구명"]}_${row["업종"]}`),
            actual: toNumber(row["실제폐업률"]),
            randomForest: toNumber(row["RandomForest예측"]),
            catBoost: toNumber(row["CatBoost예측"]),
            lightGBM: toNumber(row["LightGBM예측"]),
          }));

        const districtClosureMap = new Map<
          string,
          {
            total: number;
            count: number;
            rentTotal: number;
            rentCount: number;
          }
        >();

        closureRate.forEach((row) => {
          const district = String(row["구명"] ?? "");
          if (!district) return;
        
          const current = districtClosureMap.get(district) ?? {
            total: 0,
            count: 0,
            rentTotal: 0,
            rentCount: 0,
          };
        
          // 폐업률 누적
          current.total += toNumber(row["폐업률"]);
          current.count += 1;
        
          // 임대료 데이터 찾기
          const rentRow = districtRent.find(
            (rent) => String(rent["구명"]) === district
          );
        
          // 임대료 컬럼 값
          const rent = toNumber(
            rentRow?.["평균임대료"] ??
            rentRow?.["평균_임대료"] ??
            rentRow?.["임대료"] ??
            rentRow?.["환산임대료"]
          );
        
          // 임대료 누적
          if (rent > 0) {
            current.rentTotal += rent;
            current.rentCount += 1;
          }
        
          districtClosureMap.set(district, current);
        });

        const riskMap = Array.from(districtClosureMap, ([district, value]) => {
          const closureRateAvg =
            value.count > 0 ? value.total / value.count : 0;
        
          const rentAvg =
            value.rentCount > 0 ? value.rentTotal / value.rentCount         : 0;
        
          return {
            district,
            closureRate: Number(closureRateAvg.toFixed(2)),
            rent: Math.round(rentAvg),
            level: getRiskLevel(closureRateAvg),
          };
        }).sort((a, b) => b.closureRate - a.closureRate);

        setData({
          totalTrafficAll,
          trafficTop10,
          closureTop10,
          ageSales: ageSalesChart,
          ageTimeIndustryData,
          survivalYear: survivalYearChart,
          survivalRateRaw,
          survivalRateChart,
          survivalIndustries,
          closureRateChart,
          closureIndustries,
          modelPerformance: modelPerformanceChart,
          predictionCompare: predictionCompareChart,
          riskMap,
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

  const kpi = useMemo(() => {
    if (!data) {
      return {
        totalTraffic: 0,
        averageClosure: 0,
        recommendedIndustryCount: 0,
        riskDistrictCount: 0,
      };
    }

    // TOP10 자치구 유동인구 총합 계산
    const totalTraffic = data.totalTrafficAll;
    
    // 서울 전체 자치구 폐업률 평균 계산
    const averageClosure =
      data.riskMap.reduce((sum, row) => sum + row.closureRate, 0) /
      Math.max(data.riskMap.length, 1);
      
    const recommendedIndustryCount = data.survivalYear.length;

    const riskDistrictCount = data.riskMap.filter(
      (row) => row.level === "위험",
    ).length;

    return {
      totalTraffic,
      averageClosure,
      recommendedIndustryCount,
      riskDistrictCount,
    };
  }, [data]);

  const agePieData = useMemo(() => {
  if (!data) return [];

  return data.ageSales
    .map((row) => ({
      name: getShortIndustryName(row.industry),
      value: Number(row[selectedTimeAge]),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
  }, [data, selectedTimeAge]);

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
          <h1>서울 외식업 상권분석 대시보드</h1>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="kpi-card">
          <span>총 유동인구</span>
          {/* 전체 주요 상권 유동인구 합계 */}
          <strong>{formatNumber(kpi.totalTraffic)}</strong>
        </article>
        <article className="kpi-card">
          <span>평균폐업률</span>
          {/* 서울 평균 폐업 위험도 */}
          <strong>{formatRate(kpi.averageClosure)}</strong>
        </article>
        <article className="kpi-card">
          <span>집계된 업종수</span>
          {/* 총 집계된 업종 개수 */}
          <strong>{kpi.recommendedIndustryCount}개</strong>
        </article>
        <article className="kpi-card">
          <span>자치구수</span>
          <strong>25개</strong>
        </article>
      </section>

      <section className="chart-grid one-col">
        <article className="chart-card wide-chart">
          <div className="chart-title">
            <h2>자치구별 직장인 유동인구 TOP10</h2>
            <p>자치구별 나이대 직장인 유동인구</p>
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
                width={60}
                tick={{ fontSize: 16 }}
                tickFormatter={(value) => `${Math.round(Number(value) / 10000)}만`}
              />
          
              <Tooltip content={<CustomTooltip />} />
          
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ paddingTop: "20px" }}
              />
          
              <Bar dataKey="age20" name="20대 직장인" fill="#3b82f6" />
              <Bar dataKey="age30" name="30대 직장인" fill="#f34f4f" />
              <Bar dataKey="age40" name="40대 직장인" fill="#16a34a" />
              <Bar dataKey="age50" name="50대 직장인" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <div className="chart-title">
            <h2>폐업률 TOP10</h2>
            <p>지역구업종 기준 평균폐업률</p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.closureTop10} 
              margin={{ top: 10, right: 20, left: 10}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="district"
                tick={{ fontSize: 14 }}
                tickMargin={12}
              />
              <YAxis
                domain={[0, 18]}
                ticks={[0, 5, 10, 15, 18]}
                width={70}
                tick={{ fontSize: 18 }}
                tickMargin={14}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={40} 
              wrapperStyle={{paddingTop: "20px"}}/>
              <Bar
                dataKey="closureRate"
                name="폐업률"
                fill="#f34f4f"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="chart-grid one-col">
        <article className="chart-card time-age-chart-card">
          <div className="chart-title with-control">
            <div className="timeAgeBox">
              <h2>연령별 시간대 업종소비</h2>
              <p>시간대별 업종 소비분석</p>
            </div>
      
            <select
              value={selectedTimeAge}
              onChange={(e) => setSelectedTimeAge(e.target.value as AgeKey)}
            >
              {AGE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {AGE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
      
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data.ageTimeIndustryData[selectedTimeAge]}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
      
              <XAxis dataKey="time" tick={{ fontSize: 18 }} tickMargin={16} />
      
              <YAxis tick={{ fontSize: 18 }} tickMargin={14} />
      
              <Tooltip content={<CustomTooltip />} />
      
              <Legend
                verticalAlign="bottom"
                height={30}
                wrapperStyle={{ paddingTop: "30px" }}
              />
      
              <Bar dataKey="카페" stackId="a" name="카페" fill="#45c6e7" />
              <Bar dataKey="한식" stackId="a" name="한식" fill="#f34f4f" />
              <Bar dataKey="치킨" stackId="a" name="치킨" fill="#9241dd" />
              <Bar dataKey="술집" stackId="a" name="술집" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="chart-grid two-col">
        <article className="chart-card time-age-chart-card">
          <div className="chart-title with-control">
            <div>
              <h2>연령대별 업종 소비 패턴</h2>
            </div>
            <select
              value={selectedTimeAge}
              onChange={(e) => setSelectedTimeAge(e.target.value as AgeKey)}
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
          
              <Tooltip formatter={(value) => formatNumber(Number          (value))} />
          
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
            <p>오래 유지되는 업종 파악</p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={data.survivalYear}
              layout="vertical"
              margin={{ top: 10, left: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                unit="년"
                tick={{ fontSize: 18 }}
                tickMargin={12}
              />
              <YAxis
                dataKey="industry"
                tickFormatter={(value) => getShortIndustryName(String(value))}
                type="category"
                width={70}
                tick={{ fontSize: 18 }}
                tickMargin={14}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={10} 
              wrapperStyle={{paddingTop: "10px"}}/>
              <Bar
                dataKey="years"
                name="평균 생존년수"
                fill="#16a34a"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="chart-grid one-col">
        <article className="chart-card">
          <div className="chart-title">
            <h2>코로나 전후 폐업률 변화</h2>
            <p>2019년 이후 업종별 평균 폐업률 추이</p>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={data.closureRateChart} 
             margin={{ top: 20, right: 10, left: 30, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year"
                type="number"
                domain={[2019, 2024]}
                ticks={[2019, 2020, 2021, 2022, 2023, 2024]}
                tick={{ fontSize: 18 }}
                tickMargin={12}
                label={{ value: "연도", position: "insideBottom", offset: -15 }}/>
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
                label={{ value: "코로나 초기", position: "insideTop",
                fill: "#dc2626" }}
              />
              <ReferenceArea
                x1={2020}
                x2={2021.5}
                fill="#ffcccc"
                fillOpacity={0.6}
                label={{ value: "코로나 기간", position: "insideTop",
                fill: "#dc2626" }}
              />
              {data.closureIndustries.map((industry) => {
                const industryName = normalizeIndustryName(industry);
              
                return (
                  <Line
                    key={industry}
                    type="monotone"
                    dataKey={industry}
                    name={industryName}
                    stroke={INDUSTRY_COLORS[industryName] ?? "#94a3b8"}
                    strokeWidth={2}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="chart-grid two-col">
        <article className="chart-card">
          <div className="chart-title">
            <h2>머신러닝 모델 성능 비교</h2>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.modelPerformance}
            margin={{ top: 40, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" tick={{ fontSize: 18 }} tickMargin={12} />
              <YAxis 
              domain={[0, 13]}
              ticks={[0, 1, 3, 5, 7, 9, 11, 13]}
              width={30} 
              tick={{ fontSize: 18 }} 
              tickMargin={14} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={40} 
              wrapperStyle={{paddingTop: "40px"}}/>
              <Bar
                dataKey="MAE"
                name="MAE"
                fill="#2777e6"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="RMSE"
                name="RMSE"
                fill="#fcbc4d"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="R2"
                name="R2"
                fill="#16a34a"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <div className="chart-title">
            <h2>실제 vs 예측 폐업률</h2>
            <p>상위 20개 샘플 기준 예측값 비교</p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.predictionCompare}
            margin={{ top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis
                domain={[-5, 75]}
                ticks={[-5, 0, 25, 50, 75]}
                tickFormatter={(value) => `${value}%`}
                width={60}
                tick={{ fontSize: 16 }}
                tickMargin={14}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={40} 
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "14px",
              }}/>
              <Line
                type="monotone"
                dataKey="actual"
                name="실제폐업률"
                stroke="#f21212"
                strokeWidth={3}
                dot={false}
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
                dataKey="randomForest"
                name="RandomForest예측"
                stroke="#1d6ddd"
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
            </LineChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="chart-card">
        <div className="chart-title">
          <h2>서울 자치구별 폐업 위험도 HeatMap</h2>
          <p>자치구별 평균 폐업률 기준</p>
          {/* 히트맵 색상 설명 */}
          <div className="heatmap-legend">
            <span>
              <em className="legend-box legend-danger"></em>
              빨강 = 위험
            </span>
            <span>
              <em className="legend-box legend-warning"></em>
              노랑 = 중간
            </span>
            <span>
              <em className="legend-box legend-safe"></em>
              초록 = 안정
            </span>
          </div>
        </div>

        <div className="risk-map-grid">
          {data.riskMap.map((row) => (
            <div
              key={row.district}
              className={`risk-cell ${getRiskClassName(row.level)}`}
            >
              {/* 앞면 */}
              <div className="risk-front">
                <strong>{row.district}</strong>
                <span>{formatRate(row.closureRate)}</span>
                <em>{row.level}</em>
              </div>
        
              {/* 호버했을 때 나오는 뒷면 */}
              <div className="risk-back">
                <strong>{row.district}</strong>
                <span>평균 폐업률: {formatRate(row.closureRate)}</span>
                <span>
                  평균 임대료:{" "}
                  {row.rent > 0
                    ? `${formatNumber(row.rent)}`
                    : "데이터 없음"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
