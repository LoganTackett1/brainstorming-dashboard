import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export const FEATURE_MODAL_KEY = "featureModal.dismissed.v1";

type Props = {
  open: boolean;
  onClose: () => void;
  storageKey?: string;
};

const FeatureModal: React.FC<Props> = ({ open, onClose, storageKey = FEATURE_MODAL_KEY }) => {
  if (!open) return null;

  const handleOk = () => onClose();

  const handleDontShow = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // ignore storage issues (private mode, etc.)
    }
    onClose();
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);

    // prevent background scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const node = (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[2000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleOk} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-xl"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--fg)",
        }}
      >
        <div className="p-5">
          <h3 className="text-lg font-semibold mb-3">Quick tips</h3>
          <ul className="space-y-2 text-sm">
            <li>• Right-click to create cards and delete them</li>
            <li>• Drag cards around</li>
            <li>• Scale images by dragging the resize handles</li>
            <li>• Pan with click-drag; zoom with the scroll wheel</li>
          </ul>

          <div className="mt-5 flex gap-2 justify-end">
            <button
              onClick={handleDontShow}
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--muted)",
                color: "var(--fg)",
              }}
            >
              Don’t show again
            </button>
            <button
              onClick={handleOk}
              className="rounded-md px-3 py-2 text-sm"
              style={{
                background: "var(--accent, #2563eb)",
                color: "#fff",
              }}
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

export default FeatureModal;
