import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiGitMerge,
  FiPieChart,
  FiTrendingUp,
} from "react-icons/fi";
const BACKEND = import.meta.env.BACKEND_URL;
type FinancialRecord = {
  quarter: string;
  metricName: string;
  value: string;
};

type Company = {
  id: number;
  symbol: string;
  name: string;
};

type CompanyDataset = {
  company: Company;
  quarters: string[];
  metrics: Map<string, Map<string, string>>;
};

type ComparisonCell = {
  company1: string;
  company2: string;
};

type ComparisonRow = {
  metricName: string;
  values: Record<string, ComparisonCell>;
};

type SummaryCard = {
  label: string;
  value: string;
  note: string;
};

type ComparisonResult = {
  company1: Company;
  company2: Company;
  dataset1: CompanyDataset;
  dataset2: CompanyDataset;
  quarters: string[];
  rows: ComparisonRow[];
  chartMetrics: string[];
  summaryCards: SummaryCard[];
};

const PREFERRED_CHART_METRICS = [
  "Revenue TTM",
  "Net Profit TTM",
  "EPS TTM",
  "ROE TTM",
  "ROA TTM",
  "PB Ratio",
  "PE Ratio",
  "Revenue Till Qtr",
  "Net Profit Till Qtr",
];

function parseNumericValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDisplayValue(value: string | undefined) {
  return value && value.trim() ? value : "-";
}

function buildDataset(
  company: Company,
  data: FinancialRecord[],
): CompanyDataset {
  const quarterSet = new Set<string>();
  const metrics = new Map<string, Map<string, string>>();

  data.forEach((item) => {
    quarterSet.add(item.quarter);

    if (!metrics.has(item.metricName)) {
      metrics.set(item.metricName, new Map<string, string>());
    }

    metrics.get(item.metricName)?.set(item.quarter, item.value);
  });

  return {
    company,
    quarters: Array.from(quarterSet).sort(),
    metrics,
  };
}

function quarterListsMatch(quarters1: string[], quarters2: string[]) {
  if (quarters1.length !== quarters2.length) {
    return false;
  }

  return quarters1.every((quarter, index) => quarter === quarters2[index]);
}

function createComparisonRows(
  dataset1: CompanyDataset,
  dataset2: CompanyDataset,
  quarters: string[],
): ComparisonRow[] {
  const metricNames = Array.from(
    new Set([...dataset1.metrics.keys(), ...dataset2.metrics.keys()]),
  ).sort((a, b) => a.localeCompare(b));

  return metricNames.map((metricName) => {
    const values: Record<string, ComparisonCell> = {};

    quarters.forEach((quarter) => {
      values[quarter] = {
        company1: dataset1.metrics.get(metricName)?.get(quarter) ?? "-",
        company2: dataset2.metrics.get(metricName)?.get(quarter) ?? "-",
      };
    });

    return { metricName, values };
  });
}

function getCommonChartMetrics(
  dataset1: CompanyDataset,
  dataset2: CompanyDataset,
  quarters: string[],
) {
  const metricNames = Array.from(
    new Set([...dataset1.metrics.keys(), ...dataset2.metrics.keys()]),
  );

  const chartableMetrics = metricNames.filter((metricName) =>
    quarters.every((quarter) => {
      const value1 = parseNumericValue(
        dataset1.metrics.get(metricName)?.get(quarter) ?? "",
      );
      const value2 = parseNumericValue(
        dataset2.metrics.get(metricName)?.get(quarter) ?? "",
      );

      return value1 !== null && value2 !== null;
    }),
  );

  const preferredMetrics = PREFERRED_CHART_METRICS.filter((metricName) =>
    chartableMetrics.includes(metricName),
  );

  return preferredMetrics.length > 0 ? preferredMetrics : chartableMetrics;
}

function buildSummaryCards(
  dataset1: CompanyDataset,
  dataset2: CompanyDataset,
  quarters: string[],
): SummaryCard[] {
  const latestQuarter = quarters[quarters.length - 1];

  const buildCard = (metricName: string, label: string) => {
    const value1 = dataset1.metrics.get(metricName)?.get(latestQuarter);
    const value2 = dataset2.metrics.get(metricName)?.get(latestQuarter);
    const num1 = parseNumericValue(value1 ?? "");
    const num2 = parseNumericValue(value2 ?? "");

    if (num1 === null || num2 === null) {
      return {
        label,
        value: "N/A",
        note: `No comparable ${label.toLowerCase()} value in ${latestQuarter}`,
      };
    }

    const diff = Math.abs(num1 - num2);
    const formatted = diff >= 100 ? diff.toFixed(1) : diff.toFixed(2);
    const leader =
      num1 >= num2 ? dataset1.company.symbol : dataset2.company.symbol;

    return {
      label,
      value: `${leader} ahead by ${formatted}`,
      note: `${label} in ${latestQuarter}: ${dataset1.company.symbol} = ${formatDisplayValue(value1)}, ${dataset2.company.symbol} = ${formatDisplayValue(value2)}`,
    };
  };

  return [
    buildCard("Revenue TTM", "Revenue"),
    buildCard("Net Profit TTM", "Net Profit"),
    buildCard("EPS TTM", "EPS"),
  ];
}

function ComparisonChart({
  quarters,
  dataset1,
  dataset2,
  metricName,
}: {
  quarters: string[];
  dataset1: CompanyDataset;
  dataset2: CompanyDataset;
  metricName: string;
}) {
  const width = 920;
  const height = 320;
  const padding = { top: 24, right: 24, bottom: 56, left: 56 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const series = [
    {
      name: dataset1.company.symbol,
      color: "#7ce7df",
      points: quarters.map((quarter) =>
        parseNumericValue(dataset1.metrics.get(metricName)?.get(quarter) ?? ""),
      ),
    },
    {
      name: dataset2.company.symbol,
      color: "#7ea8ff",
      points: quarters.map((quarter) =>
        parseNumericValue(dataset2.metrics.get(metricName)?.get(quarter) ?? ""),
      ),
    },
  ];

  const values = series.flatMap((entry) =>
    entry.points.filter((value): value is number => value !== null),
  );

  if (values.length === 0) {
    return (
      <div className="empty-state">
        No graph data available for this metric.
      </div>
    );
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const xStep = quarters.length > 1 ? plotWidth / (quarters.length - 1) : 0;

  const yForValue = (value: number) => {
    const normalized = (value - minValue) / valueRange;
    return padding.top + plotHeight - normalized * plotHeight;
  };

  const xForIndex = (index: number) => padding.left + xStep * index;

  const buildPoints = (points: Array<number | null>) =>
    points
      .map((value, index) => {
        if (value === null) {
          return null;
        }

        return `${xForIndex(index)},${yForValue(value)}`;
      })
      .filter(Boolean)
      .join(" ");

  return (
    <div className="comparison-chart-wrap">
      <svg
        className="comparison-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Comparison chart for ${metricName}`}
      >
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = minValue + (valueRange / 4) * tick;
          const y = yForValue(value);

          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="comparison-grid-line"
              />
              <text x={14} y={y + 4} className="comparison-axis-label">
                {value.toFixed(value >= 100 ? 0 : 2)}
              </text>
            </g>
          );
        })}

        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
          className="comparison-axis-line"
        />

        {series.map((entry) => (
          <g key={entry.name}>
            <polyline
              fill="none"
              stroke={entry.color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={buildPoints(entry.points)}
            />
            {entry.points.map((value, index) => {
              if (value === null) {
                return null;
              }

              const cx = xForIndex(index);
              const cy = yForValue(value);

              return (
                <circle
                  key={`${entry.name}-${index}`}
                  cx={cx}
                  cy={cy}
                  r="4.5"
                  fill={entry.color}
                />
              );
            })}
          </g>
        ))}

        {quarters.map((quarter, index) => (
          <text
            key={quarter}
            x={xForIndex(index)}
            y={height - 20}
            textAnchor="middle"
            className="comparison-quarter-label"
          >
            {quarter}
          </text>
        ))}
      </svg>

      <div className="comparison-chart-legend">
        {series.map((entry) => (
          <span key={entry.name} className="comparison-legend-item">
            <span
              className="comparison-legend-swatch"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Comparison() {
  const { scrip } = useParams<{ scrip: string }>();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany1, setSelectedCompany1] = useState("");
  const [selectedCompany2, setSelectedCompany2] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);
  const [selectedChartMetric, setSelectedChartMetric] = useState("");
  const [company1Quarters, setCompany1Quarters] = useState(0);
  const [company2Quarters, setCompany2Quarters] = useState(0);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);

        const companiesResp = await fetch(`${BACKEND}/companies`);
        if (!companiesResp.ok) {
          throw new Error("Failed to load companies");
        }

        const companiesData = (await companiesResp.json()) as Company[];
        setCompanies(
          companiesData.map((company) => ({
            id: company.id,
            symbol: company.symbol,
            name: company.name,
          })),
        );

        if (scrip) {
          setSelectedCompany1(scrip.toUpperCase());
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load companies",
        );
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [scrip]);

  useEffect(() => {
    if (!selectedCompany1) {
      setCompany1Quarters(0);
      return;
    }

    const fetchCompany1Quarters = async () => {
      try {
        const response = await fetch(
          `${BACKEND}/financial?scrip=${encodeURIComponent(selectedCompany1)}`,
        );
        if (response.ok) {
          const data = (await response.json()) as FinancialRecord[];
          const company = companies.find((c) => c.symbol === selectedCompany1);
          if (company) {
            const dataset = buildDataset(company, data);
            setCompany1Quarters(dataset.quarters.length);
          }
        }
      } catch (err) {
        console.error("Error fetching company1 quarters:", err);
      }
    };

    fetchCompany1Quarters();
  }, [selectedCompany1, companies]);

  useEffect(() => {
    if (!selectedCompany2) {
      setCompany2Quarters(0);
      return;
    }

    const fetchCompany2Quarters = async () => {
      try {
        const response = await fetch(
          `${BACKEND}/financial?scrip=${encodeURIComponent(selectedCompany2)}`,
        );
        if (response.ok) {
          const data = (await response.json()) as FinancialRecord[];
          const company = companies.find((c) => c.symbol === selectedCompany2);
          if (company) {
            const dataset = buildDataset(company, data);
            setCompany2Quarters(dataset.quarters.length);
          }
        }
      } catch (err) {
        console.error("Error fetching company2 quarters:", err);
      }
    };

    fetchCompany2Quarters();
  }, [selectedCompany2, companies]);

  const handleCompare = async () => {
    if (!selectedCompany1 || !selectedCompany2) {
      setError("Select both companies before comparing.");
      setComparisonResult(null);
      return;
    }

    if (selectedCompany1 === selectedCompany2) {
      setError("Select two different companies.");
      setComparisonResult(null);
      return;
    }

    const company1 = companies.find(
      (company) => company.symbol === selectedCompany1,
    );
    const company2 = companies.find(
      (company) => company.symbol === selectedCompany2,
    );

    if (!company1 || !company2) {
      setError("Selected company data is not available.");
      setComparisonResult(null);
      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      const [response1, response2] = await Promise.all([
        fetch(
          `${BACKEND}/financial?scrip=${encodeURIComponent(selectedCompany1)}`,
        ),
        fetch(
          `${BACKEND}/financial?scrip=${encodeURIComponent(selectedCompany2)}`,
        ),
      ]);

      if (!response1.ok || !response2.ok) {
        throw new Error(
          "Failed to fetch financial data for one or both companies.",
        );
      }

      const [data1, data2] = (await Promise.all([
        response1.json(),
        response2.json(),
      ])) as [FinancialRecord[], FinancialRecord[]];

      if (!data1.length || !data2.length) {
        throw new Error("One or both companies do not have financial data.");
      }

      const dataset1 = buildDataset(company1, data1);
      const dataset2 = buildDataset(company2, data2);

      if (!quarterListsMatch(dataset1.quarters, dataset2.quarters)) {
        throw new Error(
          "Comparison can only happen when both companies have the same quarter/year list.",
        );
      }

      const quarters = dataset1.quarters;
      const rows = createComparisonRows(dataset1, dataset2, quarters);
      const chartMetrics = getCommonChartMetrics(dataset1, dataset2, quarters);

      if (chartMetrics.length === 0) {
        throw new Error("No graphable metric found for these companies.");
      }

      const summaryCards = buildSummaryCards(dataset1, dataset2, quarters);

      setComparisonResult({
        company1,
        company2,
        dataset1,
        dataset2,
        quarters,
        rows,
        chartMetrics,
        summaryCards,
      });

      setSelectedChartMetric((current) =>
        chartMetrics.includes(current) ? current : chartMetrics[0],
      );
    } catch (err) {
      console.error("Error comparing companies:", err);
      setComparisonResult(null);
      setError(
        err instanceof Error ? err.message : "Failed to compare companies",
      );
    } finally {
      setIsComparing(false);
    }
  };

  if (loadingCompanies) {
    return (
      <main className="market-page">
        <div className="market-shell">
          <div className="loading-state panel">Loading comparison page...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="market-page">
      <div className="market-shell">
        <Header />
        <header className="panel page-hero flex flex-wrap items-start justify-between gap-4 px-5 py-5 max-[560px]:px-3.5 max-[560px]:py-3.5">
          <div className="page-hero-copy">
            <h1 className="m-0 flex items-center gap-2 text-[clamp(1.45rem,2.2vw,2rem)] font-bold tracking-[-0.015em] max-[560px]:text-[1.34rem]">
              <FiPieChart className="shrink-0 text-white text-[1.15em]" />
              Financial Comparison
            </h1>
            <p className="mt-1.5 text-[0.92rem] text-[#9fb0d4]">
              Compare two companies only when their quarter/year lists match.
            </p>
          </div>

          <div className="page-actions"></div>
        </header>

        <section className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiBarChart2 />
              <p>Select Company 1</p>
            </div>
            <select
              name="select company1"
              id="select-company1"
              className="company-select"
              value={selectedCompany1}
              onChange={(event) => {
                setSelectedCompany1(event.target.value);
                setError(null);
                setComparisonResult(null);
              }}
            >
              <option value="">Select</option>
              {companies.map((company) => (
                <option key={company.id} value={company.symbol}>
                  {company.symbol} ({company.name})
                </option>
              ))}
            </select>
            <div className="text-[0.8rem] text-[#8be7dc]">
              Quarters: {company1Quarters > 0 ? `${company1Quarters}` : "—"}
            </div>
          </article>

          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiBarChart2 />
              <p>Select Company 2</p>
            </div>
            <select
              name="select company2"
              id="select-company2"
              className="company-select"
              value={selectedCompany2}
              onChange={(event) => {
                setSelectedCompany2(event.target.value);
                setError(null);
                setComparisonResult(null);
              }}
            >
              <option value="">Select</option>
              {companies
                .filter((company) => company.symbol !== selectedCompany1)
                .map((company) => (
                  <option key={company.id} value={company.symbol}>
                    {company.symbol} ({company.name})
                  </option>
                ))}
            </select>
            <div className="text-[0.8rem] text-[#8be7dc]">
              Quarters: {company2Quarters > 0 ? `${company2Quarters}` : "—"}
            </div>
          </article>
        </section>

        <div className="flex justify-center">
          <button
            className="compare-btn-primary"
            type="button"
            onClick={handleCompare}
            disabled={isComparing}
          >
            {isComparing ? "Comparing..." : "Compare Companies"}
          </button>
        </div>

        {error ? (
          <section className="panel table-panel">
            <div className="empty-state danger">
              <p className="flex items-center justify-center gap-2 text-base font-semibold">
                <FiAlertTriangle /> {error}
              </p>
              <p className="mt-2 text-sm">
                Pick two different companies with matching quarter/year records.
              </p>
            </div>
          </section>
        ) : null}

        {comparisonResult ? (
          <section className="comparison-results-grid">
            <article className="panel comparison-summary-panel">
              <div className="comparison-section-title">
                <FiTrendingUp /> Comparison Summary
              </div>
              <div className="comparison-summary-grid">
                {comparisonResult.summaryCards.map((card) => (
                  <div key={card.label} className="comparison-summary-card">
                    <div className="comparison-summary-label">{card.label}</div>
                    <div className="comparison-summary-value">{card.value}</div>
                    <div className="comparison-summary-note">{card.note}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel comparison-chart-panel">
              <div className="comparison-chart-header">
                <div>
                  <div className="comparison-section-title">
                    <FiBarChart2 /> Trend Chart
                  </div>
                </div>

                <label className="comparison-metric-picker">
                  <div className="flex items-center gap-2 text-[#9fb0d4]">
                    <span className="text-[1rem]">Metric</span>
                    <select
                      className="comparison-metric-select"
                      value={selectedChartMetric}
                      onChange={(event) =>
                        setSelectedChartMetric(event.target.value)
                      }
                    >
                      {comparisonResult.chartMetrics.map((metricName) => (
                        <option key={metricName} value={metricName}>
                          {metricName}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <ComparisonChart
                quarters={comparisonResult.quarters}
                dataset1={comparisonResult.dataset1}
                dataset2={comparisonResult.dataset2}
                metricName={selectedChartMetric}
              />
            </article>

            <article className="panel table-panel comparison-table-panel">
              <div className="comparison-section-title">
                <FiGitMerge /> Side-by-Side Comparison
              </div>
              <div className="table-wrap">
                <table className="financial-table comparison-table text-left">
                  <thead>
                    <tr>
                      <th className="financial-first-col" rowSpan={2}>
                        Particular
                      </th>
                      {comparisonResult.quarters.map((quarter) => (
                        <th
                          key={quarter}
                          colSpan={2}
                          className="comparison-quarter-group"
                        >
                          {quarter}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {comparisonResult.quarters.map((quarter) => (
                        <Fragment key={quarter}>
                          <th className="comparison-company-head">
                            {comparisonResult.company1.symbol}
                          </th>
                          <th className="comparison-company-head">
                            {comparisonResult.company2.symbol}
                          </th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult.rows.map((row, index) => (
                      <tr
                        key={row.metricName}
                        className={`financial-row ${index % 2 === 0 ? "even" : "odd"}`}
                      >
                        <td className="financial-first-col">
                          {row.metricName}
                        </td>
                        {comparisonResult.quarters.map((quarter) => (
                          <Fragment key={`${row.metricName}-${quarter}`}>
                            <td className="value-cell comparison-a-cell">
                              {formatDisplayValue(
                                row.values[quarter]?.company1,
                              )}
                            </td>
                            <td className="value-cell comparison-b-cell">
                              {formatDisplayValue(
                                row.values[quarter]?.company2,
                              )}
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        ) : (
          <section className="panel table-panel">
            <div className="empty-state">
              Select two companies and click Compare Companies to see the
              side-by-side comparison and chart.
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default Comparison;
