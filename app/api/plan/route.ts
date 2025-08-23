import { NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';

const PatchSchema = z.object({
  path: z.string(),
  op: z.enum(['create','update','delete']),
  content: z.string().optional()
});

const PlanSchema = z.object({
  summary: z.string(),
  patches: z.array(PatchSchema).default([])
});

export async function POST(req: Request) {
  try {
    const { prompt, repoTree } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'prompt requerido' }, { status: 400 });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const system = [
      'You are an expert code editor for a Next.js (App Router) repository.',
      'Your job: propose minimal, safe patches to implement the user task.',
      'Rules:',
      '- Return ONLY a JSON object with keys "summary" and "patches".',
      '- Prefer small, focused changes; avoid refactors unless required.',
      '- If creating files, include complete content.',
      '- If updating files, include the full new content of the file.',
      '- Use TypeScript for API routes and React components.',
      '- Never invent secrets; read them from process.env.',
      '- Ensure the project still builds.'
    ].join('\n');

    const user = [
      `Repository tree (may be partial):`,
      repoTree || '(no tree provided)',
      '',
      'Task:',
      prompt,
      '',
      'Return JSON strictly matching:',
      `{
        "summary": string,
        "patches": [
          { "path": string, "op": "create"|"update"|"delete", "content"?: string }
        ]
      }`
    ].join('\n');

    // Podés usar Responses API si tu cuenta lo permite; acá usamos chat completions por compatibilidad.
    const completion = await client.chat.completions.create({
      model: modelName,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    });

    const raw = completion.choices[0]?.message?.content || '';
    // Intento robusto de parseo JSON
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: 'La respuesta no contiene JSON' }, { status: 500 });
    }
    const sliced = raw.slice(jsonStart, jsonEnd + 1);

    let parsed: unknown;
    try {
      parsed = JSON.parse(sliced);
    } catch (e) {
      // Algunos modelos devuelven comillas incorrectas; intentamos arreglar
      const fixed = sliced
        .replace(/[\u201C\u201D]/g, '"')  // comillas tipográficas
        .replace(/,\s*}/g, '}')          // trailing commas
        .replace(/,\s*]/g, ']');
      parsed = JSON.parse(fixed);
    }

    const object = PlanSchema.parse(parsed);
    return NextResponse.json(object);
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
