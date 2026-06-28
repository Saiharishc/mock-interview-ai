import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  durationMin: number;
  running: boolean;
  onExpire?: () => void;
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function Timer({ durationMin, running, onExpire }: Props) {
  const [remaining, setRemaining] = useState(durationMin * 60);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire?.();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onExpire]);

  const pct = (remaining / (durationMin * 60)) * 100;
  const isWarning = pct < 20;

  return (
    <div className={`flex items-center gap-1.5 text-sm font-mono ${isWarning ? "text-destructive" : "text-muted-foreground"}`}>
      <Clock className="h-4 w-4" />
      {fmt(remaining)}
    </div>
  );
}
