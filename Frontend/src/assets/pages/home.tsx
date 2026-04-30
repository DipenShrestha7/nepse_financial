import { useEffect, useMemo, useRef, useState } from "react";

type Company = {
  id: number;
  name: string;
  symbol: string;
  sector: string;
};

function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/companies");
        const data = await response.json();
        setCompanies(data);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };

    fetchCompanies();
  }, []);

  const sectors = useMemo(
    () => ["All", ...Array.from(new Set(companies.map((c) => c.sector)))],
    [companies],
  );
  const [sectorOpen, setSectorOpen] = useState(false);
  const sectorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) {
        setSectorOpen(false);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        company.name.toLowerCase().includes(normalizedQuery) ||
        company.symbol.toLowerCase().includes(normalizedQuery) ||
        company.sector.toLowerCase().includes(normalizedQuery);

      const matchesSector =
        selectedSector === "All" || company.sector === selectedSector;

      return matchesQuery && matchesSector;
    });
  }, [companies, query, selectedSector]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg shadow-black/20 backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            NEPSE Companies
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Company name, scrip, and sector list.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur sm:p-5">
          <div className="mb-4 grid w-full gap-3 sm:grid-cols-2 sm:items-end">
            <label className="block w-full">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Search
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by company, scrip, or sector"
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
              />
            </label>

            <div ref={sectorRef} className="relative">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Sector
              </span>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={sectorOpen}
                onClick={() => setSectorOpen((v) => !v)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-left text-sm text-slate-200 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
              >
                <span>{selectedSector}</span>
                <span className="float-right text-slate-300">▾</span>
              </button>

              {sectorOpen && (
                <ul
                  role="listbox"
                  tabIndex={-1}
                  className="absolute right-0 left-0 z-50 mt-2 max-h-60 overflow-auto rounded-lg border border-white/10 bg-slate-900/80 p-1 shadow-lg"
                >
                  {sectors.map((s) => (
                    <li
                      key={s}
                      role="option"
                      aria-selected={selectedSector === s}
                      onClick={() => {
                        setSelectedSector(s);
                        setSectorOpen(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedSector(s);
                          setSectorOpen(false);
                        }
                      }}
                      className={`cursor-pointer rounded-md px-3 py-3 text-sm text-slate-200 hover:bg-slate-800 ${selectedSector === s ? "bg-slate-800 font-semibold" : ""}`}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="mt-2 text-sm text-slate-400 sm:mt-0">
              {filteredCompanies.length} result
              {filteredCompanies.length === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  <th className="px-4 py-2 font-medium">Sn</th>
                  <th className="px-4 py-2 font-medium">Company Scrip</th>
                  <th className="px-4 py-2 font-medium">Company Name</th>
                  <th className="px-4 py-2 font-medium">Sector</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company, index) => (
                    <tr
                      key={company.id}
                      className="rounded-xl border border-white/10 bg-slate-900/70 text-sm text-slate-100 shadow-sm shadow-black/10"
                    >
                      <td className="px-4 py-4 font-medium text-slate-300">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 font-semibold tracking-wide text-amber-300">
                        <button className="cursor-pointer">
                          {company.symbol}
                        </button>
                      </td>
                      <td className="px-4 py-4">{company.name}</td>
                      <td className="px-4 py-4 text-slate-300">
                        {company.sector}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      No companies match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Home;
