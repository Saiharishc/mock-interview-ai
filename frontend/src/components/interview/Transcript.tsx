import type { Evaluation } from "@/hooks/useInterviewSocket";

export interface TranscriptEntry {
  questionId: number;
  order: number;
  questionText: string;
  answerText: string;
  evaluation?: Evaluation;
}

export function Transcript({ entries }: { entries: TranscriptEntry[] }) {
  if (!entries.length) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Transcript</h3>
      {entries.map((e) => (
        <div key={e.questionId} className="rounded-lg border border-border p-4 space-y-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Q{e.order}</span>
            <p className="font-medium mt-0.5">{e.questionText}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Your answer</span>
            <p className="text-muted-foreground mt-0.5">{e.answerText}</p>
          </div>
          {e.evaluation && (
            <div className="text-xs text-muted-foreground">
              Score: <span className="font-semibold text-foreground">{e.evaluation.score_10.toFixed(1)}/10</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
