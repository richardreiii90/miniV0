# mini-v0-gpt5-vercel (OpenAI SDK)

- Chat que propone **parches** (create/update/delete) como JSON.
- **Diff** por archivo con Monaco.
- **Apply**: branch + commits + **PR** (Octokit). Vercel crea **Preview Deploy** automático.
- **Deploy a prod** por merge o **Deploy Hook**.

## Setup
1. Subí este proyecto a tu repo (o reemplazá contenido).
2. En Vercel, importá el repo.
3. Variables de entorno: `OPENAI_API_KEY`, `OPENAI_MODEL` (opcional), `GITHUB_TOKEN`, `VERCEL_DEPLOY_HOOK_URL` (opcional).
4. Deploy e ingresá a la app.

## Uso
- Settings: owner, repo, base → **Fetch tree**.
- Prompt → **Generate Plan**.
- Revisá diffs → **Apply Selected (PR)**.
- Preview en el PR. Para prod: merge o **Deploy to Prod** (si configuraste el hook).
