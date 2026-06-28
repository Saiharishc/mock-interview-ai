export interface ApiKeyOut {
  id: number;
  provider: string;
  model: string;
  label: string | null;
  masked_key: string;
}

export interface SessionOut {
  id: number;
  role: string;
  difficulty: string;
  interview_type: string;
  topics: string[];
  num_questions: number;
  duration_min: number;
  mode: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  overall_score: number | null;
  created_at: string;
}

export interface ResumeOut {
  id: number;
  filename: string;
  uploaded_at: string;
}
