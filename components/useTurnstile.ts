'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile, rendered explicitly.
 *
 * 🔑 **The site key is public and belongs in `NEXT_PUBLIC_*`.** That is the one kind of value the
 * build-time-inlining rule is fine with — it is printed into the widget's own markup and visible to
 * every visitor by design. The SECRET is a different value entirely and lives only in the probe
 * (see `packages/guard/src/turnstile.ts`): the site never holds it and never verifies anything,
 * because a `turnstileOk: true` forwarded across the Docker network is a forgeable claim.
 *
 * ⚙️ **Explicit rendering, not the auto `.cf-turnstile` class.** Auto-rendering scans the DOM once
 * on script load, which races React and silently renders nothing when the component mounts later.
 *
 * 🔁 **A token is single-use and expires.** Cloudflare invalidates it once redeemed, so the widget
 * is reset after every submission — otherwise the second check of a session always fails with a
 * stale token, which looks exactly like a broken tool.
 *
 * 🚧 **Unconfigured is a supported state, not an error.** With no site key the hook reports
 * `ready` and hands back an empty token, so local development and the test suite need no
 * Cloudflare account. The probe applies the mirror-image rule: no secret configured, no
 * verification. Both halves have to agree, or one environment silently rejects every request.
 */

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
    },
  ) => string;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('no-document'));
    if (window.turnstile) return resolve();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('script-failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('script-failed')), { once: true });
    document.head.appendChild(script);
  });
}

export type TurnstileState = 'unconfigured' | 'loading' | 'ready' | 'failed';

export function useTurnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [state, setState] = useState<TurnstileState>(siteKey ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        // Guard against React 18 strict-mode's double effect invocation rendering two widgets.
        if (widgetIdRef.current !== null) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (value) => {
            setToken(value);
            setState('ready');
          },
          'expired-callback': () => {
            setToken('');
            setState('loading');
          },
          'error-callback': () => {
            setToken('');
            setState('failed');
          },
        });
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  /** Call after each submission — a redeemed token is dead and must not be sent twice. */
  const reset = useCallback(() => {
    setToken('');
    if (!siteKey) return;
    if (window.turnstile && widgetIdRef.current !== null) {
      window.turnstile.reset(widgetIdRef.current);
      setState('loading');
    }
  }, [siteKey]);

  return {
    containerRef,
    token,
    state,
    reset,
    /** True when the widget is configured and still owes us a token. */
    blocking: state === 'loading',
  };
}
