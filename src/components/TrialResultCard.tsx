import { Trial, UserProfile } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateTrialSuitability, calculateDistance } from "@/lib/trialMatching";
import { MapPin, Activity, Zap, HelpCircle } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TrialResultCardProps {
  trial: Trial;
  userProfile?: UserProfile;
  onViewDetails?: (trial: Trial) => void;
  onZoomToLocation?: (trial: Trial) => void;
}

function TrialResultCard({
  trial,
  userProfile,
  onViewDetails,
  onZoomToLocation,
}: TrialResultCardProps) {
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  
  const suitabilityScore = userProfile
    ? calculateTrialSuitability(trial, userProfile)
    : null;
  
  const distance = userProfile
    ? calculateDistance(
        userProfile.latitude,
        userProfile.longitude,
        trial.latitude,
        trial.longitude
      )
    : null;

  const getSuitabilityColor = (score: number) => {
    if (score >= 75) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-300";
    if (score >= 25) return "bg-blue-100 text-blue-800 border-blue-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getStatusColor = (status: string) => {
    if (status === "Recruiting") return "bg-emerald-100 text-emerald-700";
    if (status === "Closed") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const generateDetailedMatchExplanation = () => {
    if (!userProfile || suitabilityScore === null) return null;
    
    const matchReasons: { label: string; matched: boolean; points: number }[] = [];
    
    // Cancer type (30 points)
    const cancerMatch = trial.cancer_type.toLowerCase() === userProfile.cancer_type.toLowerCase();
    matchReasons.push({
      label: `Cancer Type: ${trial.cancer_type}`,
      matched: cancerMatch,
      points: cancerMatch ? 30 : 0
    });
    
    // Disease stage (25 points)
    const stageMatch = trial.disease_stage.includes(userProfile.disease_stage.charAt(6));
    matchReasons.push({
      label: `Disease Stage: ${trial.disease_stage}`,
      matched: stageMatch,
      points: stageMatch ? 25 : 0
    });
    
    // Biomarkers (25 points)
    const matchingBiomarkers = userProfile.biomarkers.filter(bm =>
      trial.biomarkers.some(tb => tb.toLowerCase() === bm.toLowerCase())
    );
    const biomarkerMatch = matchingBiomarkers.length > 0;
    matchReasons.push({
      label: `Biomarkers: ${trial.biomarkers.length > 0 ? trial.biomarkers.join(", ") : "None required"}`,
      matched: biomarkerMatch,
      points: biomarkerMatch ? 25 : 0
    });
    
    // Recruiting status (10 points)
    const recruitingMatch = trial.recruitment_status === "Recruiting";
    matchReasons.push({
      label: `Status: ${trial.recruitment_status}`,
      matched: recruitingMatch,
      points: recruitingMatch ? 10 : 0
    });
    
    // Location (10 points)
    const locationMatch = trial.province === userProfile.province;
    matchReasons.push({
      label: `Location: ${trial.city}, ${trial.province}`,
      matched: locationMatch,
      points: locationMatch ? 10 : 0
    });
    
    return { matchReasons, matchingBiomarkers };
  };

  const matchDetails = generateDetailedMatchExplanation();

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
        {/* Header with title and status */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm leading-tight text-foreground">
            {trial.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getStatusColor(trial.recruitment_status)}>
              {trial.recruitment_status}
            </Badge>
            {suitabilityScore !== null && (
              <Badge className={getSuitabilityColor(suitabilityScore)}>
                {suitabilityScore}% Match
              </Badge>
            )}
          </div>
        </div>

        {/* Location and Hospital */}
        <div className="space-y-1 text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">{trial.hospital}</p>
              <p>{trial.city}, {trial.province}</p>
              {distance !== null && (
                <p className="text-xs text-primary font-semibold">
                  {distance.toFixed(1)} km away
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Treatment & Key Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground font-medium">Treatment</p>
            <p className="text-foreground">{trial.treatment_type}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Phase</p>
            <p className="text-foreground">{trial.phase}</p>
          </div>
        </div>

        {/* Biomarkers if available */}
        {trial.biomarkers.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Biomarkers</p>
            <div className="flex flex-wrap gap-1">
              {trial.biomarkers.slice(0, 3).map((biomarker) => (
                <Badge key={biomarker} variant="secondary" className="text-xs">
                  {biomarker}
                </Badge>
              ))}
              {trial.biomarkers.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{trial.biomarkers.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t flex-wrap">
          {userProfile && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-xs h-8 min-w-[100px]"
              onClick={() => setShowMatchDialog(true)}
            >
              <HelpCircle className="w-3 h-3 mr-1" />
              Why Match?
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-8 min-w-[100px]"
            onClick={() => onViewDetails?.(trial)}
          >
            <Activity className="w-3 h-3 mr-1" />
            View Summary
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs h-8 min-w-[100px]"
            onClick={() => onZoomToLocation?.(trial)}
          >
            <Zap className="w-3 h-3 mr-1" />
            View on Map
          </Button>
        </div>
      </div>

      {/* Match Explanation Dialog */}
      {userProfile && matchDetails && (
        <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Match Analysis: {suitabilityScore}%</DialogTitle>
              <DialogDescription>
                Detailed breakdown of why this trial matches your profile
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Your Profile Summary */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Your Profile</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cancer Type:</span>
                    <p className="font-medium">{userProfile.cancer_type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stage:</span>
                    <p className="font-medium">{userProfile.disease_stage}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Age:</span>
                    <p className="font-medium">{userProfile.age} years</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium">{userProfile.city}, {userProfile.province}</p>
                  </div>
                  {userProfile.biomarkers.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Your Biomarkers:</span>
                      <p className="font-medium">{userProfile.biomarkers.join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Breakdown */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Match Breakdown</h3>
                <div className="space-y-2">
                  {matchDetails.matchReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        reason.matched
                          ? "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800"
                          : "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${reason.matched ? "text-emerald-600" : "text-gray-400"}`}>
                          {reason.matched ? "✓" : "○"}
                        </span>
                        <span className="text-sm">{reason.label}</span>
                      </div>
                      <span className={`text-sm font-semibold ${reason.matched ? "text-emerald-600" : "text-gray-400"}`}>
                        {reason.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trial Summary */}
              <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Trial Summary</h3>
                <p className="text-sm text-muted-foreground mb-3">{trial.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Treatment:</span>
                    <p className="font-medium">{trial.treatment_type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phase:</span>
                    <p className="font-medium">{trial.phase}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Distance:</span>
                    <p className="font-medium">{distance?.toFixed(1)} km away</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hospital:</span>
                    <p className="font-medium">{trial.hospital}</p>
                  </div>
                </div>
              </div>

              {/* Key Inclusion Criteria */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Key Inclusion Criteria</h3>
                <ul className="space-y-1">
                  {trial.inclusion_criteria.slice(0, 5).map((criteria, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                  {trial.inclusion_criteria.length > 5 && (
                    <li className="text-sm text-muted-foreground italic">
                      ...and {trial.inclusion_criteria.length - 5} more criteria
                    </li>
                  )}
                </ul>
              </div>

              {/* Key Exclusion Criteria */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Key Exclusion Criteria</h3>
                <ul className="space-y-1">
                  {trial.exclusion_criteria.slice(0, 4).map((criteria, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                  {trial.exclusion_criteria.length > 4 && (
                    <li className="text-sm text-muted-foreground italic">
                      ...and {trial.exclusion_criteria.length - 4} more criteria
                    </li>
                  )}
                </ul>
              </div>

              {/* Next Steps */}
              <div className="bg-primary/10 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Next Steps</h3>
                <p className="text-sm text-muted-foreground">
                  Discuss this trial with your oncologist. They can review the full eligibility criteria and contact the research team at {trial.contact_email} or {trial.contact_phone}.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default TrialResultCard;
