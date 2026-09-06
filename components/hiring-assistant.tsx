const API_URL = process.env.NEXT_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bot, Check, ChevronRight, Clock3, ExternalLink, Phone, Play, Plus, RefreshCw, Settings2, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { formatDate, formatDuration, maskPhone } from "@/lib/utils";

type Agent = {
  id: string;
  name: string;
  voice_persona?: string;
  persona_name?: string;
  language?: string;
  status?: string;
  custom_variables?: string[];
  result_schema?: Record<string, unknown>;
  objective?: string;
  agent_prompt?: string;
  introduction?: string;
  result_prompt?: string;
};

type Call = {
  id: string;
  request_id?: string;
  callee_name: string;
  mobile_number: string;
  status?: string;
  lifecycle_status?: string;
  recording_url?: string | null;
  result?: Record<string, unknown> | null;
  duration_seconds?: number | null;
  duration_minutes?: number | null;
  engagement_status?: string | null;
  answered_by?: string | null;
  call_ended_by?: string | null;
  created_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
  timezone?: string;
};

const defaultSchema = {
  interested: "boolean",
  qualified: "boolean",
  years_experience: "number",
  notice_period: "string",
  expected_salary: "string",
  relevant_skills: "string",
  reason: "string",
};

const defaultPrompt = `You are an AI hiring assistant conducting a concise first-round screening call for a recruiter.

Your job is to:
1. Confirm you are speaking with the candidate.
2. Explain that this is an initial screening call for the role.
3. Ask about the candidate's relevant experience and skills.
4. Ask whether they are interested in the opportunity.
5. Ask their notice period and expected compensation.
6. Ask one or two role-relevant screening questions based on the job description.
7. Never invent facts about the company, role, or candidate.
8. Be respectful, concise, conversational, and transparent that you are an AI assistant.
9. Do not make a final hiring decision. Collect information for the recruiter.

Use the supplied job description and candidate information as context.`;

const defaultResultPrompt = `Extract a structured screening outcome from the conversation. Use only information supported by the conversation. If a value was not established, return a sensible null/unknown representation rather than inventing it.`;

function toneForStatus(status?: string) {
  const s = (status || "").toUpperCase();
  if (["COMPLETED", "ACTIVE"].includes(s)) return "success" as const;
  if (["IN_PROGRESS", "RINGING", "INITIATED", "SCHEDULED"].includes(s)) return "blue" as const;
  if (["NOT_CONNECTED"].includes(s)) return "warning" as const;
  if (["FAILED", "CANCELLED"].includes(s)) return "danger" as const;
  return "neutral" as const;
}

export default function HiringAssistant() {
  const [tab, setTab] = useState<"screen" | "calls" | "agents">("screen");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [candidateName, setCandidateName] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [jobRole, setJobRole] = useState("Software Engineer");
  const [company, setCompany] = useState("Acme Technologies");
  const [jobDescription, setJobDescription] = useState(
    "We are hiring a Software Engineer to build reliable backend services. Strong Python experience, REST APIs, SQL/PostgreSQL, and familiarity with cloud deployment are preferred. Candidates should have 2+ years of relevant experience and strong communication skills."
  );
  const [agentId, setAgentId] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [submitting, setSubmitting] = useState(false);
  const [showAgentBuilder, setShowAgentBuilder] = useState(false);

  const activeAgents = useMemo(() => agents.filter(a => (a.status || "").toUpperCase() !== "DRAFT"), [agents]);

  const fetchData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    setError("");
    try {
      const [a, c] = await Promise.all([
        fetch(apiUrl("/api/agents")).then(r => r.json()),
        fetch(apiUrl("/api/calls?page=1&page_size=100")).then(r => r.json()),
      ]);
      if (!a.ok) throw new Error(a.message || "Could not load agents");
      if (!c.ok) throw new Error(c.message || "Could not load calls");
      setAgents(a.results || []);
      setCalls(c.results || []);
      if (!agentId && (a.results || []).length) setAgentId(a.results[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId]);

  useEffect(() => { fetchData(false); }, [fetchData]);

  useEffect(() => {
    if (tab !== "calls") return;
    const id = window.setInterval(() => fetchData(false), 10000);
    return () => window.clearInterval(id);
  }, [tab, fetchData]);

  async function startCall() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/calls"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          callee_name: candidateName,
          mobile_number: candidatePhone,
          custom_data: {
            company,
            job_role: jobRole,
            job_description: jobDescription,
          },
          timezone,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Could not create the call");
      setCandidateName("");
      setCandidatePhone("");
      setTab("calls");
      await fetchData(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create call");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading Hiring Assistant…</div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white"><Sparkles size={18} /></div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Hunar Hire</div>
              <div className="text-xs text-slate-500">AI Hiring Assistant</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={agents.length ? "success" : "warning"}>{agents.length ? `${agents.length} agent${agents.length > 1 ? "s" : ""} connected` : "Configure Hunar"}</Badge>
            <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500"><ShieldCheck size={14} /> Recruiter workspace</div>
          <h1 className="text-3xl font-semibold tracking-tight">Screen candidates with a voice agent.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Configure the screening context, launch an outbound Hunar call, and review structured answers when the conversation completes.</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div><strong className="font-semibold">Action failed.</strong> {error}</div>
            <button onClick={() => setError("")}><X size={16} /></button>
          </div>
        )}

        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
          {[
            ["screen", "New screening", Phone],
            ["calls", `Call activity (${calls.length})`, Activity],
            ["agents", "Voice agents", Bot],
          ].map(([value, label, Icon]) => (
            <button key={value as string} onClick={() => setTab(value as typeof tab)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <Icon size={15} /> {label as string}
            </button>
          ))}
        </div>

        {tab === "screen" && (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
            <Card className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Candidate screening</h2>
                  <p className="mt-1 text-xs text-slate-500">One call creates one structured screening record.</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><UserRound size={17} /></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Candidate name</Label><Input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="e.g. Priya Sharma" /></div>
                <div><Label>Mobile number</Label><Input value={candidatePhone} onChange={e => setCandidatePhone(e.target.value)} placeholder="+919876543210" /></div>
                <div><Label>Job role</Label><Input value={jobRole} onChange={e => setJobRole(e.target.value)} /></div>
                <div><Label>Company</Label><Input value={company} onChange={e => setCompany(e.target.value)} /></div>
                <div className="sm:col-span-2">
                  <Label>Job description / screening context</Label>
                  <Textarea rows={8} value={jobDescription} onChange={e => setJobDescription(e.target.value)} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Voice agent</Label>
                  <select value={agentId} onChange={e => setAgentId(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Select an agent</option>
                    {activeAgents.map(a => <option key={a.id} value={a.id}>{a.name} · {a.language || "—"} · {a.voice_persona || "—"}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Candidate timezone</Label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                <div className="text-xs text-slate-500">The call is outbound and will use your Hunar organization’s configured number.</div>
                <Button size="lg" onClick={startCall} disabled={submitting || !agentId || !candidateName || !candidatePhone}>
                  <Phone size={16} /> {submitting ? "Starting call…" : "Start AI screening call"}
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2 font-semibold"><Bot size={17} /> Agent status</div>
                {activeAgents.length ? activeAgents.slice(0, 3).map(agent => (
                  <div key={agent.id} className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3 last:mb-0">
                    <div className="flex items-center justify-between"><span className="text-sm font-medium">{agent.name}</span><Badge tone={toneForStatus(agent.status)}>{agent.status || "UNKNOWN"}</Badge></div>
                    <div className="mt-2 text-xs text-slate-500">{agent.voice_persona || "—"} · {agent.language || "—"} · {agent.persona_name || "—"}</div>
                  </div>
                )) : (
                  <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                    No agents are available. Create one from the Voice agents tab or provision an agent in Hunar first.
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2 font-semibold"><Clock3 size={17} /> How it works</div>
                {[
                  ["1", "Context", "The job description and candidate metadata are sent as call custom data."],
                  ["2", "Voice call", "Hunar initiates the outbound call with the selected agent."],
                  ["3", "Structured result", "Hunar extracts the screening fields defined by the agent."],
                  ["4", "Dashboard", "Webhook events update the call record here in near real time."],
                ].map(([n, title, body]) => <div key={n} className="mb-4 flex gap-3 last:mb-0"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs text-white">{n}</div><div><div className="text-sm font-medium">{title}</div><div className="mt-0.5 text-xs leading-5 text-slate-500">{body}</div></div></div>)}
              </Card>
            </div>
          </div>
        )}

        {tab === "calls" && <CallActivity calls={calls} selectedCall={selectedCall} setSelectedCall={setSelectedCall} />}
        {tab === "agents" && <AgentManager agents={agents} onCreated={fetchData} show={showAgentBuilder} setShow={setShowAgentBuilder} />}
      </main>
    </div>
  );
}

function CallActivity({ calls, selectedCall, setSelectedCall }: { calls: Call[]; selectedCall: Call | null; setSelectedCall: (c: Call | null) => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-semibold">Call activity</h2><p className="mt-1 text-xs text-slate-500">Webhook-backed status and screening results.</p></div>
          <Badge tone="blue"><Activity size={12} className="mr-1" /> Live</Badge>
        </div>
        {calls.length ? (
          <div className="divide-y divide-slate-100">
            {calls.map(call => (
              <button key={call.id} onClick={() => setSelectedCall(call)} className={`w-full px-5 py-4 text-left transition hover:bg-slate-50 ${selectedCall?.id === call.id ? "bg-slate-50" : ""}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{call.callee_name}</div>
                    <div className="mt-1 text-xs text-slate-500">{maskPhone(call.mobile_number)} · {formatDate(call.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-3"><Badge tone={toneForStatus(call.lifecycle_status || call.status)}>{call.lifecycle_status || call.status || "UNKNOWN"}</Badge><ChevronRight size={15} className="text-slate-400" /></div>
                </div>
                <div className="mt-3 flex gap-5 text-xs text-slate-500">
                  <span>{call.duration_seconds ? formatDuration(call.duration_seconds) : "Duration —"}</span>
                  <span>{call.answered_by || "Answer status —"}</span>
                  {call.result && <span className="text-emerald-700">Result available</span>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">No calls yet. Start a screening from the New screening tab.</div>
        )}
      </Card>
      <CallDetails call={selectedCall} />
    </div>
  );
}

function CallDetails({ call }: { call: Call | null }) {
  if (!call) return <Card className="flex min-h-[300px] items-center justify-center p-6 text-center text-sm text-slate-500"><div><Activity size={24} className="mx-auto mb-3 text-slate-300" /><div>Select a call to inspect its screening result.</div></div></Card>;
  const result = call.result || {};
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><div className="text-xs uppercase tracking-wider text-slate-400">Screening result</div><h2 className="mt-1 text-lg font-semibold">{call.callee_name}</h2><div className="mt-1 text-xs text-slate-500">{maskPhone(call.mobile_number)}</div></div>
        <Badge tone={toneForStatus(call.lifecycle_status || call.status)}>{call.lifecycle_status || call.status || "UNKNOWN"}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(result).map(([key, value]) => (
          <div key={key} className="rounded-lg bg-slate-50 p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{key.replaceAll("_", " ")}</div>
            <div className="mt-1 break-words text-sm text-slate-800">{typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}</div>
          </div>
        ))}
      </div>
      {!Object.keys(result).length && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500">Structured result will appear after the call completes and Hunar sends the result/summary webhook.</div>}
      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-xs">
        <div className="flex justify-between"><span className="text-slate-500">Duration</span><span>{formatDuration(call.duration_seconds)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Engagement</span><span>{call.engagement_status || "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Answered by</span><span>{call.answered_by || "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Ended by</span><span>{call.call_ended_by || "—"}</span></div>
      </div>
      {call.recording_url && (
        <div className="mt-5">
          <a href={call.recording_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:underline"><Play size={14} /> Open call recording <ExternalLink size={13} /></a>
        </div>
      )}
    </Card>
  );
}

function AgentManager({ agents, onCreated, show, setShow }: { agents: Agent[]; onCreated: () => void; show: boolean; setShow: (v: boolean) => void }) {
  const [name, setName] = useState("Candidate Screening Agent");
  const [language, setLanguage] = useState("ENGLISH");
  const [voice, setVoice] = useState("NEHA");
  const [persona, setPersona] = useState("Neha");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [objective, setObjective] = useState("Conduct a respectful first-round hiring screen and collect recruiter-ready candidate information.");
  const [introduction, setIntroduction] = useState("Hi {callee_name}, this is {persona_name}, an AI hiring assistant calling from {company}. Is now a good time for a brief screening conversation about the {job_role} role?");
  const [resultPrompt, setResultPrompt] = useState(defaultResultPrompt);
  const [schemaText, setSchemaText] = useState(JSON.stringify(defaultSchema, null, 2));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createAgent() {
    setCreating(true); setError("");
    try {
      let schema: Record<string, unknown>;
      try { schema = JSON.parse(schemaText); } catch { throw new Error("Result schema must be valid JSON."); }
      const response = await fetch(apiUrl("/api/agents"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, language, voice_persona: voice, persona_name: persona, agent_prompt: prompt, objective, introduction, result_prompt: resultPrompt, result_schema: schema }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Could not create agent");
      setShow(false); onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create agent"); }
    finally { setCreating(false); }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div><h2 className="font-semibold">Voice agents</h2><p className="mt-1 text-xs text-slate-500">Agents are managed through Hunar. The browser never receives the Hunar API key.</p></div>
          <Button onClick={() => setShow(!show)}><Plus size={15} /> Create screening agent</Button>
        </div>
      </Card>

      {show && (
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2"><Settings2 size={17} /><div><h3 className="font-semibold">Create a screening agent</h3><p className="text-xs text-slate-500">These fields map to Hunar's documented agent creation API.</p></div></div>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</div>}
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>Language</Label><select value={language} onChange={e => setLanguage(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option>ENGLISH</option><option>HINDI</option><option>BENGALI</option><option>TAMIL</option><option>TELUGU</option><option>KANNADA</option><option>MARATHI</option><option>MALAYALAM</option><option>GUJARATI</option><option>SPANISH</option><option>ARABIC</option><option>TURKISH</option></select></div>
            <div><Label>Voice persona</Label><select value={voice} onChange={e => { setVoice(e.target.value); setPersona(e.target.value.charAt(0) + e.target.value.slice(1).toLowerCase()); }} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">{["NEHA","ROY","ZOE","SAM","MIRA","EESHA"].map(v => <option key={v}>{v}</option>)}</select></div>
            <div><Label>Persona name</Label><Input value={persona} onChange={e => setPersona(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Objective</Label><Input value={objective} onChange={e => setObjective(e.target.value)} /></div>
            <div className="md:col-span-3"><Label>Introduction</Label><Input value={introduction} onChange={e => setIntroduction(e.target.value)} /></div>
            <div className="md:col-span-3"><Label>Agent prompt</Label><Textarea rows={10} value={prompt} onChange={e => setPrompt(e.target.value)} /></div>
            <div className="md:col-span-3"><Label>Result prompt</Label><Textarea rows={4} value={resultPrompt} onChange={e => setResultPrompt(e.target.value)} /></div>
            <div className="md:col-span-3"><Label>Result schema (JSON)</Label><Textarea rows={10} value={schemaText} onChange={e => setSchemaText(e.target.value)} /></div>
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-5"><Button variant="outline" onClick={() => setShow(false)}>Cancel</Button><Button onClick={createAgent} disabled={creating}>{creating ? "Creating…" : "Create agent"}</Button></div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => (
          <Card key={agent.id} className="p-5">
            <div className="flex items-start justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><Bot size={17} /></div><Badge tone={toneForStatus(agent.status)}>{agent.status || "UNKNOWN"}</Badge></div>
            <h3 className="mt-4 font-semibold">{agent.name}</h3>
            <div className="mt-1 text-xs text-slate-500">{agent.persona_name || agent.voice_persona || "—"} · {agent.language || "—"}</div>
            <div className="mt-4 text-xs text-slate-500">{agent.custom_variables?.length ? `Variables: ${agent.custom_variables.join(", ")}` : "No custom variables reported"}</div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">Agent ID: {agent.id}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}