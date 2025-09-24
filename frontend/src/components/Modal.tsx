import React, { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-[min(92vw,520px)] max-h-[85vh] overflow-auto" role="dialog" aria-modal="true">
        <div className="sticky top-0 flex items-center justify-between px-5 py-3 border-b"
             style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="px-2 py-1 rounded hover:bg-[var(--muted)]" onClick={onClose}>✖</button>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t flex justify-end gap-2"
               style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
