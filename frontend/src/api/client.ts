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

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

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
  getBoardDetail: (id: number) => request(`/boards/${id}`), // ✅ new method

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

  // Lookup user_id by email
  getUserIdByEmail: async (email: string) =>
    request("/emailToID", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // User access
  getBoardAccess: (boardId: number) => request(`/boards/${boardId}/access`),

  updateBoardAccess: (boardId: number, userId: number, permission: string) =>
    request(`/boards/${boardId}/access`, {
      method: "POST",
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

  createCard: (boardId: number, card: { text: string; position_x: number; position_y: number }) =>
    request(`/boards/${boardId}/cards`, {
      method: "POST",
      body: JSON.stringify(card),
    }),

  updateCard: (id: number, card: { text?: string; position_x?: number; position_y?: number }) =>
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
  createSharedCard: (token: string, card: any) =>
    request(`/share/${token}/cards`, {
      method: "POST",
      body: JSON.stringify(card),
    }),
  updateSharedCard: (token: string, id: number, card: any) =>
    request(`/share/${token}/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(card),
    }),
  deleteSharedCard: (token: string, id: number) =>
    request(`/share/${token}/cards/${id}`, { method: "DELETE" }),

  // Shared permission
  getSharePermission: (token: string) => request(`/permission/${token}`),
};
