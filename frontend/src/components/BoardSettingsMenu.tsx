import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { type Board } from "../types";

type Tab = "general" | "share";
type Permission = "read" | "edit";

interface Props {
  board: Board;
  closeMenu: () => void;
  refreshBoards?: () => void;
}

/** Access entry shape per backend */
type AccessEntry = {
  id: number;            // access row id
  board_id: number;
  user_id: number;
  email: string;
  permission: Permission;
  created_at: string;
};

/** Share link shape per backend */
type ShareEntry = {
  id: number;            // share id (used by deleteBoardShare)
  board_id: number;
  token: string;
  permission: Permission;
  created_at: string;
};

const ORIGIN =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost:8080";

const BoardSettingsMenu: React.FC<Props> = ({ board, closeMenu, refreshBoards }) => {
  const [active, setActive] = useState<Tab>("general");

  // -------- General tab --------
  const [title, setTitle] = useState(board.title);
  const [savingTitle, setSavingTitle] = useState(false);

  // Thumbnail upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("No file chosen");
  const [uploading, setUploading] = useState(false);

  // -------- Share tab: links --------
  const [links, setLinks] = useState<ShareEntry[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  // -------- Share tab: access (members) --------
  const [accessList, setAccessList] = useState<AccessEntry[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePerm, setInvitePerm] = useState<Permission>("read");

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Fetch shares & access when Share tab opens
  useEffect(() => {
    if (active !== "share") return;

    (async () => {
      try {
        setLinkLoading(true);
        const list = (await api.getBoardShares(board.id)) as ShareEntry[];
        setLinks(Array.isArray(list) ? list : []);
      } finally {
        setLinkLoading(false);
      }

      try {
        setAccessLoading(true);
        const acl = (await api.getBoardAccess(board.id)) as AccessEntry[];
        setAccessList(Array.isArray(acl) ? acl : []);
      } finally {
        setAccessLoading(false);
      }
    })();
  }, [active, board.id]);

  // ---- General Actions ----
  const saveTitle = async () => {
    try {
      setSavingTitle(true);
      const usedTitle = title !== "" ? title.trim() : "Untitled board";
      // API expects a raw string (not an object)
      await api.updateBoard(board.id, usedTitle);
      refreshBoards?.();
    } finally {
      setSavingTitle(false);
    }
  };

  const onChooseFile = () => fileInputRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "No file chosen");
  };

  const uploadThumbnail = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      await api.uploadBoardThumbnail(board.id, file);
      setFileName(file.name);
      refreshBoards?.();
    } finally {
      setUploading(false);
    }
  };

  // ---- Share: Link helpers/actions ----
  const groupedLinks = useMemo(() => {
    const read = links.filter((l) => l.permission === "read");
    const edit = links.filter((l) => l.permission === "edit");
    return { read, edit };
  }, [links]);

  const fullUrl = (token: string) => `${ORIGIN}/share/${token}`;

  const createShareLink = async (permission: Permission) => {
    try {
      setLinkLoading(true);
      // returns full share object { id, token, permission, created_at }
      const created = (await api.createBoardShare(board.id, permission)) as ShareEntry;
      setLinks((prev) => [created, ...prev]);
    } finally {
      setLinkLoading(false);
    }
  };

  const deleteShareLink = async (shareId: number) => {
    try {
      setLinkLoading(true);
      // delete by share ID (not token)
      await api.deleteBoardShare(board.id, shareId);
      setLinks((prev) => prev.filter((l) => l.id !== shareId));
    } finally {
      setLinkLoading(false);
    }
  };

  // ---- Share: Access (members) actions ----
  const inviteMember = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    try {
      setAccessLoading(true);
      const idObj = await api.getUserIdByEmail(email)
      if (!idObj) {
        alert("No user with that email address was found.");
        return;
      }
      const userID = idObj.id;
      await api.createBoardAccess(board.id, userID, invitePerm);
      // Refresh authoritatively
      const req = await api.getBoardAccess(board.id);
      console.log(req);
      const acl: AccessEntry[] = req as AccessEntry[];
      setAccessList(Array.isArray(acl) ? acl : []);
      setInviteEmail("");
      setInvitePerm("read");
    } finally {
      setAccessLoading(false);
    }
  };

  const changeMemberPermission = async (accessId: number, newPerm: Permission) => {
    let user_id;
    const accessObject = accessList.filter((e) => {return (e.id == accessId)})
    if (accessObject.length == 0) {
      return
    } else {
      user_id = accessObject[0].user_id;
    }
    try {
      setAccessLoading(true);
      await api.updateBoardAccess(board.id, user_id, newPerm);
      setAccessList((prev) =>
        prev.map((m) => (m.id === accessId ? { ...m, permission: newPerm } : m))
      );
    } finally {
      setAccessLoading(false);
    }
  };

  const removeMember = async (accessId: number) => {
    console.log(accessId);
    console.log(accessList);
    let user_id;
    const accessObject = accessList.filter((e) => {return (e.id == accessId)})
    console.log(accessObject)
    if (accessObject.length == 0) {
      return
    } else {
      user_id = accessObject[0].user_id;
    }
    try {
      setAccessLoading(true);
      await api.removeBoardAccess(board.id, user_id);
      setAccessList((prev) => prev.filter((m) => m.id !== accessId));
    } finally {
      setAccessLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={closeMenu} />

      {/* modal */}
      <div className="relative card w-[min(92vw,900px)] max-h-[85vh] overflow-auto" role="dialog" aria-modal="true">
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h3 className="text-lg font-semibold">Board settings</h3>
          <button onClick={closeMenu} className="px-2 py-1 rounded hover:bg-[var(--muted)]">
            ✖
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="inline-flex rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <button
              className={`px-4 py-2 text-sm ${active === "general" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`}
              onClick={() => setActive("general")}
            >
              General
            </button>
            <button
              className={`px-4 py-2 text-sm ${active === "share" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`}
              onClick={() => setActive("share")}
            >
              Sharing
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* GENERAL */}
          {active === "general" && (
            <div className="mt-6 space-y-8">
              {/* Title row */}
              <div>
                <label className="label block mb-2">Board title</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Board title"
                  />
                  <button className="btn btn-accent self-start sm:self-auto" onClick={saveTitle} disabled={savingTitle}>
                    {savingTitle ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {/* Thumbnail upload */}
              <div>
                <label className="label block mb-2">Thumbnail</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button type="button" className="btn btn-muted" onClick={onChooseFile}>
                    Choose File
                  </button>
                  <span className="text-sm text-[var(--fg-muted)]">{fileName}</span>
                  <div className="flex-1" />
                  <button type="button" className="btn btn-success" onClick={uploadThumbnail} disabled={uploading}>
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SHARING */}
          {active === "share" && (
            <div className="mt-6 space-y-6">
              {/* Invite collaborators */}
              <div className="card p-4">
                <h4 className="font-semibold mb-2">Invite collaborators</h4>
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <input
                    className="input md:flex-1"
                    placeholder="name@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <select
                    className="input md:w-40"
                    value={invitePerm}
                    onChange={(e) => setInvitePerm(e.target.value as Permission)}
                  >
                    <option value="read">Read</option>
                    <option value="edit">Edit</option>
                  </select>
                  <button className="btn btn-accent" onClick={inviteMember} disabled={accessLoading || !inviteEmail}>
                    {accessLoading ? "Adding…" : "Add"}
                  </button>
                </div>

                {/* Members list */}
                <div className="mt-4 space-y-2">
                  {accessList.length === 0 ? (
                    <div className="text-sm text-[var(--fg-muted)]">No collaborators yet.</div>
                  ) : (
                    accessList.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col md:flex-row md:items-center gap-3 justify-between rounded-lg border p-3"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="text-sm">
                          <div className="font-medium">{m.email}</div>
                          <div className="text-xs text-[var(--fg-muted)]">
                            Access ID: {m.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="input md:w-40"
                            value={m.permission}
                            onChange={(e) => changeMemberPermission(m.id, e.target.value as Permission)}
                          >
                            <option value="read">Read</option>
                            <option value="edit">Edit</option>
                          </select>
                          <button
                            className="btn btn-danger"
                            onClick={() => removeMember(m.id)}
                            disabled={accessLoading}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Read-only links */}
              <div className="card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h4 className="font-semibold">Read-only links</h4>
                  <button className="btn btn-muted" onClick={() => createShareLink("read")} disabled={linkLoading}>
                    {linkLoading ? "Working…" : "Create new read link"}
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {groupedLinks.read.length === 0 ? (
                    <div className="text-sm text-[var(--fg-muted)]">No read-only links yet.</div>
                  ) : (
                    groupedLinks.read.map((l) => {
                      const url = fullUrl(l.token);
                      return (
                        <div
                          key={l.id}
                          className="flex flex-col md:flex-row md:items-center gap-3 justify-between rounded-lg border p-3"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <input className="input w-full" readOnly value={url} />
                            <div className="mt-1 text-xs text-[var(--fg-muted)]">Share ID: {l.id}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="btn btn-muted"
                              onClick={() => navigator.clipboard?.writeText(url).catch(() => {})}
                            >
                              Copy
                            </button>
                            <button className="btn btn-danger" onClick={() => deleteShareLink(l.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Edit links */}
              <div className="card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h4 className="font-semibold">Edit links</h4>
                  <button className="btn btn-muted" onClick={() => createShareLink("edit")} disabled={linkLoading}>
                    {linkLoading ? "Working…" : "Create new edit link"}
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {groupedLinks.edit.length === 0 ? (
                    <div className="text-sm text-[var(--fg-muted)]">No edit links yet.</div>
                  ) : (
                    groupedLinks.edit.map((l) => {
                      const url = fullUrl(l.token);
                      return (
                        <div
                          key={l.id}
                          className="flex flex-col md:flex-row md:items-center gap-3 justify-between rounded-lg border p-3"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <input className="input w-full" readOnly value={url} />
                            <div className="mt-1 text-xs text-[var(--fg-muted)]">Share ID: {l.id}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="btn btn-muted"
                              onClick={() => navigator.clipboard?.writeText(url).catch(() => {})}
                            >
                              Copy
                            </button>
                            <button className="btn btn-danger" onClick={() => deleteShareLink(l.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Danger zone */}
              <div className="card p-4">
                <h4 className="font-semibold mb-2">Danger zone</h4>
                <p className="text-sm text-[var(--fg-muted)] mb-3">
                  Deleting a board is permanent. This cannot be undone.
                </p>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    if (!confirm("Delete this board? This cannot be undone.")) return;
                    await api.deleteBoard(board.id);
                    closeMenu();
                    refreshBoards?.();
                  }}
                >
                  Delete board
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardSettingsMenu;
