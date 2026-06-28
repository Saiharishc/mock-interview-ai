import type { Evaluation } from "@/hooks/useInterviewSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DIM_LABELS: Record<string, string> = {
  relevance: "Relevance",
  accuracy: "Accuracy",
  clarity: "Clarity",
  confidence: "Confidence",
  completeness: "Completeness",
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-yellow-400" : "bg-destructive";
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span>{label}</span>
        <span className="font-medium">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  const { scores, score_10, feedback } = evaluation;
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Feedback</span>
          <span className={`text-2xl font-bold ${score_10 >= 7 ? "text-emerald-500" : score_10 >= 5 ? "text-yellow-400" : "text-destructive"}`}>
            {score_10.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/10</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {Object.entries(scores).map(([k, v]) => (
            <ScoreBar key={k} label={DIM_LABELS[k] ?? k} score={v} />
          ))}
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="font-medium text-emerald-500 mb-0.5">What was good</div>
            <p className="text-muted-foreground">{feedback.good}</p>
          </div>
          <div>
            <div className="font-medium text-yellow-400 mb-0.5">Missing / could improve</div>
            <p className="text-muted-foreground">{feedback.missing}</p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-1">
            <div className="font-semibold text-blue-400">Suggested Answer</div>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{feedback.better_answer}</p>
          </div>
          <div className="rounded-lg border border-muted p-3 space-y-1">
            <div className="font-medium text-muted-foreground">Industry Best Practices</div>
            <p className="text-muted-foreground">{feedback.best_practices}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
