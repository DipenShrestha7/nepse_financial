import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

type FinancialMetric = {
  metricName: string;
  [key: string]: string | number; // Dynamic quarters as keys
};

function Financial() {
  const { scrip } = useParams<{ scrip: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<FinancialMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quarters, setQuarters] = useState<string[]>([]);

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
          `http://127.0.0.1:8000/financial?scrip=${scrip}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch financial data");
        }

        const data = await response.json();
        console.log("Fetched financial data:", data);
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
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-slate-300">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Section */}
        <header className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg shadow-black/20 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Financial Metrics
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Scrip:{" "}
                <span className="font-semibold text-amber-300">{scrip}</span>
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-amber-400/60 hover:bg-slate-900/90 hover:text-amber-300 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
            >
              ← Back to Home
            </button>
          </div>
        </header>

        {/* Data Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur sm:p-5">
          {error ? (
            <div className="flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-10">
              <div className="text-center">
                <p className="text-lg font-medium text-red-400">{error}</p>
                <p className="mt-2 text-sm text-red-300/80">
                  No financial data is available for this scrip yet.
                </p>
              </div>
            </div>
          ) : metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-1 text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    <th className="sticky left-0 z-10 bg-slate-950 px-4 py-3 font-medium">
                      Particular
                    </th>
                    {quarters.map((quarter) => (
                      <th
                        key={quarter}
                        className="px-4 py-3 font-medium text-center"
                      >
                        {quarter}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, index) => (
                    <tr
                      key={metric.metricName}
                      className={`${
                        index % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/20"
                      } border border-white/5 text-sm text-slate-100 transition hover:bg-slate-900/60`}
                    >
                      <td className="sticky left-0 z-10 bg-slate-900/40 px-4 py-4 font-medium text-slate-300 hover:bg-slate-900/60">
                        {metric.metricName}
                      </td>
                      {quarters.map((quarter) => (
                        <td
                          key={`${metric.metricName}-${quarter}`}
                          className="px-4 py-4 text-right font-semibold text-amber-300"
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
            <div className="flex items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/30 px-4 py-10">
              <p className="text-center text-sm text-slate-400">
                No metrics found for this scrip
              </p>
            </div>
          )}
        </section>

        {/* Info Section */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg shadow-black/20 backdrop-blur">
          <h3 className="text-sm font-semibold text-slate-300">Information</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            This page displays financial metrics for the selected scrip. The
            table shows various financial ratios and indicators across different
            quarters. If a metric value is not available, it will be displayed
            as "—".
          </p>
        </section>
      </div>
    </main>
  );
}

export default Financial;
