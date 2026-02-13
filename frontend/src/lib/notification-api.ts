import {
  buildJsonHeaders,
  fetchJson,
  getApiBaseUrl,
  type ApiEnvelope,
} from "./api-client";

export interface NotificationUser {
  id: number;
  name: string;
  email: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  message: string;
  sent_at: string;
  read_at?: string | null;
  user?: NotificationUser;
}

export interface NotificationListResult {
  notifications: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
}

export const notificationAPI = {
  async list(options: {
    type?: string;
    unreadOnly?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    accessToken?: string;
  } = {}): Promise<NotificationListResult> {
    const search = new URLSearchParams();
    if (options.type) search.set("type", options.type);
    if (options.unreadOnly) search.set("read", "false");
    if (options.startDate) search.set("startDate", options.startDate);
    if (options.endDate) search.set("endDate", options.endDate);
    if (typeof options.limit === "number")
      search.set("limit", String(options.limit));
    if (typeof options.offset === "number")
      search.set("offset", String(options.offset));

    const qs = search.toString();
    const url = `${getApiBaseUrl()}/api/notifications${
      qs ? `?${qs}` : ""
    }`;

    const body = await fetchJson<ApiEnvelope<NotificationItem[]>>(url, {
      method: "GET",
      headers: buildJsonHeaders(options.accessToken),
      credentials: "include",
    });
    const data = (body as any).data ?? body;
    const pagination = (body as any).pagination;

    const items = (Array.isArray(data) ? data : []) as NotificationItem[];

    return {
      notifications: items,
      total: pagination?.total ?? items.length,
      limit: pagination?.limit ?? items.length,
      offset: pagination?.offset ?? 0,
    };
  },

  async markAsRead(id: number, accessToken?: string): Promise<NotificationItem> {
    const url = `${getApiBaseUrl()}/api/notifications/${id}/read`;
    const body = await fetchJson<ApiEnvelope<NotificationItem>>(url, {
      method: "PUT",
      headers: buildJsonHeaders(accessToken),
      credentials: "include",
    });
    return ((body as any).data ?? body) as NotificationItem;
  },

  async sendTest(accessToken?: string): Promise<void> {
    const url = `${getApiBaseUrl()}/api/notifications/test`;
    await fetchJson<ApiEnvelope<unknown>>(url, {
      method: "POST",
      headers: buildJsonHeaders(accessToken),
      credentials: "include",
    });
  },
};

