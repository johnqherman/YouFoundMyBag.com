import type {
  CreateBagRequest,
  CreateBagResponse,
  FinderPageData,
  SendMessageRequest,
  SendMessageResponse,
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
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let data: any;
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
            message: textResponse || 'An unexpected error occurred',
          };
        }
      }
    } catch (parseError) {
      data = {
        error: 'Response parsing failed',
        message: 'Unable to parse server response',
      };
    }

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(error.message || 'An error occurred');
    }

    return data;
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

  async sendMessage(
    shortId: string,
    messageData: SendMessageRequest
  ): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>(`/bags/${shortId}/message`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }
}

export const api = new ApiClient();
