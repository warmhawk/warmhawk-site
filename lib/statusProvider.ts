import type { CheckStatus } from '@/components/CheckBadge';

/**
 * Pluggable status-check abstraction for the /status page, wired to a
 * self-hosted Uptime Kuma instance — not a third-party SaaS status provider.
 * Speaks Uptime Kuma's real public status-page API directly:
 *
 *   GET {STATUS_KUMA_BASE_URL}/api/status-page/{STATUS_KUMA_SLUG}
 *     -> { publicGroupList: [{ monitorList: [{ id, name, type }] }] }
 *   GET {STATUS_KUMA_BASE_URL}/api/status-page/heartbeat/{STATUS_KUMA_SLUG}
 *     -> { heartbeatList: { "<monitorId>": [{status, time, msg, ping}] }, uptimeList: {...} }
 *
 * Monitor -> component matching is by exact (case-insensitive) name match
 * against STATUS_COMPONENTS[].label below — create two monitors in Kuma
 * named exactly "Marketing site" and "Stripe webhook / license issuance"
 * (or edit the labels here to match whatever you actually name them),
 * add both to one public status page, and put that page's slug in
 * STATUS_KUMA_SLUG.
 *
 * Until both STATUS_KUMA_BASE_URL and STATUS_KUMA_SLUG are set, every
 * component honestly reports "unconfigured" rather than a fabricated pass.
 */

export interface StatusComponentDef {
  key: string;
  label: string;
  sublabel: string;
}

export const STATUS_COMPONENTS: StatusComponentDef[] = [
  { key: 'marketing-site', label: 'Marketing site', sublabel: 'warmhawk.com itself' },
  {
    key: 'stripe-webhook',
    label: 'Stripe webhook / license issuance',
    sublabel: 'Checkout → webhook → license-key delivery path',
  },
];

export interface StatusComponentResult {
  key: string;
  status: CheckStatus;
  detail: string;
}

/** Uptime Kuma heartbeat status codes, per Kuma's own convention. */
const KUMA_STATUS_DOWN = 0;
const KUMA_STATUS_UP = 1;
const KUMA_STATUS_PENDING = 2;
const KUMA_STATUS_MAINTENANCE = 3;

interface KumaMonitor {
  id: number;
  name: string;
}

interface KumaMonitorGroup {
  monitorList: KumaMonitor[];
}

interface KumaStatusPageConfigResponse {
  publicGroupList: KumaMonitorGroup[];
}

interface KumaHeartbeat {
  status: number;
  time: string;
  msg: string;
  ping: number | null;
}

interface KumaHeartbeatResponse {
  heartbeatList: Record<string, KumaHeartbeat[]>;
}

function isKumaStatusPageConfigResponse(value: unknown): value is KumaStatusPageConfigResponse {
  if (!value || typeof value !== 'object') return false;
  const groupList = (value as Record<string, unknown>).publicGroupList;
  if (!Array.isArray(groupList)) return false;
  return groupList.every((group) => {
    if (!group || typeof group !== 'object') return false;
    const monitorList = (group as Record<string, unknown>).monitorList;
    if (!Array.isArray(monitorList)) return false;
    return monitorList.every(
      (monitor) =>
        !!monitor &&
        typeof monitor === 'object' &&
        typeof (monitor as Record<string, unknown>).id === 'number' &&
        typeof (monitor as Record<string, unknown>).name === 'string',
    );
  });
}

function isKumaHeartbeatResponse(value: unknown): value is KumaHeartbeatResponse {
  if (!value || typeof value !== 'object') return false;
  const heartbeatList = (value as Record<string, unknown>).heartbeatList;
  return !!heartbeatList && typeof heartbeatList === 'object';
}

function kumaStatusToCheckStatus(status: number): CheckStatus {
  if (status === KUMA_STATUS_UP) return 'pass';
  if (status === KUMA_STATUS_DOWN) return 'fail';
  if (status === KUMA_STATUS_PENDING || status === KUMA_STATUS_MAINTENANCE) return 'pending';
  return 'pending';
}

function unconfiguredResults(): StatusComponentResult[] {
  return STATUS_COMPONENTS.map((component) => ({
    key: component.key,
    status: 'unconfigured',
    detail: 'Status monitoring not yet configured.',
  }));
}

function pendingResults(detail: string): StatusComponentResult[] {
  return STATUS_COMPONENTS.map((component) => ({
    key: component.key,
    status: 'pending',
    detail,
  }));
}

/**
 * Fetches live component status from a self-hosted Uptime Kuma instance, if
 * configured. Never throws: unset env vars, an unreachable instance, or an
 * unexpected response shape all degrade to an honest non-"pass" state rather
 * than a fabricated success badge.
 */
export async function getStatusChecks(): Promise<StatusComponentResult[]> {
  const baseUrl = process.env.STATUS_KUMA_BASE_URL;
  const slug = process.env.STATUS_KUMA_SLUG;

  if (!baseUrl || !slug) {
    return unconfiguredResults();
  }

  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const fetchOpts = { headers: { Accept: 'application/json' }, next: { revalidate: 300 } } as const;

  let configRes: Response;
  let heartbeatRes: Response;
  try {
    [configRes, heartbeatRes] = await Promise.all([
      fetch(`${trimmedBase}/api/status-page/${encodeURIComponent(slug)}`, fetchOpts),
      fetch(`${trimmedBase}/api/status-page/heartbeat/${encodeURIComponent(slug)}`, fetchOpts),
    ]);
  } catch {
    return pendingResults("Couldn't reach the status provider.");
  }

  if (!configRes.ok || !heartbeatRes.ok) {
    return pendingResults('Status provider returned an unexpected response.');
  }

  let configData: unknown;
  let heartbeatData: unknown;
  try {
    [configData, heartbeatData] = await Promise.all([configRes.json(), heartbeatRes.json()]);
  } catch {
    return pendingResults('Status provider returned an unreadable response.');
  }

  if (!isKumaStatusPageConfigResponse(configData) || !isKumaHeartbeatResponse(heartbeatData)) {
    return pendingResults('Status provider returned an unexpected response shape.');
  }

  const monitorIdByName = new Map<string, number>();
  for (const group of configData.publicGroupList) {
    for (const monitor of group.monitorList) {
      monitorIdByName.set(monitor.name.trim().toLowerCase(), monitor.id);
    }
  }

  return STATUS_COMPONENTS.map((component) => {
    const monitorId = monitorIdByName.get(component.label.trim().toLowerCase());
    if (monitorId === undefined) {
      return {
        key: component.key,
        status: 'pending',
        detail: `No Kuma monitor named "${component.label}" found on this status page.`,
      };
    }

    const beats = heartbeatData.heartbeatList[String(monitorId)];
    const latest = beats && beats.length > 0 ? beats[beats.length - 1] : undefined;
    if (!latest) {
      return {
        key: component.key,
        status: 'pending',
        detail: 'No heartbeat data reported yet for this component.',
      };
    }

    return {
      key: component.key,
      status: kumaStatusToCheckStatus(latest.status),
      detail: latest.msg?.trim() ? latest.msg : `Last check: ${latest.time}`,
    };
  });
}
