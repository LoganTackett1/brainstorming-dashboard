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
  sharedMode?: SharedMode; // 👈 new prop
}

const DraggableCard: React.FC<Props> = ({ card, setCards, onRightClick, sharedMode }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [dirty, setDirty] = useState(false);

  const canEdit = !sharedMode || sharedMode.permission === "edit";

  const handleStop: DraggableEventHandler = (_e, data: DraggableData) => {
    if (!canEdit) return;

    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? { ...c, position_x: data.x, position_y: data.y }
          : c
      )
    );

    const update = sharedMode
      ? api.updateSharedCard(sharedMode.token, card.id, {
          ...card,
          position_x: data.x,
          position_y: data.y,
        })
      : api.updateCard(card.id, {
          ...card,
          position_x: data.x,
          position_y: data.y,
        });

    update.catch((err: any) => {
      alert("Failed to save card position: " + err.message);
    });
  };

  const saveChanges = async () => {
    if (!canEdit) return;
    try {
      if (sharedMode) {
        await api.updateSharedCard(sharedMode.token, card.id, { ...card });
      } else {
        await api.updateCard(card.id, { ...card });
      }
      setDirty(false);
    } catch (err: any) {
      alert("Failed to save card: " + err.message);
    }
  };

  const autoResize = () => {
    if (textRef.current) {
      textRef.current.style.height = "auto"; // reset to shrink if needed
      textRef.current.style.height = `${textRef.current.scrollHeight}px`;
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: card.position_x, y: card.position_y }}
      onStop={handleStop}
      disabled={!canEdit}
      cancel="textarea"
    >
      <div
        ref={nodeRef}
        className="absolute bg-white p-3 rounded-lg shadow-lg 
                   w-72 min-h-[100px] max-h-[300px] 
                   overflow-y-auto cursor-move border border-gray-200"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (canEdit) {
            onRightClick(e.clientX, e.clientY);
          }
        }}
      >
        <textarea
          ref={textRef}
          value={card.text}
          readOnly={!canEdit}
          className="w-full resize-none border-none focus:ring-0 outline-none"
          onChange={(e) => {
            if (!canEdit) return;
            setCards((prev) =>
              prev.map((c) =>
                c.id === card.id ? { ...c, text: e.target.value } : c
              )
            );
            setDirty(true);
            autoResize();
          }}
          onInput={autoResize}
          style={{ minHeight: "60px", maxHeight: "240px" }} // inside card max
        />

        {dirty && canEdit && (
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
