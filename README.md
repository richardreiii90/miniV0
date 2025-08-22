# mini-v0-gpt5-vercel

Un panel simple para:
- Pedirle a GPT que **proponga parches** (crear/editar/borrar archivos).
- Ver **diffs** con Monaco.
- **Aplicar** los cambios en un **branch + PR** en GitHub (Octokit).
- Obtener **Preview Deploy** automático en Vercel para el PR.
- **Deploy a producción** con un Deploy Hook (opcional) o merge del PR.

> Usa tu propia clave de OpenAI (barato) y evita consumir créditos de V0.  
> Funciona con `gpt-4o-mini` por defecto. Si tenés acceso, podés usar `OPENAI_MODEL=gpt-5-thinking`.

## Pasos rápidos

1. **Crear repo GitHub** y subir este proyecto.
2. En **Vercel**, crear un proyecto desde ese repo.
3. En **Vercel → Settings → Environment Variables**, setear:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (opcional, p.ej. `gpt-5-thinking` o `gpt-4o-mini`)
   - `GITHUB_TOKEN` (fine‑grained, sólo para ese repo: `contents:write` y `pull_requests:write`)
   - `VERCEL_DEPLOY_HOOK_URL` (opcional; crear en Project Settings → Deploy Hooks)
4. **Deploy** en Vercel.
5. Abrí la app. En "Settings" completa `owner`, `repo` y rama base (`main` o la que uses). Hacé **Fetch Tree**.
6. Escribí tu pedido en el prompt. Tocá **Generate Plan**.
7. Revisá diffs por archivo. Destildá lo que no quieras.
8. Dale a **Apply Selected (PR)** → se crea un PR y un link de **Preview**.
9. Si te gusta: merge del PR (deploy a prod) o botón **Deploy to Prod** si configuraste el deploy hook.

## Local
```bash
pnpm i # o npm i / yarn
pnpm dev
# abrir http://localhost:3000
```
