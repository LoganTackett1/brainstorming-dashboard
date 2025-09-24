import React from "react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "default";
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onCancel,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "default",
}) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button className="btn btn-muted" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={tone === "danger" ? "btn btn-danger" : "btn btn-accent"}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div className="text-sm text-[var(--fg-muted)]">{message}</div>
    </Modal>
  );
};

export default ConfirmDialog;
