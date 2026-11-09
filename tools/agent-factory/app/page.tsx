'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FactoryEvent, StepId, VerifyReport } from '../src/application/ports';

/* ---------- state built from the event stream ---------- */

interface Attempt {
  attempt: number;
  model: string;
  ok: boolean;
  issues?: string;
  durationMs: number;
  usage?: { promptTokens: number; completionTokens: number };
}

interface Step {
  key: string;
  step: StepId;
  round: number;
  agentId?: string;
  status: 'running' | 'ok' | 'failed';
  startedAt: string;
  durationMs?: number;
  model?: string;
  attempts: Attempt[];
  error?: string;
  data?: unknown;
}

interface Run {
  runId: string;
  request: string;
  source?: string;
  startedAt: string;
  status: 'running' | 'ok' | 'failed';
  durationMs?: number;
  error?: string;
  verified?: boolean;
  verdict?: string;
  outcome?: 'ready' | 'needs_human';
  steps: Step[];
}

function reduce(runs: Map<string, Run>, e: FactoryEvent): void {
  if (e.type === 'run.started') {
    runs.set(e.runId, { runId: e.runId, request: e.request, source: e.source, startedAt: e.at, status: 'running', steps: [] });
    return;
  }
  const run = runs.get(e.runId);
  if (!run) return;
  if (e.type === 'run.finished') {
    Object.assign(run, { status: e.ok ? 'ok' : 'failed', durationMs: e.durationMs, error: e.error, verified: e.verified, verdict: e.verdict, outcome: e.status });
    for (const s of run.steps) if (s.status === 'running') s.status = 'failed';
    return;
  }
  const key = `${e.step}#${e.round}`;
  let step = run.steps.find((s) => s.key === key);
  if (e.type === 'step.started') {
    step = { key, step: e.step, round: e.round, agentId: e.agentId, status: 'running', startedAt: e.at, attempts: [] };
    run.steps = [...run.steps.filter((s) => s.key !== key), step];
    return;
  }
  if (!step) return;
  if (e.type === 'step.attempt') {
    step.attempts = [...step.attempts, { attempt: e.attempt, model: e.model, ok: e.ok, issues: e.issues, durationMs: e.durationMs, usage: e.usage }];
  } else {
    Object.assign(step, { status: e.ok ? 'ok' : 'failed', durationMs: e.durationMs, model: e.model, error: e.error, data: e.data });
  }
}

function buildRuns(events: readonly FactoryEvent[]): Run[] {
  const runs = new Map<string, Run>();
  for (const e of events) reduce(runs, e);
  return [...runs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/* ---------- formatting ---------- */

const STEP_LABEL: Record<StepId, string> = { architect: 'Arquitecto', dev: 'Dev', verify: 'Verificador', reviewer: 'Reviewer' };
const stepName = (s: Pick<Step, 'step' | 'round'>) => (s.round > 0 ? `${STEP_LABEL[s.step]} · ronda ${s.round}` : STEP_LABEL[s.step]);
const shortModel = (m?: string) => (m ? m.replace(/:free$/, '').split('/').pop() : '');
const secs = (ms?: number) => (ms === undefined ? '' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`);
const clock = (iso: string) => new Date(iso).toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' });
const statusClass = (s: 'running' | 'ok' | 'failed') => (s === 'running' ? 'run' : s === 'ok' ? 'ok' : 'bad');

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/* ---------- page ---------- */

type Conn = 'checking' | 'login' | 'connecting' | 'live' | 'offline';

export default function Dashboard() {
  const [conn, setConn] = useState<Conn>('checking');
  const [events, setEvents] = useState<FactoryEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const power = usePower(conn !== 'login' && conn !== 'checking');

  useEffect(() => {
    if (conn !== 'checking') return;
    fetch('/api/session').then((r) => setConn(r.ok ? 'connecting' : 'login'), () => setConn('offline'));
  }, [conn]);

  useEffect(() => {
    if (power.stopped || (conn !== 'connecting' && conn !== 'live')) return;
    const source = new EventSource('/api/events');
    source.addEventListener('history', (m) => {
      setEvents(JSON.parse((m as MessageEvent<string>).data) as FactoryEvent[]);
      setConn('live');
    });
    source.onmessage = (m) => setEvents((prev) => [...prev, JSON.parse(m.data) as FactoryEvent]);
    source.onerror = () => setConn((c) => (c === 'live' ? 'connecting' : c));
    return () => source.close();
    // Reconnect only when we go from login/checking to connecting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn === 'login' || conn === 'checking' || conn === 'offline', power.stopped]);

  const runs = useMemo(() => buildRuns(events), [events]);

  // Follow the newest run while the user has not picked another one.
  useEffect(() => {
    if (follow && runs[0] && runs[0].runId !== selected) setSelected(runs[0].runId);
  }, [runs, follow, selected]);

  const run = runs.find((r) => r.runId === selected) ?? runs[0];
  const running = runs.some((r) => r.status === 'running');

  if (conn === 'login') return <Login onDone={() => setConn('connecting')} />;

  return (
    <div className="shell">
      <header className="topbar">
        <h1>HexaBlock · Fábrica de agentes</h1>
        <span className="spacer" />
        <span className="live">
          <span className={`dot ${conn === 'live' ? 'ok' : conn === 'offline' ? 'bad' : 'run'}`} />
          {power.stopped ? 'Apagada' : conn === 'live' ? 'En vivo' : conn === 'offline' ? 'Sin conexión con la fábrica' : 'Conectando…'}
        </span>
      </header>
      <PowerControls power={power} />
      <div className="layout">
        <aside className="sidebar">
          <Launch disabled={power.state?.draining || power.stopped} />
          <ul className="runlist">
            {runs.map((r) => (
              <li key={r.runId}>
                <button
                  className={r.runId === run?.runId ? 'active' : ''}
                  onClick={() => {
                    setSelected(r.runId);
                    setFollow(r.runId === runs[0]?.runId);
                  }}
                >
                  <span className="meta">
                    <span className={`dot ${statusClass(r.status)}`} />
                    {clock(r.startedAt)}
                    {r.source ? <span>· {r.source}</span> : null}
                    {r.outcome === 'ready' ? <span>· listo</span> : r.outcome === 'needs_human' ? <span>· necesita revisión</span> : null}
                  </span>
                  <span className="req">{r.request}</span>
                </button>
              </li>
            ))}
            {runs.length === 0 && conn === 'live' ? <li className="empty">Aún no hay ejecuciones.</li> : null}
          </ul>
        </aside>
        <main className="main">{run ? <RunView run={run} ticking={running} /> : <div className="empty">Lanza una ejecución desde aquí o desde n8n y la verás paso a paso.</div>}</main>
      </div>
    </div>
  );
}

interface PowerState {
  draining: boolean;
  activeRuns: number;
  managed: boolean;
  local: { enabled: boolean; online: boolean; loaded: boolean; model: string };
}

function usePower(enabled: boolean) {
  const [state, setState] = useState<PowerState | null>(null);
  const [stopped, setStopped] = useState(false);
  const draining = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const poll = async () => {
      try {
        const response = await fetch('/api/power', { signal: AbortSignal.timeout(5000), cache: 'no-store' });
        if (!response.ok) return;
        const current = await response.json() as PowerState;
        if (disposed) return;
        draining.current = current.draining;
        setState(current);
        setStopped(false);
      } catch {
        if (!disposed && draining.current) setStopped(true);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => { disposed = true; clearInterval(timer); };
  }, [enabled]);
  async function shutdown() {
    setError('');
    try {
      const response = await fetch('/api/power', { method: 'POST' });
      if (!response.ok) throw new Error('No se pudo solicitar el apagado. Intenta de nuevo.');
      draining.current = true;
      setState(current => current ? { ...current, draining: true } : current);
    } catch (error) { setError((error as Error).message); }
  }
  return { state, stopped, error, shutdown };
}

function PowerControls({ power }: { power: ReturnType<typeof usePower> }) {
  const { state, stopped, error, shutdown } = power;
  return (
    <section className="powerbar" aria-label="Encendido y consumo">
      <div aria-live="polite">
        <strong>{stopped ? 'Fábrica apagada' : state?.draining ? 'Apagando al terminar las corridas' : 'Fábrica encendida'}</strong>
        <p>{stopped ? 'Para volver a encenderla, abre «HexaBlock» en el Escritorio y recarga esta página.'
          : state?.draining ? `${state.activeRuns} corrida(s) activa(s). No se aceptan nuevas solicitudes.`
          : state?.local.enabled ? `Respaldo local: ${state.local.model}. ${!state.local.online ? 'No disponible.' : state.local.loaded ? 'Modelo en memoria; se libera tras 30 s sin uso.' : 'En espera; el modelo no ocupa memoria.'}`
          : 'Al apagar se detiene la fábrica. No vuelve a encenderse hasta que la abras.'}</p>
        {state && !state.managed && !stopped ? <p>Para activar este control, inicia la fábrica desde «HexaBlock» en el Escritorio.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <button onClick={() => void shutdown()} disabled={!state?.managed || state.draining || stopped}>Apagar fábrica</button>
    </section>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    if (res.ok) onDone();
    else setError('Token incorrecto.');
  }
  return (
    <div className="shell">
      <header className="topbar">
        <h1>HexaBlock · Fábrica de agentes</h1>
      </header>
      <form onSubmit={submit} className="card stack" style={{ maxWidth: 420, margin: '40px auto', width: 'calc(100% - 32px)' }}>
        <div>
          <div className="label">Acceso</div>
          <p style={{ margin: '4px 0 0' }}>Pega el FACTORY_TOKEN de tu archivo .env.local. Este navegador lo recordará 30 días.</p>
        </div>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoFocus placeholder="FACTORY_TOKEN" />
        {error ? <div className="error-box">{error}</div> : null}
        <button className="primary" type="submit" disabled={!token}>
          Entrar
        </button>
      </form>
    </div>
  );
}

function Launch({ disabled = false }: { disabled?: boolean }) {
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function launch() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request, source: 'web' }) });
      if (!res.ok && res.status !== 422) setError(((await res.json().catch(() => ({}))) as { message?: string }).message ?? `HTTP ${res.status}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="launch">
      <div className="label">Nueva ejecución</div>
      <textarea rows={3} value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Ej.: Implementa HexGeometry según docs/specs/P2-hex-geometry.md" />
      <button className="primary" onClick={launch} disabled={disabled || busy || request.trim().length < 10}>
        {busy ? 'En curso… (síguela abajo)' : 'Lanzar Arquitecto → Dev'}
      </button>
      {error ? <div className="error-box">{error}</div> : null}
    </div>
  );
}

function RunView({ run, ticking }: { run: Run; ticking: boolean }) {
  const now = useNow(ticking);
  const elapsed = run.durationMs ?? now - new Date(run.startedAt).getTime();
  return (
    <div className="stack">
      <section className="card stack">
        <div className="meta">
          <span className={`chip ${statusClass(run.status)}`}>{run.status === 'running' ? 'En curso' : run.status === 'ok' ? 'Terminada' : 'Falló'}</span>
          <span>{clock(run.startedAt)}</span>
          <span>· {secs(Math.max(0, elapsed))}</span>
          {run.source ? <span>· desde {run.source}</span> : null}
          {run.verified !== undefined ? <span className={`chip ${run.verified ? 'ok' : 'bad'}`}>{run.verified ? 'Compila y pasa los tests' : 'No pasa la verificación'}</span> : null}
          {run.outcome ? <span className={`chip ${run.outcome === 'ready' ? 'ok' : 'bad'}`}>{run.outcome === 'ready' ? 'Listo para aplicar' : 'Necesita revisión humana'}</span> : null}
          {run.verdict ? <span className={`chip ${run.verdict === 'approve' ? 'ok' : 'bad'}`}>Reviewer: {run.verdict === 'approve' ? 'aprueba' : 'pide cambios'}</span> : null}
        </div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{run.request}</div>
        {run.status === 'running' ? <CancelButton runId={run.runId} /> : null}
        <div className="track">
          {run.steps.map((s, i) => (
            <span key={s.key} style={{ display: 'contents' }}>
              {i > 0 ? <span className="arrow">→</span> : null}
              <span className={`chip ${statusClass(s.status)}`}>
                {s.status === 'running' ? <span className="dot run" /> : null}
                {stepName(s)}
              </span>
            </span>
          ))}
        </div>
        {run.error ? <div className="error-box">{run.error}</div> : null}
        <div className="meta">ID {run.runId} · archivos en .runs/{run.runId}/</div>
      </section>
      {run.steps.map((s) => (
        <StepCard key={s.key} step={s} now={now} />
      ))}
    </div>
  );
}

function CancelButton({ runId }: { runId: string }) {
  const [state, setState] = useState<'idle' | 'sent' | 'gone'>('idle');
  async function cancel() {
    if (!window.confirm('¿Cancelar esta ejecución? Se detiene el paso actual y no se entrega parche.')) return;
    const res = await fetch(`/api/runs/${runId}/cancel`, { method: 'POST' });
    setState(res.ok ? 'sent' : 'gone');
  }
  return (
    <div>
      <button onClick={cancel} disabled={state !== 'idle'}>
        {state === 'idle' ? 'Cancelar ejecución' : state === 'sent' ? 'Cancelando…' : 'Ya no está en curso'}
      </button>
    </div>
  );
}

function StepCard({ step, now }: { step: Step; now: number }) {
  const elapsed = step.durationMs ?? now - new Date(step.startedAt).getTime();
  return (
    <section className="card">
      <div className="step-head">
        <span className={`dot ${statusClass(step.status)}`} />
        <h3>{stepName(step)}</h3>
        <span className="meta">
          {step.model ? <span>{shortModel(step.model)}</span> : null}
          <span>· {secs(Math.max(0, elapsed))}</span>
          {step.status === 'running' ? <span>· {step.step === 'verify' ? 'corriendo tsc, jest y lint…' : 'esperando al modelo…'}</span> : null}
        </span>
      </div>
      {step.attempts.length > 0 ? (
        <ul className="attempts">
          {step.attempts.map((a) => (
            <li key={a.attempt}>
              <span className={`chip ${a.ok ? 'ok' : 'bad'}`}>{a.attempt === 1 ? 'Respuesta' : `Reparación ${a.attempt - 1}`}</span>
              <span className="meta">
                {shortModel(a.model)} · {secs(a.durationMs)}
                {a.usage ? ` · ${a.usage.promptTokens.toLocaleString()} → ${a.usage.completionTokens.toLocaleString()} tokens` : ''}
              </span>
              {a.issues ? <span className="issues">{a.issues}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {step.error ? <div className="error-box" style={{ marginTop: 8 }}>{step.error}</div> : null}
      {step.status !== 'running' && step.data !== undefined ? <StepData step={step} /> : null}
    </section>
  );
}

function StepData({ step }: { step: Step }) {
  if (step.step === 'architect') return <SpecView spec={step.data as Spec} />;
  if (step.step === 'dev') return <PatchView patch={step.data as Patch} />;
  if (step.step === 'verify') return <VerifyView report={step.data as VerifyReport} />;
  return <ReviewView review={step.data as Review} />;
}

interface Spec {
  id: string;
  title: string;
  module: string;
  goal: string;
  interfaces: Array<{ file: string; name: string; status: string; signature: string }>;
  acceptanceTests: string[];
}
interface Patch {
  files: Array<{ path: string; action: string; content: string }>;
  notes: string;
  assumptions: string[];
}
interface Review {
  verdict: string;
  summary: string;
  findings: Array<{ severity: string; file: string; rule: string; message: string; suggestion: string }>;
}

function SpecView({ spec }: { spec: Spec }) {
  return (
    <div className="stack" style={{ marginTop: 10 }}>
      <div>
        <strong>{spec.id}</strong> · {spec.title} · <code>{spec.module}</code>
        <div className="meta">{spec.goal}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Nombre</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {spec.interfaces.map((i) => (
            <tr key={`${i.file}:${i.name}`}>
              <td><code>{i.file}</code></td>
              <td title={i.signature}>{i.name}</td>
              <td>{i.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details>
        <summary>{spec.acceptanceTests.length} tests de aceptación · spec completo</summary>
        <pre>{JSON.stringify(spec, null, 2)}</pre>
      </details>
    </div>
  );
}

function PatchView({ patch }: { patch: Patch }) {
  return (
    <div className="files">
      {patch.files.map((f) => (
        <details key={f.path}>
          <summary>
            <span className={`chip ${f.action === 'create' ? 'ok' : 'run'}`}>{f.action === 'create' ? 'nuevo' : 'modifica'}</span> <code>{f.path}</code>
          </summary>
          <pre>{f.content}</pre>
        </details>
      ))}
      {patch.notes ? <div className="meta">{patch.notes}</div> : null}
    </div>
  );
}

function VerifyView({ report }: { report: VerifyReport }) {
  return (
    <div className="files">
      {report.checks.map((c) => (
        <details key={c.name} open={!c.ok}>
          <summary>
            <span className={`chip ${c.ok ? 'ok' : 'bad'}`}>{c.ok ? 'OK' : 'Falla'}</span> <code>{c.name}</code> <span className="dim">· {secs(c.durationMs)}</span>
          </summary>
          {c.output ? <pre>{c.output}</pre> : null}
        </details>
      ))}
    </div>
  );
}

function ReviewView({ review }: { review: Review }) {
  return (
    <div className="stack" style={{ marginTop: 10 }}>
      <div>
        <span className={`chip ${review.verdict === 'approve' ? 'ok' : 'bad'}`}>{review.verdict === 'approve' ? 'Aprueba' : 'Pide cambios'}</span> {review.summary}
      </div>
      {review.findings.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Gravedad</th>
              <th>Archivo</th>
              <th>Hallazgo</th>
            </tr>
          </thead>
          <tbody>
            {review.findings.map((f, i) => (
              <tr key={i}>
                <td><span className={`chip ${f.severity === 'minor' ? 'run' : 'bad'}`}>{f.severity}</span></td>
                <td><code>{f.file}</code></td>
                <td>
                  {f.message}
                  {f.suggestion ? <div className="meta">→ {f.suggestion}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
