// APIのベースURL
const BASE_URL = '/api/stripe';

/**
 * APIリクエストを処理する共通関数
 * @param endpoint APIエンドポイントのパス
 * @param options fetchリクエストのオプション
 * @returns レスポンスのJSONデータ
 * @throws APIエラーが発生した場合
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    // headers: { // ここでは共通のContent-Typeは設定せず、呼び出し側で個別に設定する
    //   'Content-Type': 'application/json',
    // },
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    const error = new Error(errorData.message || 'API request failed') as any;
    error.response = {
      status: response.status,
      data: errorData,
    };
    throw error;
  }
  return response.json() as Promise<T>;
}

// --- APIサービス関数 ---

interface SubscriptionStatus {
  // サブスクリプション状態に応じて必要なプロパティを定義
  // 例: isActive: boolean, planName: string, etc.
  [key: string]: any; // 実際のレスポンス構造に合わせて調整
}

/**
 * サブスクリプションの状態を取得します。
 */
export const getSubscriptionStatus = async (token?: string): Promise<SubscriptionStatus> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return request<SubscriptionStatus>('/subscription-status', { method: 'GET', headers });
};

interface CreateCheckoutSessionPayload {
  invitationCode: string;
  // token is not part of the body, it's for the header
}

interface CreateCheckoutSessionRequest extends CreateCheckoutSessionPayload {
  token?: string;
}

interface CreateCheckoutSessionResponse {
  // チェックアウトセッション作成後のレスポンス構造に合わせて定義
  // 例: sessionId: string, url: string
  [key: string]: any; // 実際のレスポンス構造に合わせて調整
}

/**
 * Stripe Checkout セッションを作成します。
 * @param payload リクエストボディ (invitationCodeを含む)
 */
export const createCheckoutSession = async (
  payload: CreateCheckoutSessionRequest,
): Promise<CreateCheckoutSessionResponse> => {
  const { token, ...bodyPayload } = payload;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return request<CreateCheckoutSessionResponse>('/create-checkout-session', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(bodyPayload),
  });
};

interface CreatePortalSessionResponse {
  // ポータルセッション作成後のレスポンス構造に合わせて定義
  // 例: url: string
  [key: string]: any; // 実際のレスポンス構造に合わせて調整
}

/**
 * Stripe カスタマーポータルセッションを作成します。
 */
export const createPortalSession = async (token?: string): Promise<CreatePortalSessionResponse> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return request<CreatePortalSessionResponse>('/create-portal-session', {
    method: 'POST',
    headers,
  });
};
