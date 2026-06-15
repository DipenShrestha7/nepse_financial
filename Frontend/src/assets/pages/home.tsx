import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBarChart2,
  FiBriefcase,
  FiChevronDown,
  FiGrid,
  FiLayers,
  FiSearch,
  FiTrendingUp,
} from "react-icons/fi";
import Header from "../components/Header";
// import { BACKEND } from "../../config/api.ts";

type Company = {
  id: number;
  name: string;
  symbol: string;
  sector: string;
};

function Home() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(`https://nepse-financial.onrender.com/companies`);
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

  const totalSectors = Math.max(sectors.length - 1, 0);

  return (
    <main className="market-page">
      <div className="market-shell">
        <Header />
        <section className="panel page-hero mb-4 px-5 py-4">
          <div>
            <h1 className="m-0 text-[clamp(1.45rem,2.2vw,2rem)] font-bold tracking-[-0.015em] max-[560px]:text-[1.34rem] flex flex-row items-center">
              <FiGrid className="mr-2 mb-1" />
              Company List
            </h1>
            <p className="mt-1.5 text-[0.92rem] text-[#9fb0d4]">
              Search, filter, and jump into financial insights with one click.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-4 max-[560px]:grid-cols-1">
          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiBriefcase /> Listed Companies
            </div>
            <div className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              {companies.length}
            </div>
            <div className="text-[0.8rem] text-[#8be7dc]">
              Available in this session
            </div>
          </article>

          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiLayers /> Sectors
            </div>
            <div className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              {totalSectors}
            </div>
            <div className="text-[0.8rem] text-[#8be7dc]">
              Distinct market segments
            </div>
          </article>

          <article className="panel kpi-card">
            <div className="flex items-center gap-2 font:['Space_Mono',monospace] text-[0.72rem] uppercase tracking-[0.06em] text-[#9fb0d4]">
              <FiTrendingUp /> Filtered Results
            </div>
            <div className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-tight">
              {filteredCompanies.length}
            </div>
            <div className="text-[0.8rem] text-[#8be7dc]">
              {filteredCompanies.length === companies.length
                ? "Showing all companies"
                : "Based on active filters"}
            </div>
          </article>
        </section>

        <section className="panel controls-panel relative z-80">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-end gap-3 max-[560px]:grid-cols-1">
            <label>
              <span className="mb-2 block font:['Space_Mono',monospace] text-[0.77rem] uppercase tracking-[0.06em] text-[#87a1d5]">
                Search
              </span>
              <div className="input-wrap">
                <FiSearch />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by company name, scrip, or sector"
                  className="market-input"
                />
              </div>
            </label>

            <div ref={sectorRef} className="dropdown-wrap">
              <span className="mb-2 block font:['Space_Mono',monospace] text-[0.77rem] uppercase tracking-[0.06em] text-[#87a1d5]">
                Sector Filter
              </span>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={sectorOpen}
                onClick={() => setSectorOpen((v) => !v)}
                className="market-select-btn z-10"
              >
                <span>{selectedSector}</span>
                <FiChevronDown />
              </button>

              {sectorOpen && (
                <ul role="listbox" tabIndex={-1} className="dropdown-menu z-90">
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
                      className={`dropdown-item ${selectedSector === s ? "selected" : ""}`}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="mt-2 text-[0.82rem] text-[#91a8d7]">
            Showing {filteredCompanies.length} result
            {filteredCompanies.length === 1 ? "" : "s"}
          </p>
        </section>

        <section className="panel table-panel relative z-10">
          <div className="table-wrap">
            <table className="market-table text-left">
              <thead>
                <tr>
                  <th>SN</th>
                  <th>Company Scrip</th>
                  <th>Company Name</th>
                  <th>Sector</th>
                  <th>
                    <FiBarChart2 className="inline" /> Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company, index) => (
                    <tr key={company.id}>
                      <td>{index + 1}</td>
                      <td>
                        <button
                          onClick={() =>
                            navigate(`/financial/${company.symbol}`)
                          }
                          className="symbol-button"
                        >
                          {company.symbol}
                        </button>
                      </td>
                      <td>{company.name}</td>
                      <td>
                        <span className="sector-pill">{company.sector}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              navigate(`/financial/${company.symbol}`)
                            }
                            className="btn-secondary"
                          >
                            <FiBarChart2 /> Financial
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        No companies matched your current filters.
                      </div>
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
