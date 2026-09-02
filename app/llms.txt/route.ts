import { NextResponse } from 'next/server';
import { buildLlmsTxt } from '@/lib/llmsTxt';

/** See lib/llmsTxt.ts for the content and the rationale for building it
 * dynamically rather than hand-maintaining a static file. */
export async function GET() {
  return new NextResponse(buildLlmsTxt(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
