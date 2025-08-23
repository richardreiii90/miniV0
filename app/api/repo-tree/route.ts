import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(req: Request) {
  try {
    const { owner, repo, base='main' } = await req.json();
    if (!owner || !repo) return NextResponse.json({ error: 'owner/repo requeridos' }, { status: 400 });
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const ref = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
      owner, repo, ref: `heads/${base}`
    });
    const sha = (ref.data as any).object.sha;

    const tree = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
      owner, repo, tree_sha: sha, recursive: '1' as any
    });

    const files = (tree.data.tree || []).filter((n:any) => n.type === 'blob').map((n:any) => n.path);
    const first = files.slice(0, 500);
    const summary = `Branch: ${base}\nFiles (${files.length}):\n` + first.join('\n');

    return NextResponse.json({ summary });
  } catch (err:any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
