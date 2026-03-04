import {
  CreateBagRequest,
  CreateBagResponse,
  FinderPageData,
  StartConversationRequest,
  ApiError,
} from '../types/index.js';

const API_BASE = '/api';

class ApiClient {
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
    return this.request<CreateBagResponse>('/bags', {
      method: 'POST',
      body: JSON.stringify(bagData),
    });
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
    return this.request('/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async cancelSubscription(token: string): Promise<{
    success: boolean;
    data: { canceled_at: string; current_period_end: string | null };
  }> {
    return this.request('/billing/cancel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
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
    return this.request('/billing/update-payment-method', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentMethodId }),
    });
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
    return this.request('/billing/plan', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

export const api = new ApiClient();
