const API_URL = "http://localhost:8080";

let authToken: string | null = localStorage.getItem("token");

// Save token to memory + localStorage
export function setToken(token: string) {
  authToken = token;
  localStorage.setItem("token", token);
}

// Clear token (for logout)
export function clearToken() {
  authToken = null;
  localStorage.removeItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  let headers: HeadersInit = {};

  // If the body is not FormData, set JSON Content-Type
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Merge with any custom headers
  headers = { ...headers, ...options.headers };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  signup: (email: string, password: string) =>
    request("/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request("/me"),

  // Boards
  getBoards: () => request("/boards"),
  createBoard: (title: string) =>
    request("/boards", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  updateBoard: (id: number, title: string) =>
    request("/boards", {
      method: "PUT",
      body: JSON.stringify({ id, title }),
    }),
  deleteBoard: (id: number) =>
    request("/boards", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),
  getBoardDetail: (id: number) => request(`/boards/${id}`),

  // Thumbnails
  uploadBoardThumbnail: (boardId: number, file: File) => {
    const formData = new FormData();
    formData.append("board_id", boardId.toString());
    formData.append("file", file);

    return request("/boards/thumbnail", {
      method: "POST",
      body: formData,
    });
  },
  deleteBoardThumbnail: (boardId: number) =>
    request(`/boards/thumbnail?board_id=${boardId}`, {
      method: "DELETE",
    }),

  // Image uploads (NEW)
  uploadBoardImage: async (boardId: number, file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/boards/${boardId}/images`, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Upload failed: ${res.status}`);
    return data;
  },

  uploadSharedImage: async (token: string, file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/share/${token}/images`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Upload failed: ${res.status}`);
    return data;
  },

  // Lookup user_id by email
  getUserIdByEmail: (email: string) =>
    request("/emailToID", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // User access
  getBoardAccess: async (boardId: number) => await request(`/boards/${boardId}/access`),

  createBoardAccess: (boardId: number, userId: number, permission: string) =>
    request(`/boards/${boardId}/access`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, permission }),
    }),

  updateBoardAccess: (boardId: number, userId: number, permission: string) =>
    request(`/boards/${boardId}/access`, {
      method: "PUT",
      body: JSON.stringify({ user_id: userId, permission }),
    }),

  removeBoardAccess: (boardId: number, userId: number) =>
    request(`/boards/${boardId}/access`, {
      method: "DELETE",
      body: JSON.stringify({ user_id: userId }),
    }),

  // Share links
  getBoardShares: (boardId: number) => request(`/boards/${boardId}/share`),

  createBoardShare: (boardId: number, permission: string) =>
    request(`/boards/${boardId}/share`, {
      method: "POST",
      body: JSON.stringify({ permission }),
    }),

  deleteBoardShare: (boardId: number, shareId: number) =>
    request(`/boards/${boardId}/share`, {
      method: "DELETE",
      body: JSON.stringify({ share_id: shareId }),
    }),

  // Cards
  getCards: (boardId: number) => request(`/boards/${boardId}/cards`),

  // Accepts text OR image card shapes
  createCard: (
    boardId: number,
    card:
      | { text: string; position_x: number; position_y: number } // text card
      | {
          kind: "image";
          image_url: string;
          position_x: number;
          position_y: number;
          width?: number;
          height?: number;
        }, // image card
  ) =>
    request(`/boards/${boardId}/cards`, {
      method: "POST",
      body: JSON.stringify(card),
    }),

  updateCard: (
    id: number,
    card: {
      text?: string;
      position_x?: number;
      position_y?: number;
      width?: number;
      height?: number;
    },
  ) =>
    request(`/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(card),
    }),

  deleteCard: (id: number) =>
    request(`/cards/${id}`, {
      method: "DELETE",
    }),

  // Shared board
  getSharedBoard: (token: string) => request(`/share/${token}`),

  // Shared cards
  getSharedCards: (token: string) => request(`/share/${token}/cards`),
  createSharedCard: (
    token: string,
    card:
      | { text: string; position_x: number; position_y: number }
      | {
          kind: "image";
          image_url: string;
          position_x: number;
          position_y: number;
          width?: number;
          height?: number;
        },
  ) =>
    request(`/share/${token}/cards`, {
      method: "POST",
      body: JSON.stringify(card),
    }),
  updateSharedCard: (
    token: string,
    id: number,
    card: {
      text?: string;
      position_x?: number;
      position_y?: number;
      width?: number;
      height?: number;
    },
  ) =>
    request(`/share/${token}/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(card),
    }),
  deleteSharedCard: (token: string, id: number) =>
    request(`/share/${token}/cards/${id}`, { method: "DELETE" }),

  // Shared permission
  getSharePermission: (token: string) => request(`/permission/${token}`),
};
