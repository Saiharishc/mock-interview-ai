import { cn } from "@/lib/cn";

interface Props {
  order: number;
  total: number;
  text: string;
  topic: string | null;
  isFollowup: boolean;
  isGenerating: boolean;
}

export function QuestionPanel({ order, total, text, topic, isFollowup, isGenerating }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Question {order} of {total}
          {topic && <span className="ml-2 px-2 py-0.5 rounded-full bg-accent">{topic}</span>}
          {isFollowup && <span className="ml-2 text-yellow-500">Follow-up</span>}
        </span>
      </div>
      <p className={cn("text-lg font-medium leading-snug", isGenerating && "animate-pulse text-muted-foreground")}>
        {isGenerating ? "Thinking of next question…" : text}
      </p>
    </div>
  );
}
