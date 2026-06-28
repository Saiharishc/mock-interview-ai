import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Difficulty = "easy" | "medium" | "hard";
export type InterviewType = "technical" | "behavioral" | "system_design" | "coding" | "mixed";
export type Mode = "practice" | "exam";

export interface SessionDraft {
  role: string;
  jd_text: string | null;
  difficulty: Difficulty;
  interview_type: InterviewType;
  topics: string[];
  num_questions: number;
  duration_min: number;
  mode: Mode;
  resume_id: number | null;
}

const defaultDraft: SessionDraft = {
  role: "",
  jd_text: null,
  difficulty: "medium",
  interview_type: "mixed",
  topics: [],
  num_questions: 5,
  duration_min: 30,
  mode: "practice",
  resume_id: null,
};

interface SessionDraftState {
  draft: SessionDraft;
  setDraft: (patch: Partial<SessionDraft>) => void;
  reset: () => void;
}

export const useSessionDraftStore = create<SessionDraftState>()(
  persist(
    (set) => ({
      draft: defaultDraft,
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ draft: defaultDraft }),
    }),
    { name: "session-draft" },
  ),
);
