import { Trial, UserProfile } from "@/data/types";

// Haversine formula to calculate distance between two coordinates (in km)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate match score between user profile and trial
export function calculateTrialSuitability(
  trial: Trial,
  userProfile: UserProfile
): number {
  let score = 0;
  let maxScore = 100;

  // Cancer type match (30 points)
  if (
    trial.cancer_type.toLowerCase() ===
    userProfile.cancer_type.toLowerCase()
  ) {
    score += 30;
  }

  // Disease stage match (25 points)
  if (
    trial.disease_stage.toUpperCase().includes(userProfile.disease_stage.charAt(0).toUpperCase())
  ) {
    score += 25;
  }

  // Biomarker match (25 points)
  const matchingBiomarkers = userProfile.biomarkers.filter((bm) =>
    trial.biomarkers.some(
      (tb) => tb.toUpperCase() === bm.toUpperCase()
    )
  );
  if (matchingBiomarkers.length > 0) {
    score += 25;
  }

  // Recruiting status bonus (10 points)
  if (trial.recruitment_status === "Recruiting") {
    score += 10;
  }

  // Location preference (10 points if same province)
  if (trial.province === userProfile.province) {
    score += 10;
  }

  return Math.round((score / maxScore) * 100);
}

// Get trials sorted by suitability (primary) and distance (secondary)
export function getRankedTrials(
  trials: Trial[],
  userProfile: UserProfile
): Array<Trial & { suitabilityScore: number; distance: number }> {
  return trials
    .map((trial) => ({
      ...trial,
      suitabilityScore: calculateTrialSuitability(trial, userProfile),
      distance: calculateDistance(
        userProfile.latitude,
        userProfile.longitude,
        trial.latitude,
        trial.longitude
      ),
    }))
    .sort((a, b) => {
      // Primary sort: by suitability score (descending)
      if (b.suitabilityScore !== a.suitabilityScore) {
        return b.suitabilityScore - a.suitabilityScore;
      }
      // Secondary sort: by distance (ascending) for same suitability
      return a.distance - b.distance;
    });
}

// Get nearest trials to user, with suitability as secondary sort
export function getNearestTrials(
  trials: Trial[],
  userProfile: UserProfile,
  count: number = 3
): Array<Trial & { distance: number; suitabilityScore: number }> {
  return trials
    .map((trial) => ({
      ...trial,
      distance: calculateDistance(
        userProfile.latitude,
        userProfile.longitude,
        trial.latitude,
        trial.longitude
      ),
      suitabilityScore: calculateTrialSuitability(trial, userProfile),
    }))
    .sort((a, b) => {
      // Primary sort: by distance (ascending)
      const distanceDiff = a.distance - b.distance;
      if (Math.abs(distanceDiff) > 5) { // If distance difference > 5km, sort by distance
        return distanceDiff;
      }
      // Secondary sort: by suitability (descending) for similar distances
      return b.suitabilityScore - a.suitabilityScore;
    })
    .slice(0, count);
}

// Determine trial color based on suitability
export function getTrialColor(suitabilityScore: number): string {
  if (suitabilityScore >= 75) return "#10b981"; // Excellent - green
  if (suitabilityScore >= 50) return "#f59e0b"; // Good - amber
  if (suitabilityScore >= 25) return "#3b82f6"; // Fair - blue
  return "#9ca3af"; // Poor - gray
}

// Combined ranking: suitability + proximity with two-level sorting
export function getRankedByBoth(
  trials: Trial[],
  userProfile: UserProfile
): Array<Trial & { suitabilityScore: number; distance: number; combinedScore: number }> {
  return trials
    .map((trial) => {
      const suitabilityScore = calculateTrialSuitability(trial, userProfile);
      const distance = calculateDistance(
        userProfile.latitude,
        userProfile.longitude,
        trial.latitude,
        trial.longitude
      );
      // Normalize distance score (closer = higher score)
      const maxDistance = 500; // km
      const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
      // Combined: 60% suitability, 40% proximity
      const combinedScore = suitabilityScore * 0.6 + distanceScore * 0.4;

      return {
        ...trial,
        suitabilityScore,
        distance,
        combinedScore: Math.round(combinedScore),
      };
    })
    .sort((a, b) => {
      // Primary sort: by suitability score (descending)
      if (b.suitabilityScore !== a.suitabilityScore) {
        return b.suitabilityScore - a.suitabilityScore;
      }
      // Secondary sort: by distance (ascending) for same suitability
      return a.distance - b.distance;
    });
}
