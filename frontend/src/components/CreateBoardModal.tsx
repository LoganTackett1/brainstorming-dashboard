import React, { useState } from "react";
import Modal from "./Modal";
import { api } from "../api/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void; // call to refetch
}

const CreateBoardModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const used = title.trim() || "Untitled board";
    try {
      setBusy(true);
      await api.createBoard(used);
      onCreated?.();
      onClose();
    } finally {
      setBusy(false);
      setTitle("");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a new board"
      footer={
        <>
          <button className="btn btn-muted" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-accent" onClick={submit} disabled={busy || !title.trim()}>
            {busy ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-2">
        <label className="label">Title</label>
        <input
          className="input w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Board title"
          autoFocus
        />
      </div>
    </Modal>
  );
};

export default CreateBoardModal;
