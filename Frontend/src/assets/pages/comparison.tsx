import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiBarChart2,
  FiGitMerge,
} from "react-icons/fi";

type FinancialMetric = {
  metricName: string;
  [key: string]: string | number; // Dynamic quarters as keys
};

function Comparison() {
  let { scrip } = useParams<{ scrip: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<FinancialMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quarters, setQuarters] = useState<string[]>([]);
  const [company1, setCompany1] = useState([]);
  const [company2, setCompany2] = useState([]);
  scrip = scrip?.toUpperCase() || "";
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load company symbols for the select controls
        try {
          const companiesResp = await fetch("http://127.0.0.1:8000/companies");
          if (companiesResp.ok) {
            const companiesData = await companiesResp.json();
            setCompany1(companiesData.map((c: any) => c.symbol));
            setCompany2(companiesData.map((c: any) => c.symbol));
          }
        } catch (e) {
          console.warn("Failed to load companies for selects:", e);
        }

        if (!scrip) {
          // No scrip selected yet; stop after loading company list
          setMetrics([]);
          return;
        }

        // Fetch financial data for the selected scrip from backend
        const response = await fetch(
          `http://127.0.0.1:8000/financial?scrip=${encodeURIComponent(scrip)}`,
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
          <div className="loading-state panel">Loading comparison data...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="market-page">
      <div className="market-shell">
        <header className="panel flex flex-wrap items-start justify-between gap-4 px-5 py-5 max-[560px]:px-3.5 max-[560px]:py-3.5">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 [font-family:'Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.11em] text-[#81efdf]">
              <FiGitMerge /> Comparison View
            </p>
            <h1 className="m-0 text-[clamp(1.45rem,2.2vw,2rem)] font-bold tracking-[-0.015em] max-[560px]:text-[1.34rem]">
              Financial Comparison
            </h1>
            <p className="mt-1.5 text-[0.92rem] text-[#9fb0d4]">
              Scrip:{" "}
              <span className="font-semibold text-cyan-300">
                {scrip || "Not selected"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
            <div className="flex items-center gap-2 [font-family:'Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiBarChart2 />
              <p>Select Company1</p>
            </div>
            <div className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              <select name="select company1" id="select-company1">
                <option value="">Select</option>
                {company1 &&
                  company1.map((c, i) => {
                    return <option key={i}>{c}</option>;
                  })}
              </select>
            </div>
            <div className="text-[0.8rem] text-[#8be7dc]">
              Unique financial items : {metrics.length}
            </div>
          </article>

          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiBarChart2 /> Select Company2
            </div>
            <div className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              <select name="select company2" id="select-company2">
                <option value="">Select</option>
                {company2 &&
                  company2.map((c, i) => {
                    return <option key={i}>{c}</option>;
                  })}
              </select>
            </div>
            <div className="text-[0.8rem] text-[#8be7dc]">
              Unique financial items : {metrics.length}
            </div>
          </article>

          <article className="panel kpi-card">
            <button className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              Compare
            </button>
          </article>
        </section>

        <section className="panel table-panel">
          {error ? (
            <div className="empty-state danger">
              <p className="flex items-center justify-center gap-2 text-base font-semibold">
                <FiAlertTriangle /> {error}
              </p>
              <p className="mt-2 text-sm">
                Open this page from a company row to compare a selected scrip.
              </p>
            </div>
          ) : metrics.length > 0 ? (
            <div className="table-wrap">
              <table className="financial-table text-left">
                <thead>
                  <tr>
                    <th className="financial-first-col">Particular</th>
                    {quarters.map((quarter) => (
                      <th key={quarter} className="text-center">
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
      </div>
    </main>
  );
}

export default Comparison;
