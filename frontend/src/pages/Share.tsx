import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import DraggableCard from "../components/DraggableCard";
import ImageCreateModal from "../components/ImageCreateModal";
import FeatureModal, { FEATURE_MODAL_KEY } from "../components/FeatureModal";
import { type Board, type Card } from "../types";
import RefreshIcon from "@/assets/refresh.svg?react";
import ImageIcon from "@/assets/image.svg?react";
import DeleteIcon from "@/assets/delete.svg?react";

type Permission = "read" | "edit" | null;

const safeShouldShowFeatureModal = () => {
  try {
    return localStorage.getItem(FEATURE_MODAL_KEY) !== "true";
  } catch {
    return true;
  }
};

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [permission, setPermission] = useState<Permission>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    screenX: number;
    screenY: number;
    type: "card" | "board" | null;
    cardId?: number;
    boardX?: number;
    boardY?: number;
  }>({ screenX: 0, screenY: 0, type: null });

  // Image modal
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Stale polling banner state
  const [stale, setStale] = useState(false);

  // Pan & zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  // Canvas ref for relative positioning
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (safeShouldShowFeatureModal()) setShowFeatureModal(true);
  }, []);

  // Load board & cards + permission
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!token) throw new Error("Missing share token");
        const b = await api.getSharedBoard(token);
        const pResp = await api.getSharePermission(token);
        const p: Permission =
          pResp && typeof pResp === "object" && "permission" in pResp
            ? (pResp as any).permission
            : typeof pResp === "string"
              ? (pResp as Permission)
              : null;

        if (!active) return;
        setBoard(b);
        setPermission(p);
        const cs = await api.getSharedCards(token);
        if (!active) return;
        setCards(cs || []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "Failed to load share");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const canEdit = useMemo(() => permission === "edit", [permission]);

  // Disable body scroll on this page
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // PAN LOGIC
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // left click only
      const target = e.target as HTMLElement;

      if (!boardRef.current || !boardRef.current.contains(target)) return;

      if (target.closest("[data-board-card]") || target.closest("textarea, input")) {
        return;
      }

      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !lastMouseRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const handleMouseUp = () => {
      isPanningRef.current = false;
      lastMouseRef.current = null;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // ZOOM LOGIC
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    const zoomIntensity = 0.0015;
    const nextZoom = Math.min(3, Math.max(0.25, zoom * (1 - e.deltaY * zoomIntensity)));
    if (nextZoom === zoom) return;

    const k = nextZoom / zoom;

    setPan((prev) => ({ x: prev.x * k, y: prev.y * k }));
    setZoom(nextZoom);
  };

  const BOARD_W = 5000;
  const BOARD_H = 5000;

  // Client (screen) -> board coordinates
  const toCanvasCoords = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    // Position of cursor relative to board center
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);

    // Convert to board-space coords
    const boardX = BOARD_W / 2 + (dx - pan.x) / zoom;
    const boardY = BOARD_H / 2 + (dy - pan.y) / zoom;

    return { x: boardX, y: boardY };
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () =>
      setContextMenu({
        screenX: 0,
        screenY: 0,
        boardX: undefined,
        boardY: undefined,
        cardId: undefined,
        type: null,
      });

    if (contextMenu.type) {
      window.addEventListener("click", handleClick);
    }

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [contextMenu.type]);

  // Stale detection every 5s
  const snapshot = (arr: Card[]) =>
    JSON.stringify(
      (arr || [])
        .map((c) => ({
          id: c.id,
          x: c.position_x,
          y: c.position_y,
          t: c.text,
          u: (c as any).updated_at ?? null,
        }))
        .sort((a, b) => a.id - b.id),
    );

  useEffect(() => {
    if (!token) return;
    let alive = true;
    let ticking = false;

    const check = async () => {
      if (ticking) return;
      ticking = true;
      try {
        const latest = (await api.getSharedCards(token)) || [];
        const localHash = snapshot(cards);
        const remoteHash = snapshot(latest);
        if (!alive) return;
        if (localHash !== remoteHash) setStale(true);
      } catch {
        // ignore poll errors
      } finally {
        ticking = false;
      }
    };

    const iv = window.setInterval(check, 5000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [token, snapshot(cards)]);

  const handleRefresh = async () => {
    if (!token) return;
    const b = await api.getSharedBoard(token);
    const cs = await api.getSharedCards(token);
    setBoard(b);
    setCards(cs || []);
    setStale(false);
  };

  if (loading) return <div className="px-4 py-6">Loading…</div>;
  if (error || !board)
    return <div className="px-4 py-6 text-red-600">Error: {error ?? "Unknown"}</div>;

  return (
    <div className="w-full">
      {/* Title + permission chip */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <h2 className="text-2xl font-bold tracking-tight">{board.title}</h2>
        {permission && (
          <span
            className="rounded-full border px-2 py-1 text-xs capitalize"
            style={{
              borderColor: "var(--border)",
              background: "var(--muted)",
              color: "var(--fg-muted)",
            }}
          >
            {permission}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={boardRef}
        className="relative h-full w-full overflow-hidden"
        onWheel={handleWheel}
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          minHeight: "calc(100vh - 56px - 64px)",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!canEdit) return;

          const boardPos = toCanvasCoords(e.clientX, e.clientY);
          setContextMenu({
            screenX: e.clientX - (boardRef.current?.getBoundingClientRect().left ?? 0),
            screenY: e.clientY - (boardRef.current?.getBoundingClientRect().top ?? 0),
            boardX: boardPos.x,
            boardY: boardPos.y,
            type: "board",
          });
        }}
      >
        {/* Inner fixed-size board */}
        <div
          className="absolute"
          style={{
            width: "5000px",
            height: "5000px",
            left: "50%",
            top: "50%",
            marginLeft: "-2500px",
            marginTop: "-2500px",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            border: "2px solid red",
          }}
        >
          {cards.map((card) => (
            <DraggableCard
              key={card.id}
              card={card}
              setCards={setCards}
              sharedMode={{ token: token!, permission }}
              forceReadOnly={!canEdit}
              onRightClick={(x, y) => {
                if (!canEdit) return;
                const p = toCanvasCoords(x, y);
                setContextMenu({
                  screenX: x - (boardRef.current?.getBoundingClientRect().left ?? 0),
                  screenY: y - (boardRef.current?.getBoundingClientRect().top ?? 0),
                  boardX: p.x,
                  boardY: p.y,
                  type: "card",
                  cardId: card.id,
                });
              }}
              zoom={zoom}
              pan={pan}
            />
          ))}
        </div>

        {/* Context menu */}
        {contextMenu.type && canEdit && (
          <div
            className="absolute z-50 overflow-hidden rounded-xl border shadow-lg"
            style={{
              left: contextMenu.screenX,
              top: contextMenu.screenY,
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
            onClick={() => setContextMenu({ screenX: 0, screenY: 0, type: null })}
          >
            {contextMenu.type === "board" && (
              <>
                <button
                  className="block w-full px-4 py-2 text-left hover:bg-[var(--muted)]"
                  onClick={async () => {
                    if (!token) return;
                    const safeX =
                      typeof contextMenu.boardX === "number" && !isNaN(contextMenu.boardX)
                        ? contextMenu.boardX
                        : BOARD_W / 2;
                    const safeY =
                      typeof contextMenu.boardY === "number" && !isNaN(contextMenu.boardY)
                        ? contextMenu.boardY
                        : BOARD_H / 2;

                    await api.createSharedCard(token, {
                      text: "New card",
                      position_x: safeX,
                      position_y: safeY,
                    });

                    setContextMenu({ screenX: 0, screenY: 0, type: null });
                    const cs = await api.getSharedCards(token);
                    setCards(cs || []);
                  }}
                >
                  + Create Card
                </button>

                {/* Create Image (shared) */}
                <button
                  className="block w-full px-4 py-2 text-left hover:bg-[var(--muted)]"
                  onClick={() => {
                    const safeX =
                      typeof contextMenu.boardX === "number" && !isNaN(contextMenu.boardX)
                        ? contextMenu.boardX
                        : BOARD_W / 2;
                    const safeY =
                      typeof contextMenu.boardY === "number" && !isNaN(contextMenu.boardY)
                        ? contextMenu.boardY
                        : BOARD_H / 2;

                    setPendingPos({ x: safeX, y: safeY });
                    setContextMenu({ screenX: 0, screenY: 0, type: null });
                    setImageModalOpen(true);
                  }}
                >
                  <ImageIcon className="inline h-5 w-5 text-[var(--fg-muted)]" /> Create Image
                </button>
              </>
            )}

            {contextMenu.type === "card" && (
              <button
                className="block w-full px-4 py-2 text-left text-red-600 hover:bg-[var(--muted)]"
                onClick={async () => {
                  if (!token) return;

                  const safeId =
                    typeof contextMenu.cardId === "number" && !isNaN(contextMenu.cardId)
                      ? contextMenu.cardId
                      : null;

                  if (safeId !== null) {
                    await api.deleteSharedCard(token, safeId);
                    setCards((prev) => prev.filter((c) => c.id !== safeId));
                  }

                  setContextMenu({ screenX: 0, screenY: 0, type: null });
                }}
              >
                <DeleteIcon className="inline h-5 w-5 text-red-600" /> Delete Card
              </button>
            )}
          </div>
        )}
      </div>
      {/* Feature Modal */}
      <FeatureModal open={showFeatureModal} onClose={() => setShowFeatureModal(false)} />
      {/* Image Modal (shared) */}
      <ImageCreateModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onCreateUrl={async (u) => {
          if (!token) return;
          await api.createSharedCard(token, {
            kind: "image",
            image_url: u,
            position_x: pendingPos.x,
            position_y: pendingPos.y,
          });
          const cs = await api.getSharedCards(token);
          setCards(cs || []);
        }}
        onUploadFile={async (file) => {
          if (!token) return;
          const r = await api.uploadSharedImage(token, file);
          await api.createSharedCard(token, {
            kind: "image",
            image_url: r.url,
            position_x: pendingPos.x,
            position_y: pendingPos.y,
          });
          const cs = await api.getSharedCards(token);
          setCards(cs || []);
        }}
      />

      {/* Refresh banner */}
      {stale && (
        <button
          onClick={handleRefresh}
          className="fixed right-4 bottom-4 rounded bg-blue-600 px-4 py-2 text-white shadow-lg hover:bg-blue-700"
        >
          <RefreshIcon className="inline h-5 w-5 text-[#FFFFFF]" /> Refresh board
        </button>
      )}
    </div>
  );
};

export default SharePage;
