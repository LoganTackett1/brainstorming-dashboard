import React, { useEffect, useMemo, useRef, useState } from "react";
import Draggable, { type DraggableData, type DraggableEventHandler } from "react-draggable";
import { Rnd } from "react-rnd";
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

const MAX_AUTO_W = 640;

// Text cards: grow the textarea until this height, then scroll internally
const MAX_TEXTAREA_H = 260; // px

const DraggableCard: React.FC<Props> = ({
  card,
  setCards,
  onRightClick,
  sharedMode,
  forceReadOnly,
}) => {
  const isImage = (card as any).kind === "image";
  const canEdit = useMemo(
    () => !forceReadOnly && (!sharedMode || sharedMode.permission === "edit"),
    [forceReadOnly, sharedMode]
  );

  // -------------------------
  // TEXT CARD (existing flow)
  // -------------------------
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(card.text ?? "");

  useEffect(() => {
    setText(card.text ?? "");
  }, [card.id, card.text]);

  // Auto-size textarea on content changes (grow until MAX_TEXTAREA_H, then scroll)
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    const h = Math.min(el.scrollHeight, MAX_TEXTAREA_H);
    el.style.height = `${h}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_H ? "auto" : "hidden";
  }, [text]);

  const saveText = async () => {
    if (!canEdit) return;
    try {
      if (sharedMode) {
        await api.updateSharedCard(sharedMode.token, card.id, { text });
      } else {
        await api.updateCard(card.id, { text });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop: DraggableEventHandler = (_e, data: DraggableData) => {
    if (!canEdit) return;

    // Optimistic UI position
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, position_x: data.x, position_y: data.y } : c
      )
    );

    const patch = { position_x: data.x, position_y: data.y };
    const run = sharedMode
      ? api.updateSharedCard(sharedMode.token, card.id, patch as any)
      : api.updateCard(card.id, patch as any);
    run.catch(console.error);
  };

  // -------------------------
  // IMAGE CARD (react-rnd)
  // -------------------------
  // Keep local size state (derived from props)
  const [imgSize, setImgSize] = useState<{ width: number; height: number }>({
    width: (card as any).width,
    height: (card as any).height,
  });

  useEffect(() => {
    // If upstream changes (e.g., refresh) override local
    setImgSize({
      width: Number((card as any).width),
      height: Number((card as any).height),
    });
  }, [card.id, (card as any).width, (card as any).height]);

  const persistImagePatch = async (patch: {
    position_x?: number;
    position_y?: number;
    width?: number;
    height?: number;
  }) => {
    try {
      if (sharedMode) {
        await api.updateSharedCard(sharedMode.token, card.id, patch as any);
      } else {
        await api.updateCard(card.id, patch as any);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // First-time natural size fit (only if card has no size yet)
  const didAutoSizeRef = useRef(false);
  const handleImgLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
    if (didAutoSizeRef.current) return;
    const hasSize = (card as any).width != null && (card as any).height != null;
    if (hasSize) return;

    const img = e.currentTarget;
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    if (w > MAX_AUTO_W) {
      const ratio = MAX_AUTO_W / w;
      w = MAX_AUTO_W;
      h = Math.round(h * ratio);
    }

    // Optimistic local
    setImgSize({ width: w, height: h });
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, width: w, height: h } : c))
    );

    // Persist once
    persistImagePatch({ width: w, height: h });
    didAutoSizeRef.current = true;
  };

  // -------------------------
  // RENDER
  // -------------------------
  if (isImage) {
    return (
      <Rnd
        size={{ width: imgSize.width, height: imgSize.height }}
        position={{ x: card.position_x, y: card.position_y }}
        bounds="parent"
        disableDragging={!canEdit}
        enableResizing={
          canEdit
            ? {
                top: false,
                right: true,
                bottom: true,
                left: false,
                topRight: true,
                bottomRight: true,
                bottomLeft: true,
                topLeft: true,
              }
            : false
        }
        lockAspectRatio={true}
        dragGrid={[1, 1]}
        onDragStop={(_e, d) => {
          // Optimistic position
          setCards((prev) =>
            prev.map((c) =>
              c.id === card.id ? { ...c, position_x: d.x, position_y: d.y } : c
            )
          );
          // Persist
          persistImagePatch({ position_x: d.x, position_y: d.y });
        }}
        onResizeStop={(_e, _dir, ref, _delta, pos) => {
          const w = parseFloat(ref.style.width);
          const h = parseFloat(ref.style.height);

          // Optimistic size + position (rnd can move during resize)
          setImgSize({ width: w, height: h });
          setCards((prev) =>
            prev.map((c) =>
              c.id === card.id
                ? { ...c, width: w, height: h, position_x: pos.x, position_y: pos.y }
                : c
            )
          );
          // Persist
          persistImagePatch({
            width: w,
            height: h,
            position_x: pos.x,
            position_y: pos.y,
          });
        }}
        style={{
          border: canEdit ? "1px solid var(--border)" : "none",
          borderRadius: 8,
          background: "transparent",
        }}
        className="group absolute"
        onContextMenu={(e: any) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canEdit) return;
          onRightClick(e.clientX, e.clientY);
        }}
      >
        <img
          src={(card as any).image_url}
          alt=""
          className="block w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
          onLoad={handleImgLoad}
        />
        {/* Subtle affordance on hover */}
        <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-transparent group-hover:ring-[var(--border)]" />
      </Rnd>
    );
  }

  // TEXT CARD
  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: card.position_x, y: card.position_y }}
      onStop={handleStop}
      disabled={!canEdit} // lock dragging when read-only
      cancel=".card-textarea"
      bounds="parent"
    >
      <div
        ref={nodeRef}
        className="absolute card p-3 shadow-lg"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--fg)",
          width: 360,     // wider base
          maxWidth: 480,  // allow some headroom if needed later
          minWidth: 280,  // reasonable minimum
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
          className="card-textarea w-full resize-none border-none focus:ring-0 outline-none bg-transparent"
          onChange={(e) => {
            if (!canEdit) return;
            setText(e.target.value);
          }}
          onBlur={saveText}
          rows={3}
          placeholder={canEdit ? "Type…" : ""}
          style={{
            color: "var(--fg)",
            maxHeight: MAX_TEXTAREA_H, // effect clamps actual height + toggles overflow
          }}
        />
      </div>
    </Draggable>
  );
};

export default DraggableCard;
