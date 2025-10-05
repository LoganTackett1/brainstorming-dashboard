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
  forceReadOnly?: boolean;
  zoom: number;
  pan: { x: number; y: number };
}

const MAX_AUTO_W = 640;
const MAX_TEXTAREA_H = 260;

const DraggableCard: React.FC<Props> = ({
  card,
  setCards,
  onRightClick,
  sharedMode,
  forceReadOnly,
  zoom,
}) => {
  const isImage = (card as any).kind === "image";
  const canEdit = useMemo(
    () => !forceReadOnly && (!sharedMode || sharedMode.permission === "edit"),
    [forceReadOnly, sharedMode],
  );

  // TEXT CARD
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(card.text ?? "");

  useEffect(() => {
    setText(card.text ?? "");
  }, [card.id, card.text]);

  // Auto-size textarea
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
      if (sharedMode)
        await api.updateSharedCard(sharedMode.token, card.id, { text });
      else
        await api.updateCard(card.id, { text });
    } catch (err) {
      console.error(err);
    }
  };

  /* Handle stop drag for text cards */
  const handleStop: DraggableEventHandler = (_e, data: DraggableData) => {
    if (!canEdit) return;

    const posX = data.x;
    const posY = data.y;

    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, position_x: posX, position_y: posY } : c)),
    );

    const patch = { position_x: posX, position_y: posY };
    const run = sharedMode
      ? api.updateSharedCard(sharedMode.token, card.id, patch as any)
      : api.updateCard(card.id, patch as any);
    run.catch(console.error);
  };

  // IMAGE CARD
  const [imgSize, setImgSize] = useState<{ width: number; height: number }>({
    width: (card as any).width,
    height: (card as any).height,
  });

  useEffect(() => {
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
      if (sharedMode)
        await api.updateSharedCard(sharedMode.token, card.id, patch as any);
      else
        await api.updateCard(card.id, patch as any);
    } catch (err) {
      console.error(err);
    }
  };

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

    setImgSize({ width: w, height: h });
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, width: w, height: h } : c)),
    );
    persistImagePatch({ width: w, height: h });
    didAutoSizeRef.current = true;
  };

  // ------------------- RENDER -------------------

  // IMAGE CARD (react-rnd)
  if (isImage) {
    return (
      <Rnd
        data-board-card
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
        scale={zoom}
        onDragStop={(_e, d) => {
          const posX = d.x;
          const posY = d.y;
          setCards((prev) =>
            prev.map((c) =>
              c.id === card.id ? { ...c, position_x: posX, position_y: posY } : c,
            ),
          );
          persistImagePatch({ position_x: posX, position_y: posY });
        }}
        onResizeStop={(_e, _dir, ref, _delta, pos) => {
          const w = parseFloat(ref.style.width);
          const h = parseFloat(ref.style.height);
          const posX = pos.x;
          const posY = pos.y;
          setImgSize({ width: w, height: h });
          setCards((prev) =>
            prev.map((c) =>
              c.id === card.id
                ? { ...c, width: w, height: h, position_x: posX, position_y: posY }
                : c,
            ),
          );
          persistImagePatch({ width: w, height: h, position_x: posX, position_y: posY });
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
          className="pointer-events-none block h-full w-full object-cover select-none"
          draggable={false}
          onLoad={handleImgLoad}
        />
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-transparent group-hover:ring-[var(--border)]" />
      </Rnd>
    );
  }

  // TEXT CARD (react-draggable)
  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: card.position_x, y: card.position_y }}
      onStop={handleStop}
      disabled={!canEdit}
      cancel=".card-textarea"
      bounds="parent"
      scale={zoom}
    >
      <div
        data-board-card
        ref={nodeRef}
        className="card absolute p-3 shadow-lg"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--fg)",
          width: 360,
          maxWidth: 480,
          minWidth: 280,
          cursor: canEdit ? "move" : "default",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canEdit) return;
          onRightClick(e.clientX, e.clientY);
        }}
      >
        <textarea
          ref={textRef}
          value={text}
          readOnly={!canEdit}
          className="card-textarea w-full resize-none border-none bg-transparent outline-none focus:ring-0"
          onChange={(e) => {
            if (!canEdit) return;
            setText(e.target.value);
          }}
          onBlur={saveText}
          rows={3}
          placeholder={canEdit ? "Type…" : ""}
          style={{
            color: "var(--fg)",
            maxHeight: MAX_TEXTAREA_H,
          }}
        />
      </div>
    </Draggable>
  );
};

export default DraggableCard;
