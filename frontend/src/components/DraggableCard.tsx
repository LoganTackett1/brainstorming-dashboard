import React, { useEffect, useRef, useState } from "react";
import Draggable, { type DraggableData, type DraggableEventHandler } from "react-draggable";
import { api } from "../api/client";
import { type Card } from "../types";

interface SharedMode {
  token: string;
  permission: "read" | "edit" | null;
}

interface Props {
  card: Card;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  onRightClick: (x: number, y: number) => void;
  sharedMode?: SharedMode;
  /** When true, the card is locked (no drag, no edit, no save) regardless of sharedMode. */
  forceReadOnly?: boolean;
}

const DraggableCard: React.FC<Props> = ({ card, setCards, onRightClick, sharedMode, forceReadOnly }) => {
  // React 19-safe nodeRef pattern to avoid findDOMNode
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(card.text);
  const [dirty, setDirty] = useState(false);

  // Sync on external changes
  useEffect(() => {
    setText(card.text);
    setDirty(false);
  }, [card.id, card.text]);

  // Determine editability
  const canEdit =
    !forceReadOnly &&
    (!sharedMode || sharedMode.permission === "edit");

  const saveChanges = async () => {
    if (!canEdit) return;
    const payload = { ...card, text };
    try {
      if (sharedMode) {
        await api.updateSharedCard(sharedMode.token, card.id, payload as any);
      } else {
        await api.updateCard(card.id, payload as any);
      }
      setDirty(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop: DraggableEventHandler = (_e, data: DraggableData) => {
    if (!canEdit) return;

    // Optimistic UI position
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, position_x: data.x, position_y: data.y } : c))
    );

    const payload = {
      ...card,
      position_x: data.x,
      position_y: data.y,
      text,
    };

    if (sharedMode) {
      api.updateSharedCard(sharedMode.token, card.id, payload as any).catch(console.error);
    } else {
      api.updateCard(card.id, payload as any).catch(console.error);
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: card.position_x, y: card.position_y }}
      onStop={handleStop}
      disabled={!canEdit} // lock dragging when read-only
      cancel="textarea"
    >
      <div
        ref={nodeRef}
        className="absolute card p-3 shadow-lg overflow-y-auto"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--fg)",
          maxWidth: 320,
          minWidth: 220,
          cursor: canEdit ? "move" : "default",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canEdit) return; // don't open card menu if read-only
          onRightClick(e.clientX, e.clientY);
        }}
      >
        <textarea
          ref={textRef}
          value={text}
          readOnly={!canEdit}
          className="w-full resize-none border-none focus:ring-0 outline-none bg-transparent"
          onChange={(e) => {
            if (!canEdit) return;
            setText(e.target.value);
            setDirty(true);
          }}
          rows={3}
          placeholder={canEdit ? "Type…" : ""}
          style={{ color: "var(--fg)" }}
        />

        {dirty && canEdit && (
          <button
            onClick={saveChanges}
            className="mt-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow hover:bg-blue-700"
          >
            Save
          </button>
        )}
      </div>
    </Draggable>
  );
};

export default DraggableCard;
