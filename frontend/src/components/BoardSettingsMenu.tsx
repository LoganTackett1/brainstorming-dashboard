import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import SettingItem from "./SettingItem";
import { type Board } from "../types";

interface UserAccess {
  user_id: number;
  email: string;
  permission: string;
}

interface ShareLink {
  id: number;
  token: string;
  permission: string;
}

interface Props {
  board: Board;
  closeMenu: () => void;
  refreshBoards: () => void;
}

const BoardSettingsMenu: React.FC<Props> = ({ board, closeMenu, refreshBoards }) => {
  const [activeTab, setActiveTab] = useState<"general" | "share">("general");

  // --- Share tab state ---
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPermission, setNewUserPermission] = useState("read");

  const [links, setLinks] = useState<ShareLink[]>([]);
  const [newLinkPermission, setNewLinkPermission] = useState("read");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch access + shares
  useEffect(() => {
    if (activeTab === "share") {
      fetchAccess();
      fetchLinks();
    }
  }, [activeTab]);

  async function fetchAccess() {
    try {
      const data = await api.getBoardAccess(board.id);
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function fetchLinks() {
    try {
      const data = await api.getBoardShares(board.id);
      setLinks(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddUser() {
    try {
      setLoading(true);
      setError(null);

      // Lookup user_id
      const result = await api.getUserIdByEmail(newUserEmail);
      if (!result.id || typeof result.id !== "number") {
        throw new Error("User not found");
      }

      const userId = result.id;

      await api.updateBoardAccess(board.id, userId, newUserPermission);
      await fetchAccess();
      setNewUserEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLink() {
    try {
      setLoading(true);
      setError(null);
      await api.createBoardShare(board.id, newLinkPermission);
      await fetchLinks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={closeMenu} />

      {/* modal */}
      <div
        className="card relative max-h-[85vh] w-[min(92vw,900px)] overflow-auto p-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="mb-4 flex items-center justify-between border-b pb-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-lg font-semibold">Settings</h3>
          <button onClick={closeMenu} className="rounded px-2 py-1 hover:bg-[var(--muted)]">
            ✖
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${activeTab === "general" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${activeTab === "share" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`}
            onClick={() => setActiveTab("share")}
          >
            Sharing
          </button>
        </div>

        {/* keep your existing tab panels/content exactly as-is below */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <SettingItem
                label="Board Title"
                type="text"
                initialValue={board.title}
                onSubmit={async (val) => {
                  if (typeof val === "string") {
                    await api.updateBoard(board.id, val);
                    await refreshBoards();
                  }
                }}
                successMessage="Board title updated!"
              />

              <SettingItem
                label="Upload Thumbnail"
                type="file"
                onSubmit={async (file) => {
                  if (file instanceof File) {
                    await api.uploadBoardThumbnail(board.id, file);
                    await refreshBoards();
                  }
                }}
                successMessage="Thumbnail uploaded!"
              />

              <SettingItem
                label="Delete Thumbnail"
                type="button"
                buttonLabel="Delete Thumbnail"
                onSubmit={async () => {
                  await api.deleteBoardThumbnail(board.id);
                  await refreshBoards();
                }}
                successMessage="Thumbnail deleted!"
              />
            </div>
          </div>
        )}

        {activeTab === "share" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              {error && <p className="text-sm text-red-600">{error}</p>}

              {/* Users Section */}
              <div>
                <h4 className="mb-2 font-semibold">Users</h4>
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500">No users yet.</p>
                ) : (
                  <ul className="mb-2 space-y-2">
                    {users.map((u) => (
                      <li key={u.user_id} className="flex items-center justify-between">
                        <span>
                          {u.email} ({u.permission})
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              await api.removeBoardAccess(board.id, u.user_id);
                              await fetchAccess();
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  type="text"
                  placeholder="Enter user email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                />
                <select
                  value={newUserPermission}
                  onChange={(e) => setNewUserPermission(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                >
                  <option value="read">Read</option>
                  <option value="edit">Edit</option>
                </select>
                <button
                  onClick={handleAddUser}
                  disabled={loading}
                  className="w-full rounded bg-blue-600 px-4 py-2 text-white"
                >
                  {loading ? "Adding..." : "Add / Update User"}
                </button>
              </div>

              {/* Share Links Section */}
              <div>
                <h4 className="mb-2 font-semibold">Share Links</h4>
                {links.length === 0 ? (
                  <p className="text-sm text-gray-500">No share links yet.</p>
                ) : (
                  <ul className="mb-2 space-y-2">
                    {links.map((l) => (
                      <li key={l.id} className="flex items-center justify-between">
                        <span>
                          {window.location.origin}/share/{l.token} ({l.permission})
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              await api.deleteBoardShare(board.id, l.id);
                              await fetchLinks();
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <select
                  value={newLinkPermission}
                  onChange={(e) => setNewLinkPermission(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                >
                  <option value="read">Read</option>
                  <option value="edit">Edit</option>
                </select>
                <button
                  onClick={handleCreateLink}
                  disabled={loading}
                  className="w-full rounded bg-green-600 px-4 py-2 text-white"
                >
                  {loading ? "Creating..." : "Create Share Link"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardSettingsMenu;
