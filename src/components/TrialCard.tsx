import { Trial } from "@/data/types";
import { Link } from "react-router-dom";

interface TrialCardProps {
  trial: Trial;
}

const TrialCard = ({ trial }: TrialCardProps) => {
  const statusClass = trial.recruitment_status === "Recruiting"
    ? "status-badge-recruiting"
    : "status-badge-closed";

  return (
    <div className="trial-card">
      <div className="flex items-start justify-between mb-3">
        <span className={statusClass}>{trial.recruitment_status}</span>
        <span className="text-sm text-muted-foreground">
          {trial.trial_id} - {trial.nct_id}
        </span>
      </div>

      <h3 className="text-base font-bold text-foreground mb-4 leading-snug">{trial.title}</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <span className="info-label block mb-0.5">Cancer type</span>
          <span className="text-sm text-foreground">{trial.cancer_type}</span>
        </div>
        <div>
          <span className="info-label block mb-0.5">Disease stage</span>
          <span className="text-sm text-foreground">{trial.disease_stage}</span>
        </div>
        <div>
          <span className="info-label block mb-0.5">Treatment type</span>
          <span className="text-sm text-foreground">{trial.treatment_type}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {trial.hospital}
      </div>

      <Link
        to={`/trial/${trial.trial_id}`}
        className="inline-flex items-center px-5 py-2 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        View trial details
      </Link>
    </div>
  );
};

export default TrialCard;
