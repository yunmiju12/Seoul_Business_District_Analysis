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
  level: "위험" | "중간" | "안정";
};

type DashboardData = {
  trafficTop10: TrafficTopRow[];
  closureTop10: ClosureTopRow[];
  ageSales: AgeSalesRow[];
  ageTimeIndustryData: AgeTimeIndustryData;
  survivalYear: SurvivalYearRow[];
  survivalRateRaw: SurvivalRateRawRow[];
  survivalRateChart: SurvivalRateChartRow[];
  survivalIndustries: string[];
  modelPerformance: ModelPerformanceRow[];
  predictionCompare: PredictionCompareRow[];
  riskMap: RiskMapRow[];
};

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ff9100",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#111827",
];
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

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("ko-KR");
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

const getRiskLevel = (rate: number): RiskMapRow["level"] => {
  if (rate >= 12) return "위험";
  if (rate >= 8) return "중간";
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
  const item = props as { name?: string | number; percent?: number };
  const name = String(item.name ?? "");
  const percent = typeof item.percent === "number" ? item.percent : 0;

  return `${name} ${(percent * 100).toFixed(1)}%`;
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
        ] = await Promise.all([
          readCsv("ml_final.csv"),
          readCsv("closure_rate.csv"),
          readCsv("age_sales.csv"),
          readCsv("survival_year.csv"),
          readCsv("survival_rate.csv"),
          readCsv("model_performance.csv"),
          readCsv("prediction_compare.csv"),
        ]);

        const trafficTop10 = groupSum(mlFinal, "구명", "총_유동인구")
          .map((item) => {
            const districtRows = mlFinal.filter(
              (row) => String(row["구명"]) === item.name,
            );

            return {
              district: item.name,
              total: item.value,
              age20: districtRows.reduce(
                (sum, row) => sum + toNumber(row["유동인구_20대"]),
                0,
              ),
              age30: districtRows.reduce(
                (sum, row) => sum + toNumber(row["유동인구_30대"]),
                0,
              ),
              age40: districtRows.reduce(
                (sum, row) => sum + toNumber(row["유동인구_40대"]),
                0,
              ),
              age50: districtRows.reduce(
                (sum, row) => sum + toNumber(row["유동인구_50대"]),
                0,
              ),
            };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

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

        const closureTop10 = Array.from(closureMap.values())
          .map((row) => ({
            district: row.district,
            industry: row.industry,
            year: row.year,
            closureRate: row.count > 0 ? row.closureRate / row.count : 0,
          }))
          .sort((a, b) => b.closureRate - a.closureRate)
          .slice(0, 10);

        const ageMap = new Map<string, AgeSalesRow>();

        ageSales.forEach((row) => {
          const industry = String(row["서비스_업종_코드_명"] ?? "기타");
          const current = ageMap.get(industry) ?? {
            industry,
            age20: 0,
            age30: 0,
            age40: 0,
            age50: 0,
            age60: 0,
            total: 0,
          };

          current.age20 += toNumber(row["매출_20대"]);
          current.age30 += toNumber(row["매출_30대"]);
          current.age40 += toNumber(row["매출_40대"]);
          current.age50 += toNumber(row["매출_50대"]);
          current.age60 += toNumber(row["매출_60대이상"]);
          current.total =
            current.age20 +
            current.age30 +
            current.age40 +
            current.age50 +
            current.age60;

          ageMap.set(industry, current);
        });

        const ageSalesChart = Array.from(ageMap.values()).sort(
          (a, b) => b.total - a.total,
        );

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
          { total: number; count: number }
        >();

        closureRate.forEach((row) => {
          const district = String(row["구명"] ?? "");
          if (!district) return;

          const current = districtClosureMap.get(district) ?? {
            total: 0,
            count: 0,
          };
          current.total += toNumber(row["폐업률"]);
          current.count += 1;
          districtClosureMap.set(district, current);
        });

        const riskMap = Array.from(districtClosureMap, ([district, value]) => {
          const closureRateAvg =
            value.count > 0 ? value.total / value.count : 0;

          return {
            district,
            closureRate: Number(closureRateAvg.toFixed(2)),
            level: getRiskLevel(closureRateAvg),
          };
        }).sort((a, b) => b.closureRate - a.closureRate);

        setData({
          trafficTop10,
          closureTop10,
          ageSales: ageSalesChart,
          ageTimeIndustryData,
          survivalYear: survivalYearChart,
          survivalRateRaw,
          survivalRateChart,
          survivalIndustries,
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

    const totalTraffic = data.trafficTop10.reduce(
      (sum, row) => sum + row.total,
      0,
    );
    const averageClosure =
      data.riskMap.reduce((sum, row) => sum + row.closureRate, 0) /
      Math.max(data.riskMap.length, 1);
    const recommendedIndustryCount = data.survivalYear.filter(
      (row) => row.years >= 7,
    ).length;
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
        name: row.industry,
        value: row[selectedTimeAge],
      }))
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
          <span>TOP10 총 유동인구</span>
          {/* 전체 주요 상권 유동인구 합계 */}
          <strong>{formatNumber(kpi.totalTraffic)}</strong>
        </article>
        <article className="kpi-card">
          <span>평균 폐업률</span>
          {/* 서울 평균 폐업 위험도 */}
          <strong>{formatRate(kpi.averageClosure)}</strong>
        </article>
        <article className="kpi-card">
          <span>추천 가능 업종 수</span>
          {/* 생존율이 높은 안정적 업종 개수 */}
          <strong>{kpi.recommendedIndustryCount}개</strong>
        </article>
        <article className="kpi-card">
          <span>위험 지역 수</span>
          {/* 폐업 위험도가 높은 자치구 개수 */}
          <strong>{kpi.riskDistrictCount}개</strong>
        </article>
      </section>

      <section className="chart-grid two-col">
        <article className="chart-card">
          <div className="chart-title">
            <h2>자치구별 유동인구 TOP10</h2>
            <p>사람이 많이 모이는 지역 확인</p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={data.trafficTop10}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="district"
                tick={{ fontSize: 18 }}
                tickMargin={12}
              />
              <YAxis
                width={70}
                tick={{ fontSize: 18 }}
                tickMargin={12}
                tickFormatter={(value) =>
                  `${Math.round(Number(value) / 10000)}만`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
              verticalAlign="bottom" height={10}
              wrapperStyle={{paddingTop: "20px"}}
              />
              <Bar
                dataKey="total"
                name="총 유동인구"
                fill="#2563eb"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <div className="chart-title">
            <h2>폐업률 TOP10</h2>
            <p>구업종 기준 평균 폐업률</p>
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
                width={70}
                tick={{ fontSize: 18 }}
                tickMargin={14}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={30} 
              wrapperStyle={{paddingTop: "20px"}}/>
              <Bar
                dataKey="closureRate"
                name="폐업률"
                fill="#dc2626"
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
              <h2>연령별 시간대 업종 소비</h2>
              <p>선택한 연령대가 시간대별로 어떤 업종을 많이 소비하는지 분석</p>
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
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
      
              <XAxis dataKey="time" tick={{ fontSize: 18 }} tickMargin={12} />
      
              <YAxis tick={{ fontSize: 18 }} tickMargin={14} />
      
              <Tooltip content={<CustomTooltip />} />
      
              <Legend
                verticalAlign="bottom"
                height={40}
                wrapperStyle={{ paddingTop: "20px" }}
              />
      
              <Bar dataKey="카페" stackId="a" name="카페" fill="#3B82F6" />
              <Bar dataKey="한식" stackId="a" name="한식" fill="#34D399" />
              <Bar dataKey="치킨" stackId="a" name="치킨" fill="#FBBF24" />
              <Bar dataKey="술집" stackId="a" name="술집" fill="#A855F7" />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="chart-grid two-col">
        <article className="chart-card time-age-chart-card">
          <div className="chart-title with-control">
            <div>
              <h2>연령대별 업종 소비 패턴</h2>
              <p>선택한 연령대가 어떤 업종에 소비하는지 확인</p>
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
                {agePieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(Number(value))} />
              <Legend verticalAlign="bottom" height={30} 
              wrapperStyle={{paddingTop: "10px"}}/>
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
              margin={{ top: 10, left: 40 }}
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
            <h2>코로나 전후 생존율 변화</h2>
            <p>2019년 이후 업종별 평균 생존율 추이</p>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={data.survivalRateChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 18 }} tickMargin={12} />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                width={70}
                tick={{ fontSize: 18 }}
                tickMargin={14}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={10} 
              wrapperStyle={{paddingTop: "20px"}}/>
              {data.survivalIndustries.map((industry, index) => (
                <Line
                  key={industry}
                  type="monotone"
                  dataKey={industry}
                  name={industry}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="chart-grid two-col">
        <article className="chart-card">
          <div className="chart-title">
            <h2>머신러닝 모델 성능 비교</h2>
            <p>MAE/RMSE는 낮을수록 좋고, R2는 높을수록 좋음</p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.modelPerformance}
            margin={{ top: 10, right: 10, left: 10}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" tick={{ fontSize: 18 }} tickMargin={12} />
              <YAxis 
              width={50} 
              tick={{ fontSize: 18 }} 
              tickMargin={14} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={10} 
              wrapperStyle={{paddingTop: "30px"}}/>
              <Bar
                dataKey="MAE"
                name="MAE"
                fill="#2563eb"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="RMSE"
                name="RMSE"
                fill="#ff9100"
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
                tickFormatter={(value) => `${value}%`}
                width={60}
                tick={{ fontSize: 18 }}
                tickMargin={14}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={10} 
              wrapperStyle={{paddingTop: "30px"}}/>
              <Line
                type="monotone"
                dataKey="actual"
                name="실제폐업률"
                stroke="#111827"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="catBoost"
                name="CatBoost예측"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="randomForest"
                name="RandomForest예측"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lightGBM"
                name="LightGBM예측"
                stroke="#16a34a"
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
          <p>빨강= 위험, 주황= 중간, 파랑= 안정 / 자치구별 평균 폐업률 기준</p>
        </div>

        <div className="risk-map-grid">
          {data.riskMap.map((row) => (
            <div
              key={row.district}
              className={`risk-cell ${getRiskClassName(row.level)}`}
              title={`${row.district}: ${formatRate(row.closureRate)}`}
            >
              <strong>{row.district}</strong>
              <span>{formatRate(row.closureRate)}</span>
              <em>{row.level}</em>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
