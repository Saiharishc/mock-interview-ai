import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText } from "lucide-react";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useSessionDraftStore, type Difficulty, type InterviewType, type Mode } from "@/stores/sessionDraftStore";

const TOPIC_OPTIONS = [
  "Python", "Generative AI", "RAG", "Agents", "Vector Databases",
  "Cloud (AWS/GCP/Azure)", "Databricks", "ML System Design",
  "SQL", "Data Engineering", "MLOps", "LLMs", "Prompt Engineering",
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const TYPES: { value: InterviewType; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "system_design", label: "System Design" },
  { value: "coding", label: "Coding" },
  { value: "mixed", label: "Mixed" },
];
const MODES: { value: Mode; label: string; desc: string }[] = [
  { value: "practice", label: "Practice", desc: "See feedback after each answer" },
  { value: "exam", label: "Exam", desc: "Feedback withheld until the end" },
];

export function ConfigurePage() {
  const navigate = useNavigate();
  const { draft, setDraft } = useSessionDraftStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);

  const uploadResume = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await apiClient.post("/resumes", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { id: number; filename: string };
    },
    onSuccess: (data) => {
      setDraft({ resume_id: data.id });
      setResumeName(data.filename);
    },
  });

  const createSession = useMutation({
    mutationFn: async () => (await apiClient.post("/sessions", draft)).data,
    onSuccess: (data) => navigate(`/interview/${data.id}`),
  });

  function toggleTopic(t: string) {
    setDraft({
      topics: draft.topics.includes(t)
        ? draft.topics.filter((x) => x !== t)
        : [...draft.topics, t],
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <Card>
        <CardHeader><CardTitle>Target role</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={draft.role}
            onChange={(e) => setDraft({ role: e.target.value })}
            placeholder='e.g. "Generative AI Engineer"'
          />
          <Textarea
            value={draft.jd_text ?? ""}
            onChange={(e) => setDraft({ jd_text: e.target.value || null })}
            placeholder="Paste job description (optional)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Difficulty</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDraft({ difficulty: d })}
              className={cn(
                "px-4 py-2 rounded-md border text-sm capitalize",
                draft.difficulty === d ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              {d}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Interview type</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setDraft({ interview_type: t.value })}
              className={cn(
                "px-4 py-2 rounded-md border text-sm",
                draft.interview_type === t.value ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              {t.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Multi-select. Leave empty to let the AI choose.</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {TOPIC_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTopic(t)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-sm",
                draft.topics.includes(t) ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              {t}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Length</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Number of questions</label>
            <Input
              type="number"
              min={1}
              max={30}
              value={draft.num_questions}
              onChange={(e) => setDraft({ num_questions: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Duration (minutes)</label>
            <Input
              type="number"
              min={5}
              max={180}
              value={draft.duration_min}
              onChange={(e) => setDraft({ duration_min: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mode</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setDraft({ mode: m.value })}
              className={cn(
                "flex-1 px-4 py-3 rounded-md border text-left",
                draft.mode === m.value ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              <div className="font-medium text-sm">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.desc}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Resume (optional)</CardTitle></CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadResume.mutate(f);
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload PDF / DOCX / TXT
          </Button>
          {resumeName && (
            <div className="mt-3 text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> {resumeName}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/")}>Back</Button>
        <Button
          size="lg"
          onClick={() => createSession.mutate()}
          disabled={!draft.role.trim() || createSession.isPending}
        >
          {createSession.isPending ? "Starting…" : "Start interview →"}
        </Button>
      </div>
    </div>
  );
}
