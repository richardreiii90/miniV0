import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(req: Request) {
  try {
    const { owner, repo, ref='main', path } = await req.json();
    if (!owner || !repo || !path) return NextResponse.json({ error: 'owner/repo/path requeridos' }, { status: 400 });
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const r = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { owner, repo, path, ref });
    const data:any = r.data;
    if (!data || !data.content) return NextResponse.json({ content: '' });
    const buff = Buffer.from(data.content, 'base64');
    return NextResponse.json({ content: buff.toString('utf-8') });
  } catch (err:any) {
    return NextResponse.json({ content: '' });
  }
}
