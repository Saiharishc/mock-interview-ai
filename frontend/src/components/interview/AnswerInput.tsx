import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, BookOpen, Pencil } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onViewAnswer: () => void;
  onModifyAnswer: () => void;
  isListening: boolean;
  onToggleMic: () => void;
  voiceSupported: boolean;
  disabled?: boolean;
}

export function AnswerInput({ value, onChange, onSubmit, onViewAnswer, onModifyAnswer, isListening, onToggleMic, voiceSupported, disabled }: Props) {
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isListening ? "Listening… speak your answer" : "Type your answer here, or use the mic button."}
        disabled={disabled}
        className={isListening ? "border-primary ring-2 ring-primary/30" : ""}
      />
      <div className="flex items-center justify-between gap-2">
        {voiceSupported ? (
          <Button variant={isListening ? "destructive" : "outline"} onClick={onToggleMic} disabled={disabled}>
            {isListening ? <><MicOff className="h-4 w-4 mr-1" />Stop</> : <><Mic className="h-4 w-4 mr-1" />Speak</>}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Voice input unavailable in this browser</span>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onViewAnswer} disabled={disabled}>
            <BookOpen className="h-4 w-4 mr-1" /> View Answer
          </Button>
          <Button variant="outline" onClick={onModifyAnswer} disabled={disabled || !value.trim()}>
            <Pencil className="h-4 w-4 mr-1" /> Modify Answer
          </Button>
          <Button onClick={onSubmit} disabled={disabled || !value.trim()}>
            <Send className="h-4 w-4 mr-1" /> Submit Answer
          </Button>
        </div>
      </div>
    </div>
  );
}
