import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowLeft,
  FiBarChart2,
  FiClock,
  FiInfo,
  FiLayers,
} from "react-icons/fi";
import companiesData from "../../../companies.json";
import { BACKEND } from "../../config/api.ts";

type FinancialMetric = {
  metricName: string;
  [key: string]: string | number; // Dynamic quarters as keys
};

// Create a reverse mapping from scrip to company name
const scripToCompanyName: { [key: string]: string } = {};
Object.entries(companiesData).forEach(([companyName, data]: [string, any]) => {
  scripToCompanyName[data.company_name] = companyName;
});

function Financial() {
  let { scrip } = useParams<{ scrip: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<FinancialMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quarters, setQuarters] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState<string>("");
  scrip = scrip?.toUpperCase() || "";

  // Get company name from scrip code
  useEffect(() => {
    const name = scripToCompanyName[scrip] || scrip;
    setCompanyName(name);
  }, [scrip]);
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!scrip) {
          setError("Scrip not provided");
          return;
        }

        // Fetch financial data from backend
        const response = await fetch(
          `${BACKEND}/financial?scrip=${scrip}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch financial data");
        }

        const data = await response.json();
        if (!data || data.length === 0) {
          setError("Data not available");
          setMetrics([]);
          return;
        }

        // Process the data to create table structure
        const quarterSet = new Set<string>();
        const metricsMap = new Map<string, FinancialMetric>();

        data.forEach(
          (item: { quarter: string; metricName: string; value: string }) => {
            quarterSet.add(item.quarter);

            if (!metricsMap.has(item.metricName)) {
              metricsMap.set(item.metricName, { metricName: item.metricName });
            }

            const metric = metricsMap.get(item.metricName)!;
            metric[item.quarter] = item.value;
          },
        );

        // Sort quarters chronologically
        const sortedQuarters = Array.from(quarterSet).sort();
        setQuarters(sortedQuarters);

        // Convert map to array
        const metricsArray = Array.from(metricsMap.values());
        setMetrics(metricsArray);
      } catch (err) {
        console.error("Error fetching financial data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch financial data",
        );
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [scrip]);

  if (loading) {
    return (
      <main className="market-page">
        <div className="market-shell">
          <div className="loading-state panel">Loading financial data...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="market-page">
      <div className="market-shell">
        <header className="panel page-hero flex flex-wrap items-start justify-between gap-4 px-5 py-5 max-[560px]:px-3.5 max-[560px]:py-3.5">
          <div className="page-hero-copy">
            <h1 className="m-0 flex items-center gap-2 text-[clamp(1.45rem,2.2vw,2rem)] font-bold tracking-[-0.015em] max-[560px]:text-[1.34rem]">
              <FiBarChart2 className="shrink-0 text-white text-[1.15em]" />
              Financial Data Dashboard
            </h1>
            <p className="mt-1.5 text-[0.92rem] text-[#9fb0d4]">
              Scrip:{" "}
              <span className="font-semibold text-cyan-300">{scrip}</span>
              {companyName && scrip && (
                <>
                  {" "}
                  •{" "}
                  <span className="font-semibold text-cyan-300">
                    {companyName}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="page-actions">
            <button
              onClick={() => navigate("/company")}
              className="btn-secondary"
            >
              <FiArrowLeft /> Back to Directory
            </button>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-4 max-[560px]:grid-cols-1">
          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiLayers /> Total Metrics
            </div>
            <div className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              {metrics.length}
            </div>
            <div className="text-[0.8rem] text-[#8be7dc]">
              Rows in this financial statement
            </div>
          </article>

          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiClock /> Total Quarters
            </div>
            <div className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              {quarters.length}
            </div>
            <div className="text-[0.8rem] text-[#8be7dc]">
              Chronological reporting periods
            </div>
          </article>

          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiActivity /> Status
            </div>
            <div className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              {error ? "Data Missing" : "Ready"}
            </div>
            <div
              className={`text-[0.8rem] ${error ? "text-[#ff9ca5]" : "text-[#8be7dc]"}`}
            >
              {error ? "Review selected scrip" : "Market fundamentals loaded"}
            </div>
          </article>
        </section>

        <section className="panel table-panel">
          {error ? (
            <div className="empty-state danger">
              <p className="flex items-center justify-center gap-2 text-base font-semibold">
                <FiAlertTriangle /> {error}
              </p>
              <p className="mt-2 text-sm">
                No financial data is available for this scrip yet.
              </p>
            </div>
          ) : metrics.length > 0 ? (
            <div className="table-wrap">
              <table className="financial-table text-left">
                <thead>
                  <tr>
                    <th className="financial-first-col">Particular</th>
                    {quarters.map((quarter) => (
                      <th key={quarter} className="text-right">
                        {quarter}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, index) => (
                    <tr
                      key={metric.metricName}
                      className={`financial-row ${index % 2 === 0 ? "even" : "odd"}`}
                    >
                      <td className="financial-first-col">
                        {metric.metricName}
                      </td>
                      {quarters.map((quarter) => (
                        <td
                          key={`${metric.metricName}-${quarter}`}
                          className="value-cell"
                        >
                          {metric[quarter] !== undefined
                            ? metric[quarter]
                            : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">No metrics found for this scrip.</div>
          )}
        </section>

        <section className="flex gap-3 panel info-note justify-center items-center">
          <FiInfo className="text-xl -mt-0.5 shrink-0" />
          <p>
            This dashboard presents financial metrics for the selected scrip.
            Values are grouped by quarter, and unavailable values appear as
            placeholders.
          </p>
        </section>
      </div>
    </main>
  );
}

export default Financial;
