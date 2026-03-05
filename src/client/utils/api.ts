import {
  CreateBagRequest,
  CreateBagResponse,
  FinderPageData,
  StartConversationRequest,
  ApiError,
  DashboardData,
} from '../types/index.js';

const API_BASE = '/api';

class ApiClient {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.data as T;
  }

  private setCached(key: string, data: unknown, ttlMs: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  private invalidate(...keys: string[]): void {
    keys.forEach((k) => this.cache.delete(k));
  }

  invalidatePlan(): void {
    this.invalidate('plan');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let data: T | ApiError;
    try {
      if (isJson) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = {
            error:
              response.status === 429
                ? 'Rate limit exceeded'
                : 'An error occurred',
            message:
              response.status === 429
                ? 'Rate limit exceeded. Please try again later.'
                : response.status >= 500
                  ? 'Server error. Please try again later.'
                  : 'An unexpected error occurred',
          };
        }
      }
    } catch {
      data = {
        error: 'Response parsing failed',
        message: 'Unable to parse server response',
      };
    }

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(error.message || 'An error occurred');
    }

    return data as T;
  }

  async createBag(bagData: CreateBagRequest): Promise<CreateBagResponse> {
    const result = await this.request<CreateBagResponse>('/bags', {
      method: 'POST',
      body: JSON.stringify(bagData),
    });
    this.invalidate('dashboard');
    return result;
  }

  async getFinderPageData(shortId: string): Promise<FinderPageData> {
    return this.request<FinderPageData>(`/bags/${shortId}`);
  }

  async startConversation(
    shortId: string,
    messageData: StartConversationRequest
  ): Promise<{
    success: boolean;
    data: { conversation_id: string; message: string };
  }> {
    return this.request(`/bags/${shortId}/conversations`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async resolveConversation(
    conversationId: string,
    token: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/conversations/${conversationId}/resolve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createCheckoutSession(
    billingPeriod: 'monthly' | 'annual',
    token?: string
  ): Promise<{ success: boolean; data: { url: string } }> {
    if (token) {
      return this.request('/billing/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ billing_period: billingPeriod }),
      });
    }
    throw new Error('Authentication required for checkout');
  }

  async createSubscriptionIntent(
    billingPeriod: 'monthly' | 'annual',
    tokenOrEmail: string,
    isEmail?: boolean
  ): Promise<{
    success: boolean;
    data: { clientSecret: string; subscriptionId: string };
  }> {
    if (isEmail) {
      return this.request('/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          email: tokenOrEmail,
          billing_period: billingPeriod,
        }),
      });
    }
    return this.request('/billing/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenOrEmail}` },
      body: JSON.stringify({ billing_period: billingPeriod }),
    });
  }

  async createGuestCheckoutSession(
    email: string,
    billingPeriod: 'monthly' | 'annual'
  ): Promise<{ success: boolean; data: { url: string } }> {
    return this.request('/billing/checkout-guest', {
      method: 'POST',
      body: JSON.stringify({ email, billing_period: billingPeriod }),
    });
  }

  async createPortalSession(
    token: string
  ): Promise<{ success: boolean; data: { url: string } }> {
    return this.request('/billing/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async submitContact(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<{ success: boolean }> {
    return this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSubscriptionDetails(token: string): Promise<{
    success: boolean;
    data: {
      plan: 'free' | 'pro';
      status: 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
      billing_period: 'monthly' | 'annual' | null;
      current_period_end: string | null;
      canceled_at: string | null;
    };
  }> {
    type T = {
      success: boolean;
      data: {
        plan: 'free' | 'pro';
        status: 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
        billing_period: 'monthly' | 'annual' | null;
        current_period_end: string | null;
        canceled_at: string | null;
      };
    };
    const cached = this.getCached<T>('subscription');
    if (cached) return cached;
    const data = await this.request<T>('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });
    this.setCached('subscription', data, 5 * 60 * 1000);
    return data;
  }

  async cancelSubscription(token: string): Promise<{
    success: boolean;
    data: { canceled_at: string; current_period_end: string | null };
  }> {
    const result = await this.request<{
      success: boolean;
      data: { canceled_at: string; current_period_end: string | null };
    }>('/billing/cancel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    this.invalidate('subscription', 'plan');
    return result;
  }

  async createSetupIntent(
    token: string
  ): Promise<{ success: boolean; data: { clientSecret: string } }> {
    return this.request('/billing/setup-intent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateDefaultPaymentMethod(
    token: string,
    paymentMethodId: string
  ): Promise<{ success: boolean }> {
    const result = await this.request<{ success: boolean }>(
      '/billing/update-payment-method',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentMethodId }),
      }
    );
    this.invalidate('subscription');
    return result;
  }

  async getPlan(token: string): Promise<{
    success: boolean;
    data: {
      plan: 'free' | 'pro';
      bagLimit: number;
      canEditBags: boolean;
      showBranding: boolean;
    };
  }> {
    type T = {
      success: boolean;
      data: {
        plan: 'free' | 'pro';
        bagLimit: number;
        canEditBags: boolean;
        showBranding: boolean;
      };
    };
    const cached = this.getCached<T>('plan');
    if (cached) return cached;
    const data = await this.request<T>('/billing/plan', {
      headers: { Authorization: `Bearer ${token}` },
    });
    this.setCached('plan', data, 5 * 60 * 1000);
    return data;
  }

  async getOwnerEmail(
    token: string
  ): Promise<{ success: boolean; data: { email: string } }> {
    type T = { success: boolean; data: { email: string } };
    const cached = this.getCached<T>('me');
    if (cached) return cached;
    const data = await this.request<T>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    this.setCached('me', data, 30 * 60 * 1000);
    return data;
  }

  async deleteAccount(token: string): Promise<void> {
    await this.request('/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getOwnerSettings(token: string): Promise<{
    success: boolean;
    data: { conversation_retention_months: number | null };
  }> {
    type T = {
      success: boolean;
      data: { conversation_retention_months: number | null };
    };
    const cached = this.getCached<T>('settings');
    if (cached) return cached;
    const data = await this.request<T>('/auth/settings', {
      headers: { Authorization: `Bearer ${token}` },
    });
    this.setCached('settings', data, 10 * 60 * 1000);
    return data;
  }

  async updateOwnerSettings(
    token: string,
    settings: { conversation_retention_months: number | null }
  ): Promise<{ success: boolean }> {
    const result = await this.request<{ success: boolean }>('/auth/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(settings),
    });
    this.invalidate('settings');
    return result;
  }

  async getDashboard(token: string, force = false): Promise<DashboardData> {
    if (force) this.invalidate('dashboard');
    const cached = this.getCached<DashboardData>('dashboard');
    if (cached) return cached;
    const response = await fetch(`${API_BASE}/auth/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    }
    if (!response.ok) {
      throw new Error('Failed to load dashboard');
    }
    const result = await response.json();
    this.setCached('dashboard', result.data, 2 * 60 * 1000);
    return result.data as DashboardData;
  }

  async getBagNameCooldown(
    bagId: string,
    token: string | undefined,
    force = false
  ): Promise<{ canUpdate: boolean; nextUpdateAt?: Date }> {
    type T = { canUpdate: boolean; nextUpdateAt?: Date };
    const key = `cooldown::${bagId}::name`;
    if (force) this.invalidate(key);
    const cached = this.getCached<T>(key);
    if (cached) return cached;
    const response = await fetch(`${API_BASE}/bags/${bagId}/name-cooldown`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to check cooldown');
    const data = await response.json();
    this.setCached(key, data.data, 45 * 1000);
    return data.data as T;
  }

  async getBagRotationCooldown(
    bagId: string,
    token: string | undefined,
    force = false
  ): Promise<{ canRotate: boolean; nextRotationAt?: Date }> {
    type T = { canRotate: boolean; nextRotationAt?: Date };
    const key = `cooldown::${bagId}::rotation`;
    if (force) this.invalidate(key);
    const cached = this.getCached<T>(key);
    if (cached) return cached;
    const response = await fetch(
      `${API_BASE}/bags/${bagId}/rotation-cooldown`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) throw new Error('Failed to check rotation cooldown');
    const data = await response.json();
    this.setCached(key, data.data, 45 * 1000);
    return data.data as T;
  }
}

export const api = new ApiClient();
