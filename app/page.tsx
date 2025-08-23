'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

type Patch = { path: string; op: 'create'|'update'|'delete'; content?: string };
type Plan = { summary: string; patches: Patch[] };

const DiffEditor = dynamic(() => import('@monaco-editor/react').then(m => m.DiffEditor), { ssr: false });

export default function Home() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [base, setBase] = useState('main');
  const [tree, setTree] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function fetchTree() {
    setLoading(true); setMsg('');
    const r = await fetch('/api/repo-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, base })
    });
    const data = await r.json();
    setTree(data.summary || '');
    setMsg(data.error ? 'Error: ' + data.error : 'OK: Tree fetched');
    setLoading(false);
  }

  async function generatePlan() {
    setLoading(true); setMsg('');
    const r = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, repoTree: tree })
    });
    if (!r.ok) {
      setMsg('Error al generar plan');
      setLoading(false);
      return;
    }
    const data = await r.json();
    setPlan(data);
    const sel: Record<string, boolean> = {};
    data.patches?.forEach((p: Patch, idx: number) => sel[`${idx}:${p.path}`] = true);
    setSelected(sel);
    setLoading(false);
  }

  async function fetchOriginal(path: string) {
    try {
      const r = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, ref: base, path })
      });
      if (!r.ok) return '';
      const data = await r.json();
      return data.content || '';
    } catch { return ''; }
  }

  async function applySelected() {
    if (!plan) return;
    setLoading(true); setMsg('');
    const patches = await Promise.all(plan.patches.map(async (p, idx) => {
      const key = `${idx}:${p.path}`;
      if (!selected[key]) return null;
      return p;
    }));
    const filtered = patches.filter(Boolean);
    const r = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, base, patches: filtered })
    });
    const data = await r.json();
    setMsg(data.prUrl ? `PR creado: ${data.prUrl}` : (data.error || 'Listo'));
    setLoading(false);
  }

  async function deployProd() {
    setLoading(true); setMsg('');
    const r = await fetch('/api/deploy', { method: 'POST' });
    const data = await r.json();
    setMsg(data.ok ? 'Deploy hook disparado' : `Error deploy: ${data.text || ''}`);
    setLoading(false);
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>mini‑V0 con GPT: parches + PR + deploy</h1>
      <p style={{ opacity: .8, marginBottom: 24 }}>Configura tu repo, generá un plan de cambios, revisá diffs y aplicá en un PR con Preview de Vercel.</p>

      <section style={card}>
        <h2 style={h2}>Settings</h2>
        <div style={grid2}>
          <label>Owner<br/><input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="miusuarioorg" style={input}/></label>
          <label>Repo<br/><input value={repo} onChange={e=>setRepo(e.target.value)} placeholder="mi-repo" style={input}/></label>
        </div>
        <div style={{display:'flex', gap:12, marginTop:12}}>
          <label>Base branch<br/><input value={base} onChange={e=>setBase(e.target.value)} placeholder="main" style={input}/></label>
          <button onClick={fetchTree} style={btn} disabled={loading || !owner || !repo}>Fetch tree</button>
        </div>
        <textarea value={tree} onChange={e=>setTree(e.target.value)} placeholder="Repo tree summary..." rows={8} style={textarea}/>
      </section>

      <section style={card}>
        <h2 style={h2}>Prompt</h2>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={6} placeholder="Ej: Cambiá el color del botón primario y agregá endpoint /api/health que devuelva {ok:true}..." style={textarea}/>
        <div style={{display:'flex', gap:12, marginTop:12}}>
          <button onClick={generatePlan} style={btn} disabled={loading || !prompt}>Generate Plan</button>
          <button onClick={applySelected} style={btn} disabled={loading || !plan}>Apply Selected (PR)</button>
          <button onClick={deployProd} style={btnAlt} disabled={loading}>Deploy to Prod (hook)</button>
        </div>
        {!!msg && <div style={{marginTop:12, opacity:.9}}>{msg}</div>}
      </section>

      {plan && (
        <section style={card}>
          <h2 style={h2}>Plan</h2>
          <p style={{whiteSpace:'pre-wrap'}}>{plan.summary}</p>
          <div style={{display:'flex', flexDirection:'column', gap:24, marginTop:12}}>
            {plan.patches.map((p, idx) => (
              <PatchViewer key={idx} idx={idx} p={p} owner={owner} repo={repo} base={base}
                selected={selected} setSelected={setSelected} fetchOriginal={fetchOriginal}/>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PatchViewer({ idx, p, owner, repo, base, selected, setSelected, fetchOriginal }:
  { idx:number, p:Patch, owner:string, repo:string, base:string,
    selected:Record<string, boolean>, setSelected: (s:Record<string, boolean>)=>void,
    fetchOriginal: (path:string)=>Promise<string> }) {

  const key = `${idx}:${p.path}`;
  const [orig, setOrig] = useState<string>('');
  const [target, setTarget] = useState<string>(p.content || '');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (p.op === 'update') {
        const o = await fetchOriginal(p.path);
        if (mounted) setOrig(o || '');
      } else {
        setOrig('');
      }
    })();
    return () => { mounted = false; }
  }, [p.path, p.op, owner, repo, base]);

  return (
    <div>
      <label style={{display:'flex', alignItems:'center', gap:8}}>
        <input type="checkbox" checked={!!selected[key]} onChange={e=>setSelected({ ...selected, [key]: e.target.checked })} />
        <code>{p.op.toUpperCase()}</code> — <strong>{p.path}</strong>
      </label>
      {p.op !== 'delete' ? (
        <div style={{ height: 400, marginTop: 8, border: '1px solid #2a2a2c' }}>
          <DiffEditor
            original={orig}
            modified={target}
            language={guessLang(p.path)}
            theme="vs-dark"
            options={{ renderSideBySide: true, fontSize: 13, readOnly: false, minimap: { enabled: false } }}
            onMount={(editor, monaco)=>{}}
            onChange={(v)=> setTarget(v || '')}
          />
        </div>
      ) : (
        <div style={{opacity:.8, marginTop:8}}>El archivo será eliminado.</div>
      )}
    </div>
  )
}

function guessLang(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.html')) return 'html';
  return 'plaintext';
}

const card: React.CSSProperties = { background:'#121214', border:'1px solid #1e1e20', borderRadius:16, padding:16, marginBottom:16, boxShadow:'0 1px 0 #1a1a1c inset' };
const h2: React.CSSProperties = { fontSize:18, margin:'0 0 8px' };
const input: React.CSSProperties = { width:260, background:'#0f0f11', color:'#eee', border:'1px solid #27272a', borderRadius:10, padding:'8px 10px' };
const textarea: React.CSSProperties = { width:'100%', background:'#0f0f11', color:'#eee', border:'1px solid #27272a', borderRadius:12, padding:'10px', minHeight:120 };
const btn: React.CSSProperties = { background:'#2563eb', color:'#fff', border:'0', padding:'10px 14px', borderRadius:10, cursor:'pointer' };
const btnAlt: React.CSSProperties = { background:'#10b981', color:'#0d0d0e', border:'0', padding:'10px 14px', borderRadius:10, cursor:'pointer' };
