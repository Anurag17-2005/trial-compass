import { useState, useMemo } from "react";
import Header from "@/components/Header";
import FilterSidebar from "@/components/FilterSidebar";
import TrialCard from "@/components/TrialCard";
import { FilterState } from "@/data/types";
import { trials } from "@/data/trials";
import { Link } from "react-router-dom";

const emptyFilters: FilterState = {
  cancer_type: "",
  disease_stage: "",
  province: "",
  city: "",
  hospital: "",
  treatment_type: "",
  biomarkers: "",
  phase: "",
  search: "",
};

const SearchPage = () => {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return trials.filter((t) => {
      if (filters.cancer_type && t.cancer_type !== filters.cancer_type) return false;
      if (filters.disease_stage && t.disease_stage !== filters.disease_stage) return false;
      if (filters.province && t.province !== filters.province) return false;
      if (filters.city && t.city !== filters.city) return false;
      if (filters.hospital && t.hospital !== filters.hospital) return false;
      if (filters.treatment_type && t.treatment_type !== filters.treatment_type) return false;
      if (filters.phase && t.phase !== filters.phase) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s) ||
          t.hospital.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [filters, search]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <FilterSidebar filters={filters} onChange={setFilters} onClear={() => setFilters(emptyFilters)} />

        <main className="flex-1 px-6 lg:px-10 py-8">
          <h1 className="text-2xl font-bold text-foreground mb-6">Search Results</h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Use filters to narrow down your results"
                className="w-full rounded-lg border border-input bg-card pl-4 pr-24 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent text-accent-foreground px-5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                Search
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          <p className="text-lg font-bold text-info-label mb-6">{filtered.length} Trials Found</p>

          <div className="space-y-4">
            {filtered.map((trial) => (
              <TrialCard key={trial.trial_id} trial={trial} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-2">No trials found matching your criteria.</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </main>
      </div>

      <Link
        to="/assistant"
        className="fixed bottom-6 right-6 bg-primary text-primary-foreground w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-50"
        title="AI Trial Assistant"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </Link>
    </div>
  );
};

export default SearchPage;
