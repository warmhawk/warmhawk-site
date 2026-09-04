import { describe, it, expect, vi, afterEach } from 'vitest';
import { isCustomerEntitled } from './stripeEntitlement';

const subscriptionsListMock = vi.fn();

vi.mock('./stripe', () => ({
  getStripeClient: () => ({ subscriptions: { list: subscriptionsListMock } }),
}));

function subscription(status: string) {
  return { id: `sub_${status}`, status };
}

describe('isCustomerEntitled', () => {
  afterEach(() => {
    subscriptionsListMock.mockReset();
    vi.restoreAllMocks();
  });

  it.each(['active', 'trialing', 'past_due'])(
    'returns true when the customer has a %s subscription',
    async (status) => {
      subscriptionsListMock.mockResolvedValue({ data: [subscription(status)] });
      await expect(isCustomerEntitled('cus_123')).resolves.toBe(true);
    },
  );

  it.each(['canceled', 'unpaid', 'incomplete_expired'])(
    'returns false when every subscription is %s',
    async (status) => {
      subscriptionsListMock.mockResolvedValue({ data: [subscription(status)] });
      await expect(isCustomerEntitled('cus_123')).resolves.toBe(false);
    },
  );

  it('returns false when the customer has no subscriptions at all', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [] });
    await expect(isCustomerEntitled('cus_123')).resolves.toBe(false);
  });

  it('returns true if at least one of several subscriptions is entitling', async () => {
    subscriptionsListMock.mockResolvedValue({
      data: [subscription('canceled'), subscription('active')],
    });
    await expect(isCustomerEntitled('cus_123')).resolves.toBe(true);
  });

  it('fails open (returns true) when the Stripe lookup itself errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    subscriptionsListMock.mockRejectedValue(new Error('Stripe is down'));
    await expect(isCustomerEntitled('cus_123')).resolves.toBe(true);
  });

  it('passes the customer id and requests every status', async () => {
    subscriptionsListMock.mockResolvedValue({ data: [subscription('active')] });
    await isCustomerEntitled('cus_specific');
    expect(subscriptionsListMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_specific', status: 'all' }),
    );
  });
});
