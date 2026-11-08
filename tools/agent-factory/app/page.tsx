'use client';

import { useState } from 'react';

export default function Home() {
  const [request, setRequest] = useState('Implement HexGeometry (distance, neighbours, rotation) and HexBoard<TCell> as described in docs/specs/P2-hex-geometry.md.');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setResult('Running Architect -> Dev on free models (can take 1-3 minutes)...');
    try {
      const res = await fetch('/api/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request }) });
      setResult(JSON.stringify(await res.json(), null, 2));
    } catch (e) {
      setResult(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>HexaBlock Agent Factory</h1>
      <p>Architect (agent 1) writes a spec; Dev (agent 2) implements it inside the spec&apos;s module. Output is a patch for a human to review.</p>
      <textarea value={request} onChange={(e) => setRequest(e.target.value)} rows={6} style={{ width: '100%', boxSizing: 'border-box' }} />
      <button onClick={run} disabled={busy} style={{ marginTop: 8 }}>{busy ? 'Running…' : 'Run pipeline'}</button>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: 12, marginTop: 16 }}>{result}</pre>
    </main>
  );
}
