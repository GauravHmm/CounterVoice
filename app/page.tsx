"use client";
import { useRef, useState } from "react";
import { createSession, touch } from "@/lib/session";
import { loadSessions, removeSession, saveSession } from "@/lib/storage";
import { Challenge, Evaluation, Session } from "@/lib/schemas";
import styles from "./page.module.css";

type Screen = "landing" | "setup" | "session" | "report" | "history";
const labels = {
  pitch_defense: "Pitch defense",
  decision_stress_test: "Decision stress test",
  argument_challenge: "Argument challenge",
  skeptical_investor: "Skeptical investor",
  socratic_examiner: "Socratic examiner",
  red_team_strategist: "Red-team strategist",
  pragmatic_operator: "Pragmatic operator",
  constructive: "Constructive",
  rigorous: "Rigorous",
  intense: "Intense",
};
async function call(path: string, payload: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}
export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing"),
    [session, setSession] = useState<Session | null>(null),
    [history, setHistory] = useState<Session[]>(() => loadSessions()),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState(""),
    [form, setForm] = useState({
      mode: "pitch_defense" as Session["mode"],
      persona: "skeptical_investor" as Session["persona"],
      intensity: "rigorous" as Session["intensity"],
      language: "english" as Session["language"],
      thesis: "",
      context: "",
    });
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const persist = (next: Session) => {
    const updated = touch(next);
    setSession(updated);
    saveSession(updated);
    setHistory(loadSessions());
    return updated;
  };
  const begin = async () => {
    setError("");
    if (form.thesis.trim().length < 10)
      return setError(
        "Please give the opponent a substantive idea or argument.",
      );
    const draft = createSession({
      mode: form.mode,
      persona: form.persona,
      intensity: form.intensity,
      language: form.language,
      originalThesis: form.thesis.trim(),
      context: form.context.trim() || undefined,
    });
    setBusy("Analysing your position…");
    try {
      const { analysis } = await call("/api/sessions/analyze", draft);
      persist({
        ...draft,
        argumentAnalysis: analysis,
        claims: analysis.supporting_claims,
        assumptions: analysis.assumptions,
        evidence: analysis.evidence,
        unresolvedIssues: analysis.weaknesses,
        status: "confirming",
      });
      setScreen("session");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to analyse the idea.");
    } finally {
      setBusy("");
    }
  };
  const confirm = async () => {
    if (!session) return;
    setBusy("Reconstructing the strongest case…");
    setError("");
    try {
      const { steelman } = await call("/api/sessions/steelman", session);
      const prepared = persist({ ...session, steelman, status: "active" });
      const { challenge } = await call("/api/sessions/challenge", prepared);
      persist({ ...prepared, challenges: [challenge], currentRound: 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue.");
    } finally {
      setBusy("");
    }
  };
  const submit = async () => {
    if (!session || !answer.trim()) return;
    setBusy("Testing your response…");
    setError("");
    try {
      const { evaluation } = await call("/api/sessions/respond", {
        session,
        response: answer.trim(),
      });
      const response = {
        challengeId: session.challenges.at(-1)!.id,
        text: answer.trim(),
        createdAt: new Date().toISOString(),
        evaluation: evaluation as Evaluation,
      };
      let next = persist({
        ...session,
        currentThesis: evaluation.revised_thesis || session.currentThesis,
        responses: [...session.responses, response],
        contradictions: [
          ...session.contradictions,
          ...evaluation.contradictions,
        ],
        assumptions: [...session.assumptions, ...evaluation.new_assumptions],
        currentRound: session.currentRound + 1,
      });
      setAnswer("");
      if (next.currentRound > 5) {
        await finish(next);
        return;
      }
      const { challenge } = await call("/api/sessions/challenge", next);
      persist({
        ...next,
        challenges: [...next.challenges, challenge],
        unresolvedIssues: [
          ...next.unresolvedIssues.filter(
            (x) => x !== next.challenges.at(-1)?.issue,
          ),
          challenge.issue,
        ],
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to evaluate this response.",
      );
    } finally {
      setBusy("");
    }
  };
  const finish = async (source = session) => {
    if (!source) return;
    setBusy("Writing your pressure report…");
    try {
      const { report } = await call("/api/sessions/report", source);
      persist({ ...source, report, status: "completed" });
      setScreen("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create the report.");
    } finally {
      setBusy("");
    }
  };
  const record = async () => {
    try {
      if (recorder.current?.state === "recording") {
        recorder.current.stop();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      recorder.current = r;
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy("Transcribing…");
        try {
          const fd = new FormData();
          fd.set(
            "audio",
            new File(chunks.current, "turn.webm", { type: r.mimeType }),
          );
          fd.set("language", session?.language === "hindi" ? "hi" : "en");
          const result = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: fd,
          });
          const data = await result.json();
          if (!result.ok) throw new Error(data.error);
          setAnswer(data.transcript || data.text || "");
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Could not transcribe recording.",
          );
        } finally {
          setBusy("");
        }
      };
      r.start();
      setBusy("Recording — tap microphone again to stop.");
    } catch {
      setError(
        "Microphone access was denied or unavailable. You can still respond in text.",
      );
    }
  };
  const current = session?.challenges.at(-1);
  const canHear = Boolean(session && current);
  const speak = async () => {
    if (!current) return;
    setBusy("Speaking…");
    try {
      const r = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: current.question,
          language: session?.language === "hindi" ? "hi" : "en",
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error);
      }
      new Audio(URL.createObjectURL(await r.blob())).play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice playback unavailable.");
    } finally {
      setBusy("");
    }
  };
  if (screen === "landing")
    return (
      <main className={styles.landing}>
        <nav>
          <span className={styles.brand}>CounterVoice</span>
          <button className="quiet" onClick={() => setScreen("history")}>
            Session archive
          </button>
        </nav>
        <section>
          <p className={styles.kicker}>Think under pressure.</p>
          <h1>Your ideas deserve more than agreement.</h1>
          <p>
            CounterVoice challenges assumptions, tests reasoning, and helps you
            find out whether an argument actually holds up.
          </p>
          <div className={styles.actions}>
            <button onClick={() => setScreen("setup")}>
              Start a challenge
            </button>
            <a href="#method">How it works</a>
          </div>
        </section>
        <aside id="method">
          <b>01</b> Present a position <b>02</b> Confirm its strongest
          interpretation <b>03</b> Defend it under focused pressure
        </aside>
      </main>
    );
  if (screen === "setup")
    return (
      <main className={styles.shell}>
        <header>
          <button className="quiet" onClick={() => setScreen("landing")}>
            ← CounterVoice
          </button>
          <span>New session</span>
        </header>
        <section className={styles.setup}>
          <div>
            <p className={styles.kicker}>Set the terms</p>
            <h1>Bring a position worth testing.</h1>
            <p>
              One pointed challenge at a time. You may revise your argument
              whenever the evidence demands it.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              begin();
            }}
          >
            <label>
              Challenge mode
              <select
                value={form.mode}
                onChange={(e) =>
                  setForm({ ...form, mode: e.target.value as Session["mode"] })
                }
              >
                {Object.entries(labels)
                  .slice(0, 3)
                  .map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Opponent
              <select
                value={form.persona}
                onChange={(e) =>
                  setForm({
                    ...form,
                    persona: e.target.value as Session["persona"],
                  })
                }
              >
                {Object.entries(labels)
                  .slice(3, 7)
                  .map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Intensity
              <select
                value={form.intensity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    intensity: e.target.value as Session["intensity"],
                  })
                }
              >
                {Object.entries(labels)
                  .slice(7)
                  .map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Language
              <select
                value={form.language}
                onChange={(e) =>
                  setForm({
                    ...form,
                    language: e.target.value as Session["language"],
                  })
                }
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </label>
            <label className={styles.wide}>
              Your thesis
              <textarea
                required
                value={form.thesis}
                onChange={(e) => setForm({ ...form, thesis: e.target.value })}
                placeholder="State the idea, decision, or argument you want to test."
              />
            </label>
            <label className={styles.wide}>
              Context (optional)
              <textarea
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
                placeholder="What constraints, evidence, or audience should the opponent know?"
              />
            </label>
            <button disabled={!!busy}>{busy || "Begin analysis"}</button>
          </form>
        </section>
        {error && <p className={styles.error}>{error}</p>}
      </main>
    );
  if (screen === "history")
    return (
      <main className={styles.shell}>
        <header>
          <button className="quiet" onClick={() => setScreen("landing")}>
            ← CounterVoice
          </button>
          <span>Session archive</span>
        </header>
        <section className={styles.history}>
          <h1>Local archive</h1>
          <p>
            These sessions live only in this browser. Clearing site storage
            removes them.
          </p>
          {history.length ? (
            history.map((item) => (
              <article key={item.sessionId}>
                <div>
                  <b>{item.originalThesis}</b>
                  <small>
                    {labels[item.mode]} ·{" "}
                    {new Date(item.updatedAt).toLocaleDateString()} ·{" "}
                    {item.status}
                  </small>
                </div>
                <button
                  className="quiet"
                  onClick={() => {
                    setSession(item);
                    setScreen(item.report ? "report" : "session");
                  }}
                >
                  Open
                </button>
                <button
                  className="quiet"
                  onClick={() => {
                    removeSession(item.sessionId);
                    setHistory(loadSessions());
                  }}
                >
                  Delete
                </button>
              </article>
            ))
          ) : (
            <p>No saved sessions yet.</p>
          )}
        </section>
      </main>
    );
  if (screen === "report" && session?.report)
    return (
      <main className={styles.shell}>
        <header>
          <button className="quiet" onClick={() => setScreen("history")}>
            ← Archive
          </button>
          <button
            className="quiet"
            onClick={() => {
              const blob = new Blob([JSON.stringify(session, null, 2)], {
                type: "application/json",
              });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "countervoice-report.json";
              a.click();
            }}
          >
            Export JSON
          </button>
          <button className="quiet" onClick={() => window.print()}>
            Print
          </button>
        </header>
        <section className={styles.report}>
          <p className={styles.kicker}>Intellectual pressure report</p>
          <h1>{session.currentThesis}</h1>
          <p>{session.report.executive_summary}</p>
          <hr />
          <h2>What held up</h2>
          <p>{session.report.strongest_reasoning}</p>
          <h2>Weakest assumption</h2>
          <p>{session.report.weakest_assumption}</p>
          <h2>Evidence gaps</h2>
          <ul>
            {session.report.evidence_gaps.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <h2>Recommended next steps</h2>
          <ol>
            {session.report.next_steps.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <h2>Transparent assessment</h2>
          <div className={styles.rubric}>
            {Object.entries(session.report.assessment).map(([key, value]) => (
              <article key={key}>
                <b>
                  {key.replace("_", " ")} · {value.score}/5
                </b>
                <p>{value.rationale}</p>
              </article>
            ))}
          </div>
          <p className={styles.note}>
            Scores are explanatory heuristics based on this recorded session,
            not validated psychological measurements.
          </p>
        </section>
      </main>
    );
  return (
    <main className={styles.shell}>
      <header>
        <button className="quiet" onClick={() => setScreen("history")}>
          CounterVoice
        </button>
        <span>
          {session &&
            `${labels[session.persona]} · ${labels[session.intensity]}`}
        </span>
        <button className="quiet" onClick={() => finish()}>
          End & report
        </button>
      </header>
      {session && (
        <section className={styles.session}>
          <aside className={styles.summary}>
            <p className={styles.kicker}>Position</p>
            <b>{session.currentThesis}</b>
            <details>
              <summary>Argument summary</summary>
              <p>{session.argumentAnalysis?.thesis}</p>
              <ul>
                {session.unresolvedIssues.slice(0, 5).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </details>
            <small>Round {session.currentRound || 1} of 5</small>
          </aside>
          <article className={styles.arena}>
            {session.status === "confirming" ? (
              <>
                <p className={styles.kicker}>Faithful reconstruction</p>
                <h1>{session.argumentAnalysis?.thesis}</h1>
                <p>
                  I will first reconstruct the strongest reasonable
                  interpretation, then test it. Confirm to proceed.
                </p>
                <button onClick={confirm} disabled={!!busy}>
                  {busy || "Confirm interpretation"}
                </button>
              </>
            ) : (
              <>
                <p className={styles.kicker}>
                  Current challenge · round {session.currentRound}
                </p>
                <h1>{current?.question || "Preparing a focused challenge…"}</h1>
                <p>{current?.why_it_matters}</p>
                {canHear && (
                  <button className="quiet" onClick={speak}>
                    Hear opponent
                  </button>
                )}
                <div className={styles.transcript}>
                  {session.responses.map((r) => (
                    <div key={r.createdAt}>
                      <b>You</b>
                      <p>{r.text}</p>
                      <b>
                        CounterVoice ·{" "}
                        {r.evaluation?.classification.replace("_", " ")}
                      </b>
                      <p>{r.evaluation?.acknowledgement}</p>
                    </div>
                  ))}
                </div>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Defend, revise, or qualify your position…"
                />
                <div className={styles.actions}>
                  <button type="button" className="quiet" onClick={record}>
                    ●{" "}
                    {busy.startsWith("Recording")
                      ? "Stop recording"
                      : "Use microphone"}
                  </button>
                  <button onClick={submit} disabled={!!busy || !answer.trim()}>
                    {busy || "Submit response"}
                  </button>
                </div>
              </>
            )}
          </article>
        </section>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </main>
  );
}
