import React, { useRef, useState } from "react";
import Draggable, {
  type DraggableData,
  type DraggableEventHandler,
} from "react-draggable";
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
}

const DraggableCard: React.FC<Props> = ({ card, setCards, onRightClick, sharedMode }) => {
  // ✅ React 19-safe: provide nodeRef to react-draggable to avoid findDOMNode
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(card.text);
  const [dirty, setDirty] = useState(false);

  const canEdit = !sharedMode || sharedMode.permission === "edit";

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
      // swallow to avoid UI break; you can surface a toast if desired
      console.error(err);
    }
  };

  const handleStop: DraggableEventHandler = (_e, data: DraggableData) => {
    if (!canEdit) return;

    // Optimistic UI position update
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, position_x: data.x, position_y: data.y } : c
      )
    );

    const payload = {
      ...card,
      position_x: data.x,
      position_y: data.y,
      text,
    };

    // Persist
    if (sharedMode) {
      api.updateSharedCard(sharedMode.token, card.id, payload as any).catch(console.error);
    } else {
      api.updateCard(card.id, payload as any).catch(console.error);
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}                     // ✅ critical for React 19
      defaultPosition={{ x: card.position_x, y: card.position_y }}
      onStop={handleStop}
      // Optional: uncomment to drag only by a header/handle element you add
      // handle=".drag-handle"
      // cancel="input, textarea, [contenteditable='true'], .no-drag, .allow-text-select"
    >
      <div
        ref={nodeRef}                       // ✅ same ref passed to nodeRef
        className="absolute card p-3 shadow-lg overflow-y-auto"
        style={{
          // Theming for dark mode (kept from prior fix)
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--fg)",
          maxWidth: 320,
          minWidth: 320,
          cursor: canEdit ? "move" : "default",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Allow right-click regardless of edit mode; parent will decide
          onRightClick(e.clientX, e.clientY);
        }}
      >
        {/* Optional handle:
        <div className="drag-handle cursor-grab active:cursor-grabbing -mx-3 -mt-3 px-3 py-2 border-b"
             style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs text-[var(--fg-muted)]">Drag</span>
        </div>
        */}

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
