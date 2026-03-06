export interface Trial {
  trial_id: string;
  nct_id: string;
  title: string;
  cancer_type: string;
  disease_stage: string;
  treatment_type: string;
  biomarkers: string[];
  phase: string;
  recruitment_status: "Recruiting" | "Closed" | "Not yet recruiting";
  hospital: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  principal_investigator: string;
  description: string;
  inclusion_criteria: string[];
  exclusion_criteria: string[];
  contact_email: string;
  contact_phone: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  trials?: Trial[];
}

export interface FilterState {
  cancer_type: string;
  disease_stage: string;
  province: string;
  city: string;
  hospital: string;
  treatment_type: string;
  biomarkers: string;
  phase: string;
  search: string;
}
