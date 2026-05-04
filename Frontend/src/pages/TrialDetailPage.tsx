import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import Header from "@/components/Header";
import { trials } from "@/data/trials";

const TrialDetailPage = () => {
  const { id } = useParams();
  const trial = trials.find((t) => t.trial_id === id);
  const [showFullInclusion, setShowFullInclusion] = useState(false);
  const [showFullExclusion, setShowFullExclusion] = useState(false);
  const [showStudyDetails, setShowStudyDetails] = useState(false);

  if (!trial) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Trial not found</h1>
          <Link to="/search" className="text-info-label hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  const statusClass = trial.recruitment_status === "Recruiting" ? "status-badge-recruiting" : "status-badge-closed";
  const inclusionVisible = showFullInclusion ? trial.inclusion_criteria : trial.inclusion_criteria.slice(0, 4);
  const exclusionVisible = showFullExclusion ? trial.exclusion_criteria : trial.exclusion_criteria.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
        <Link to="/search" className="text-sm text-info-label hover:underline mb-6 inline-block">&larr; Back to search</Link>

        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <span className={statusClass}>{trial.recruitment_status}</span>
            <span className="text-sm text-muted-foreground">{trial.trial_id} - {trial.nct_id}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-6">{trial.title}</h1>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <span className="info-label block mb-1">Cancer type</span>
              <span className="text-sm">{trial.cancer_type}</span>
            </div>
            <div>
              <span className="info-label block mb-1">Disease stage</span>
              <span className="text-sm">{trial.disease_stage}</span>
            </div>
            <div>
              <span className="info-label block mb-1">Treatment type</span>
              <span className="text-sm">{trial.treatment_type}</span>
            </div>
          </div>

          {trial.biomarkers.length > 0 && (
            <div className="mb-6">
              <span className="info-label block mb-1">Biomarkers</span>
              <div className="flex gap-2 flex-wrap">
                {trial.biomarkers.map((b) => (
                  <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{b}</span>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-foreground leading-relaxed mb-4">{trial.description}</p>

          <button
            onClick={() => setShowStudyDetails(!showStudyDetails)}
            className="text-sm font-semibold text-foreground underline flex items-center gap-1"
          >
            {showStudyDetails ? "Close" : "Open"} study details
            <svg className={`w-4 h-4 transition-transform ${showStudyDetails ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showStudyDetails && (
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p><strong>Phase:</strong> {trial.phase}</p>
              <p><strong>Start date:</strong> {trial.start_date}</p>
              <p><strong>End date:</strong> {trial.end_date}</p>
              <p><strong>Principal Investigator:</strong> {trial.principal_investigator}</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Inclusion criteria</h2>
          <ul className="space-y-2">
            {inclusionVisible.map((c, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                {c}
              </li>
            ))}
          </ul>
          {trial.inclusion_criteria.length > 4 && (
            <button
              onClick={() => setShowFullInclusion(!showFullInclusion)}
              className="mt-3 text-sm font-semibold text-foreground underline flex items-center gap-1"
            >
              {showFullInclusion ? "Show less" : "See more inclusion criteria"}
              <svg className={`w-4 h-4 transition-transform ${showFullInclusion ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Exclusion criteria</h2>
          <ul className="space-y-2">
            {exclusionVisible.map((c, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                {c}
              </li>
            ))}
          </ul>
          {trial.exclusion_criteria.length > 3 && (
            <button
              onClick={() => setShowFullExclusion(!showFullExclusion)}
              className="mt-3 text-sm font-semibold text-foreground underline flex items-center gap-1"
            >
              {showFullExclusion ? "Show less" : "See more exclusion criteria"}
              <svg className={`w-4 h-4 transition-transform ${showFullExclusion ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">1 Trial centre</h2>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-start gap-2 mb-2">
                <svg className="w-4 h-4 mt-0.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-sm">{trial.hospital}</p>
                  <p className="text-sm text-muted-foreground">{trial.city}, {trial.province}</p>
                </div>
              </div>
              <p className="text-sm"><strong>Principal Investigator:</strong> {trial.principal_investigator}</p>
              <p className="text-sm"><strong>Status:</strong> {trial.recruitment_status}</p>
              <p className="text-sm"><strong>Cancer Type:</strong> {trial.cancer_type}</p>
            </div>
            <div className="lg:w-[340px] bg-secondary/50 rounded-xl p-6 text-center">
              <h3 className="text-lg font-bold text-foreground mb-2">Interested in this trial?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ask your treating doctor if this trial is right for you. They may need to contact the research team for you using the contact details on this page.
              </p>
              <a
                href={`mailto:${trial.contact_email}`}
                className="inline-flex items-center px-6 py-2 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Contact the research team
              </a>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
          Found an error? Please report it. <a href="#" className="text-info-label hover:underline">Report any errors in this trial.</a>
        </div>
      </main>
    </div>
  );
};

export default TrialDetailPage;
