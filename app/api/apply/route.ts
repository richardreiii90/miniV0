import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

type Patch = { path: string; op: 'create'|'update'|'delete'; content?: string };

export async function POST(req: Request) {
  try {
    const { owner, repo, base='main', patches=[] } = await req.json() as { owner:string, repo:string, base?:string, patches: Patch[] };
    if (!owner || !repo) return NextResponse.json({ error: 'owner/repo requeridos' }, { status: 400 });
    if (!Array.isArray(patches) || patches.length === 0) return NextResponse.json({ error: 'sin parches' }, { status: 400 });

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 1) get base SHA
    const baseRef = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
      owner, repo, ref: `heads/${base}`
    });
    const baseSha = (baseRef.data as any).object.sha;
    const branch = `ai/${Date.now()}`;

    // 2) create branch
    await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
      owner, repo, ref: `refs/heads/${branch}`, sha: baseSha
    });

    // 3) apply patches (create/update/delete)
    for (const p of patches as Patch[]) {
      if (p.op === 'delete') {
        const f = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { owner, repo, path: p.path, ref: branch });
        const sha = (f.data as any).sha;
        await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', {
          owner, repo, path: p.path, message: `chore: delete ${p.path}`, sha, branch
        });
      } else {
        const contentB64 = Buffer.from(p.content || '', 'utf-8').toString('base64');
        let sha: string | undefined = undefined;
        try {
          const f = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { owner, repo, path: p.path, ref: branch });
          sha = (f.data as any).sha;
        } catch {}
        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
          owner, repo, path: p.path, message: `${sha ? 'feat: update' : 'feat: create'} ${p.path}`, content: contentB64, branch, sha
        });
      }
    }

    // 4) open PR
    const pr = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
      owner, repo, head: branch, base, title: 'AI change proposal', body: 'Proposed by mini‑V0'
    });

    return NextResponse.json({ prUrl: pr.data.html_url });
  } catch (err:any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
