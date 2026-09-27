import { NextResponse } from 'next/server';
import { connectClients } from '@/lib/connect';

/**
 * Public WarmHawk Connect client IDs (see lib/connect.ts). The dashboard shows the Google one on
 * the "trust WarmHawk once" card a Workspace admin copies into admin.google.com, and builds the
 * Microsoft admin-consent link from the other. Client IDs are public by design; secrets never
 * appear here. `null` means Connect is off for that provider.
 */

// Read env per request, not once at build time.
export const dynamic = 'force-dynamic';

export async function GET() {
  const clients = connectClients();
  return NextResponse.json(
    {
      google: clients.google ? { clientId: clients.google.clientId } : null,
      microsoft: clients.microsoft ? { clientId: clients.microsoft.clientId } : null,
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
