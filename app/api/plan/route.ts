import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

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
    if (!prompt) return NextResponse.json({ error: 'prompt requerido' }, { status: 400 });

    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const model = openai(modelName);

    const system = [
      'You are an expert code editor for a Next.js (App Router) repository.',
      'Your job: propose minimal, safe patches to implement the user task.',
      'Important rules:',
      '- Return ONLY the JSON object defined by the schema. No extra text.',
      '- Prefer small, focused changes; avoid refactors unless required.',
      '- If creating files, include complete content.',
      '- If updating files, include the full new content for that file.',
      '- Use TypeScript for API routes and React components.',
      '- Never invent secrets; read them from process.env.',
      '- Ensure the project still builds.'
    ].join('\n');

    const { object } = await generateObject({
      model,
      system,
      prompt: `Repository tree (may be partial):\n${repoTree || '(no tree provided)'}\n\nTask:\n${prompt}`,
      schema: PlanSchema,
    });

    return NextResponse.json(object);
  } catch (err:any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
