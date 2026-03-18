import { Trial, UserProfile } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateTrialSuitability, calculateDistance } from "@/lib/trialMatching";
import { MapPin, Phone, Mail, Calendar, X, ExternalLink } from "lucide-react";

interface TrialSummaryPanelProps {
  trial: Trial | null;
  userProfile: UserProfile;
  onClose: () => void;
}

const TrialSummaryPanel = ({ trial, userProfile, onClose }: TrialSummaryPanelProps) => {
  if (!trial) {
    return (
      <div className="h-full flex items-center justify-center bg-card border-t border-border p-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Select a trial to view its summary</p>
          <p className="text-xs text-muted-foreground">Click "View Summary" on any trial card or click a map pin</p>
        </div>
      </div>
    );
  }

  const suitability = calculateTrialSuitability(trial, userProfile);
  const distance = calculateDistance(
    userProfile.latitude, userProfile.longitude,
    trial.latitude, trial.longitude
  );

  const getSuitabilityLabel = (score: number) => {
    if (score >= 75) return { label: "Excellent Match", color: "bg-emerald-100 text-emerald-800" };
    if (score >= 50) return { label: "Good Match", color: "bg-amber-100 text-amber-800" };
    if (score >= 25) return { label: "Fair Match", color: "bg-blue-100 text-blue-800" };
    return { label: "Limited Match", color: "bg-gray-100 text-gray-800" };
  };

  const matchInfo = getSuitabilityLabel(suitability);

  // Build CCS link from nct_id
  const ccsUrl = trial.nct_id
    ? `https://www.canadiancancertrials.ca/trial/${trial.nct_id}`
    : null;

  return (
    <div className="h-full flex flex-col bg-card border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-bold text-foreground">Trial Summary</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title & Badges */}
        <div>
          <h4 className="font-semibold text-sm text-foreground leading-tight mb-2">{trial.title}</h4>
          <div className="flex flex-wrap gap-1.5">
            <Badge className={trial.recruitment_status === "Recruiting" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
              {trial.recruitment_status}
            </Badge>
            <Badge className={matchInfo.color}>{suitability}% — {matchInfo.label}</Badge>
            <Badge variant="secondary">{trial.phase}</Badge>
          </div>
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground font-medium">Hospital</p>
            <p className="text-foreground font-medium">{trial.hospital}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Location</p>
            <p className="text-foreground font-medium">{trial.city}, {trial.province}</p>
            <p className="text-primary font-semibold">{distance.toFixed(1)} km away</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Treatment</p>
            <p className="text-foreground font-medium">{trial.treatment_type}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Cancer Type</p>
            <p className="text-foreground font-medium">{trial.cancer_type} — {trial.disease_stage}</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
          <p className="text-xs text-foreground leading-relaxed">{trial.description}</p>
        </div>

        {/* Biomarkers */}
        {trial.biomarkers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Biomarkers</p>
            <div className="flex flex-wrap gap-1">
              {trial.biomarkers.map(b => (
                <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Inclusion Criteria */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Key Inclusion Criteria</p>
          <ul className="space-y-0.5">
            {trial.inclusion_criteria.slice(0, 4).map((c, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Exclusion Criteria */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Key Exclusion Criteria</p>
          <ul className="space-y-0.5">
            {trial.exclusion_criteria.slice(0, 3).map((c, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <span className="text-destructive mt-0.5 flex-shrink-0">✗</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Dates & PI */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-1.5">
            <Calendar className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="text-foreground">{trial.start_date} — {trial.end_date}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Investigator</p>
            <p className="text-foreground">{trial.principal_investigator}</p>
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${trial.contact_email}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Mail className="w-3 h-3" /> {trial.contact_email}
          </a>
          <a href={`tel:${trial.contact_phone}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Phone className="w-3 h-3" /> {trial.contact_phone}
          </a>
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 text-xs"
            onClick={() => window.open(`/trial/${trial.trial_id}`, '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View Full Details
          </Button>
          {ccsUrl && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => window.open(ccsUrl, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View on CCS Website
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialSummaryPanel;
