import { FilterState } from "@/data/types";
import { cancerTypes, provinces, cities, hospitals, treatmentTypes, phases, stages } from "@/data/trials";

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
}

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) => (
  <div>
    <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">Select</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const FilterSidebar = ({ filters, onChange, onClear }: FilterSidebarProps) => {
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <aside className="filter-sidebar w-full lg:w-72 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h2 className="text-lg font-bold text-foreground">Filters</h2>
        </div>
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <FilterSelect label="Cancer type" value={filters.cancer_type} options={cancerTypes} onChange={(v) => update("cancer_type", v)} />
      <FilterSelect label="Disease stage" value={filters.disease_stage} options={stages} onChange={(v) => update("disease_stage", v)} />
      <FilterSelect label="Province" value={filters.province} options={provinces} onChange={(v) => update("province", v)} />
      <FilterSelect label="City" value={filters.city} options={cities} onChange={(v) => update("city", v)} />
      <FilterSelect label="Hospital centre" value={filters.hospital} options={hospitals} onChange={(v) => update("hospital", v)} />
      <FilterSelect label="Treatment type" value={filters.treatment_type} options={treatmentTypes} onChange={(v) => update("treatment_type", v)} />
      <FilterSelect label="Phase" value={filters.phase} options={phases} onChange={(v) => update("phase", v)} />
    </aside>
  );
};

export default FilterSidebar;
