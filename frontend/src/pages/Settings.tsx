import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Check, X } from "lucide-react";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWebSpeech } from "@/hooks/useWebSpeech";

interface ApiKeyOut {
  id: number;
  provider: string;
  model: string;
  label: string | null;
  masked_key: string;
}

interface ProvidersResponse {
  providers: string[];
  free_models: Record<string, string[]>;
}

const SUGGESTED_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-7"],
  gemini: ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"],
  azure: ["your-deployment-name"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it", "mixtral-8x7b-32768"],
  ollama: ["llama3.1", "mistral", "gemma2", "phi3", "deepseek-coder"],
};

const VOICE_PREF_KEY = "preferred-voice-uri";

export function SettingsPage() {
  const qc = useQueryClient();
  const speech = useWebSpeech();
  const [provider, setProvider] = useState("groq");
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem(VOICE_PREF_KEY) ?? "");
  const [model, setModel] = useState(SUGGESTED_MODELS["groq"][0]);
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [pingResult, setPingResult] = useState<Record<number, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    setModel(SUGGESTED_MODELS[provider]?.[0] ?? "");
  }, [provider]);

  const { data: providers } = useQuery<ProvidersResponse>({
    queryKey: ["providers"],
    queryFn: async () => (await apiClient.get("/settings/providers")).data,
  });

  const { data: keys = [] } = useQuery<ApiKeyOut[]>({
    queryKey: ["api-keys"],
    queryFn: async () => (await apiClient.get("/settings/api-keys")).data,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.post("/settings/api-keys", { provider, model, api_key: apiKey, label })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setApiKey("");
      setLabel("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/settings/api-keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  async function ping(row: ApiKeyOut) {
    const { data } = await apiClient.post("/settings/test-provider", {
      provider: row.provider,
      model: row.model,
    });
    setPingResult((p) => ({ ...p, [row.id]: { ok: data.ok, msg: data.ok ? data.response : data.error } }));
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add an AI provider key</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Keys are encrypted at rest. They are never returned to the browser after saving.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Provider</label>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                {(providers?.providers ?? []).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Model</label>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {(SUGGESTED_MODELS[provider] ?? []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              API key {provider === "ollama" && "(leave blank for local Ollama)"}
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "ollama" ? "(not required)" : "sk-..."}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Label (optional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Personal key" />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || (!apiKey && provider !== "ollama") || !model}
          >
            Save key
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Configured keys</CardTitle></CardHeader>
        <CardContent>
          {keys.length === 0 && <p className="text-sm text-muted-foreground">No keys configured yet.</p>}
          <ul className="space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between border border-border rounded-md p-3">
                <div className="text-sm">
                  <div className="font-medium">
                    {k.provider} <span className="text-muted-foreground">/ {k.model}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{k.label ?? "—"} · {k.masked_key}</div>
                  {pingResult[k.id] && (
                    <div className={`text-xs mt-1 ${pingResult[k.id].ok ? "text-emerald-500" : "text-destructive"}`}>
                      {pingResult[k.id].ok ? <Check className="inline h-3 w-3" /> : <X className="inline h-3 w-3" />}{" "}
                      {pingResult[k.id].msg}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => ping(k)}>Test</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(k.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Voice picker */}
      <Card>
        <CardHeader>
          <CardTitle>Interviewer voice</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choose which browser TTS voice the AI interviewer uses.
            {!speech.isSupported && " Voice input is unavailable in this browser (use Chrome or Edge)."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={selectedVoice}
            onChange={(e) => {
              setSelectedVoice(e.target.value);
              localStorage.setItem(VOICE_PREF_KEY, e.target.value);
            }}
          >
            <option value="">(System default)</option>
            {speech.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => speech.speak("Hello, I am your AI interviewer. Good luck today!", selectedVoice)}>
            Preview voice
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
