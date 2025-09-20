import React, { useRef, useState } from "react";
import Draggable, {
  type DraggableData,
  type DraggableEvent,
  type DraggableEventHandler,
} from "react-draggable";
import { api } from "../api/client";
import { type Card } from "../types";

interface Props {
  card: Card;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
}

const DraggableCard: React.FC<Props> = ({ card, setCards }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  // Track whether this card has unsaved edits
  const [dirty, setDirty] = useState(false);

  const handleStop: DraggableEventHandler = (_e, data: DraggableData) => {
    // Update local state immediately
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? { ...c, position_x: data.x, position_y: data.y }
          : c
      )
    );

    // Persist position change to backend
    api.updateCard(card.id, {
      ...card,
      position_x: data.x,
      position_y: data.y,
    }).catch((err) => {
      alert("Failed to save card position: " + err.message);
    });
  };

  const saveChanges = async () => {
    try {
      await api.updateCard(card.id, { ...card });
      setDirty(false); // ✅ reset
    } catch (err: any) {
      alert("Failed to save card: " + err.message);
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: card.position_x, y: card.position_y }}
      onStop={handleStop}
    >
      <div
        ref={nodeRef}
        className="absolute bg-white p-3 rounded-lg shadow-lg w-56 cursor-move border border-gray-200"
      >
        <textarea
          value={card.text}
          className="w-full min-h-[60px] resize-none border-none focus:ring-0 outline-none"
          onChange={(e) => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === card.id ? { ...c, text: e.target.value } : c
              )
            );
            setDirty(true); // mark as unsaved
          }}
        />

        {/* Save button (only visible when dirty) */}
        {dirty && (
          <button
            onClick={saveChanges}
            className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow hover:bg-blue-700"
          >
            Save
          </button>
        )}
      </div>
    </Draggable>
  );
};

export default DraggableCard;
