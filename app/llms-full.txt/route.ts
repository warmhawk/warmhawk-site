import { NextResponse } from 'next/server';
import { buildLlmsFullTxt } from '@/lib/llmsTxt';

/** See lib/llmsTxt.ts's buildLlmsFullTxt() for the content and the
 * rationale — the llms.txt convention's "full" companion file, with real
 * FAQ answer text inlined rather than just links out to it. */
export async function GET() {
  return new NextResponse(buildLlmsFullTxt(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
