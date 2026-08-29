// Re-exports the shared Resend-polling helper from tests/integration/resendEmail.ts —
// checkout-and-license.spec.ts needs the exact same "poll Resend's API for a just-sent email"
// logic that app/api/stripe/webhook/route.integration.test.ts already uses; kept as one
// implementation rather than two copies of the same polling/retry logic drifting apart.
export {
  waitForResendEmail,
  type ResendEmailRecord,
  type WaitForResendEmailInput,
} from '../integration/resendEmail';
