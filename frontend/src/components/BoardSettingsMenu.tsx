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
    <div className="fixed top-1/2 right-1/2 bg-white border z-50 p-4">
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b mb-4">
        <h3 className="font-bold">Settings</h3>
        <button onClick={closeMenu} className="text-gray-500 hover:text-gray-800">
          ✖
        </button>
      </div>

      {/* Tabs */}
      <div className="flex mb-4">
        <button
          className={`flex-1 p-2 ${
            activeTab === "general" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
          onClick={() => setActiveTab("general")}
        >
          General
        </button>
        <button
          className={`flex-1 p-2 ${
            activeTab === "share" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
          onClick={() => setActiveTab("share")}
        >
          Share
        </button>
      </div>

      {/* Content Area */}
      <div>
        {/* General Tab */}
        {activeTab === "general" && (
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
        )}

        {/* Share Tab */}
        {activeTab === "share" && (
          <div className="space-y-6">
            {error && <p className="text-red-600 text-sm">{error}</p>}

            {/* Users Section */}
            <div>
              <h4 className="font-semibold mb-2">Users</h4>
              {users.length === 0 ? (
                <p className="text-sm text-gray-500">No users yet.</p>
              ) : (
                <ul className="space-y-2 mb-2">
                  {users.map((u) => (
                    <li key={u.user_id} className="flex justify-between items-center">
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
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded"
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
                className="p-2 border rounded w-full mb-2"
              />
              <select
                value={newUserPermission}
                onChange={(e) => setNewUserPermission(e.target.value)}
                className="p-2 border rounded w-full mb-2"
              >
                <option value="read">Read</option>
                <option value="edit">Edit</option>
              </select>
              <button
                onClick={handleAddUser}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded w-full"
              >
                {loading ? "Adding..." : "Add / Update User"}
              </button>
            </div>

            {/* Share Links Section */}
            <div>
              <h4 className="font-semibold mb-2">Share Links</h4>
              {links.length === 0 ? (
                <p className="text-sm text-gray-500">No share links yet.</p>
              ) : (
                <ul className="space-y-2 mb-2">
                  {links.map((l) => (
                    <li key={l.id} className="flex justify-between items-center">
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
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded"
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
                className="p-2 border rounded w-full mb-2"
              >
                <option value="read">Read</option>
                <option value="edit">Edit</option>
              </select>
              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded w-full"
              >
                {loading ? "Creating..." : "Create Share Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardSettingsMenu;
