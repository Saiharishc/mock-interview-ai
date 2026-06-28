interface Props {
  score: number;
  label?: string;
}

export function ScoreCard({ score, label = "Overall Score" }: Props) {
  const color = score >= 7 ? "text-emerald-500" : score >= 5 ? "text-yellow-400" : "text-destructive";
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-5xl font-bold ${color}`}>{score.toFixed(1)}</span>
      <span className="text-muted-foreground text-sm">out of 10</span>
    </div>
  );
}
