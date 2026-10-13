export class ApiClient {
  private static userId = 'usr-admin';
  private static userRole = 'Platform Administrator';
  private static orgId = 'org-apex';
  private static projId = 'proj-core';

  public static setContext(params: { userId?: string; userRole?: string; orgId?: string; projId?: string }) {
    if (params.userId) this.userId = params.userId;
    if (params.userRole) this.userRole = params.userRole;
    if (params.orgId) this.orgId = params.orgId;
    if (params.projId) this.projId = params.projId;
  }

  public static getContext() {
    return {
      userId: this.userId,
      userRole: this.userRole,
      orgId: this.orgId,
      projId: this.projId,
    };
  }

  public static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('/') ? `/api/v1${endpoint}` : `/api/v1/${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('x-user-id', this.userId);
    headers.set('x-user-role', this.userRole);
    headers.set('x-org-id', this.orgId);
    headers.set('x-proj-id', this.projId);

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with HTTP ${res.status}`);
    }

    return data as T;
  }
}
