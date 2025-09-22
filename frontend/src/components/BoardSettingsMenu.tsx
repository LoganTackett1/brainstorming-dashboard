import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { type Board } from "../types";

type Tab = "general" | "share";

interface Props {
  board: Board;
  closeMenu: () => void;
  refreshBoards?: () => void;
}

const BoardSettingsMenu: React.FC<Props> = ({ board, closeMenu, refreshBoards }) => {
  const [active, setActive] = useState<Tab>("general");

  // General tab state
  const [title, setTitle] = useState(board.title);
  const [savingTitle, setSavingTitle] = useState(false);

  // Thumbnail upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("No file chosen");
  const [uploading, setUploading] = useState(false);

  // Share tab state (uses your existing APIs)
  const [shareLinkRead, setShareLinkRead] = useState<string | null>(null);
  const [shareLinkEdit, setShareLinkEdit] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Actions
  const saveTitle = async () => {
    try {
      setSavingTitle(true);
      const usedTitle = title != "" ? title.trim() : "Untitled board";
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

  const createShareLink = async (permission: "read" | "edit") => {
    try {
      setShareLoading(true);
      const link = await api.createBoardShare(board.id, permission); // assumes your API returns a URL string
      if (permission === "read") setShareLinkRead(link);
      else setShareLinkEdit(link);
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={closeMenu} />

      {/* modal */}
      <div
        className="relative card w-[min(92vw,900px)] max-h-[85vh] overflow-auto"
        role="dialog"
        aria-modal="true"
      >
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
          {active === "general" && (
            <div className="mt-6 space-y-8">
              {/* Title row — input + Save aligned horizontally (Fix #2) */}
              <div>
                <label className="label block mb-2">Board title</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Board title"
                  />
                  <button
                    className="btn btn-accent self-start sm:self-auto"
                    onClick={saveTitle}
                    disabled={savingTitle}
                  >
                    {savingTitle ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {/* Thumbnail upload — proper "Choose File" button (Fix #3) */}
              <div>
                <label className="label block mb-2">Thumbnail</label>

                {/* Hidden native input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button type="button" className="btn btn-muted" onClick={onChooseFile}>
                    Choose File
                  </button>
                  <span className="text-sm text-[var(--fg-muted)]">{fileName}</span>

                  <div className="flex-1" />

                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={uploadThumbnail}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {active === "share" && (
            // Full-width stack instead of constrained half-width grid (Fix #4)
            <div className="mt-6 space-y-6">
              <div className="card p-4">
                <h4 className="font-semibold mb-2">Read-only link</h4>
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <button
                    className="btn btn-muted"
                    onClick={() => createShareLink("read")}
                    disabled={shareLoading}
                  >
                    {shareLoading ? "Working…" : "Generate"}
                  </button>
                  <input
                    className="input md:flex-1"
                    readOnly
                    value={shareLinkRead ?? ""}
                    placeholder="No link generated yet"
                  />
                </div>
              </div>

              <div className="card p-4">
                <h4 className="font-semibold mb-2">Edit link</h4>
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <button
                    className="btn btn-muted"
                    onClick={() => createShareLink("edit")}
                    disabled={shareLoading}
                  >
                    {shareLoading ? "Working…" : "Generate"}
                  </button>
                  <input
                    className="input md:flex-1"
                    readOnly
                    value={shareLinkEdit ?? ""}
                    placeholder="No link generated yet"
                  />
                </div>
              </div>

              {/* Danger zone example (uses theme danger color) */}
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
                    // If caller wants to refresh, let them:
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
