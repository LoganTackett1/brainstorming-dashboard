import React, { useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreateUrl?: (url: string) => Promise<void> | void;
  onUploadFile?: (file: File) => Promise<void> | void;
};

const ImageCreateModal: React.FC<Props> = ({ open, onClose, onCreateUrl, onUploadFile }) => {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleAddFromUrl = async () => {
    const clean = url.trim();
    if (!clean || !onCreateUrl) return;
    try {
      setBusy(true);
      await onCreateUrl(clean);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f || !onUploadFile) return;
    try {
      setBusy(true);
      await onUploadFile(f);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative card w-[min(92vw,600px)] max-h-[85vh] overflow-auto">
        {/* Header */}
        <div
          className="sticky top-0 border-b px-4 py-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Add image</h3>
            <button className="px-2 py-1 rounded hover:bg-[var(--muted)]" onClick={onClose}>
              ✖
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Mode toggle */}
          <div
            className="inline-flex rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              className={`px-4 py-2 text-sm ${
                mode === "url" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"
              }`}
              onClick={() => setMode("url")}
            >
              From URL
            </button>
            <button
              className={`px-4 py-2 text-sm ${
                mode === "upload" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"
              }`}
              onClick={() => setMode("upload")}
            >
              Upload file
            </button>
          </div>

            <div key={mode}>
                {mode === "url" ? (
                <div className="space-y-2">
                    <label className="label block">Image URL</label>
                    <input
                    className="input w-full"
                    placeholder="https://example.com/image.jpg"
                    value={url} // stays a string
                    onChange={(e) => setUrl(e.target.value)}
                    />
                </div>
                ) : (
                <div className="space-y-2">
                    <label className="label block">Choose image</label>
                    <input ref={fileRef} type="file" accept="image/*" /> 
                </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end gap-2">
          <button className="btn btn-muted" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {mode === "url" ? (
            <button
              className="btn btn-accent"
              onClick={handleAddFromUrl}
              disabled={busy || !url.trim()}
            >
              {busy ? "Adding…" : "Add"}
            </button>
          ) : (
            <button className="btn btn-accent" onClick={handleUpload} disabled={busy}>
              {busy ? "Uploading…" : "Upload"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageCreateModal;
