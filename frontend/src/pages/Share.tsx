import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import DraggableCard from "../components/DraggableCard";
import { type Board, type Card } from "../types";

type Permission = "read" | "edit" | null;

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [permission, setPermission] = useState<Permission>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Context menu (optional; keep consistent with your app)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "card" | "board" | null;
    cardId?: number;
  }>({
    x: 0,
    y: 0,
    type: null,
  });

  // Stale polling banner state
  const [stale, setStale] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);

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

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  };

  // ----- Stale detection every 5s -----
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
        .sort((a, b) => a.id - b.id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  if (error || !board) return <div className="px-4 py-6 text-red-600">Error: {error ?? "Unknown"}</div>;

  return (
    <div className="w-full">
      {/* Title + permission chip */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <h2 className="text-2xl font-bold tracking-tight">{board.title}</h2>
        {permission && (
          <span
            className="text-xs px-2 py-1 rounded-full border capitalize"
            style={{ borderColor: "var(--border)", background: "var(--muted)", color: "var(--fg-muted)" }}
          >
            {permission /* string */}
          </span>
        )}
      </div>

      {/* Canvas wrapper */}
      <div
        ref={boardRef}
        className="relative w-full overflow-hidden"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          minHeight: "calc(100vh - 56px - 64px)",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (canEdit) {
            const p = toCanvasCoords(e.clientX, e.clientY);
            setContextMenu({ x: p.x, y: p.y, type: "board" });
          }
        }}
      >
        {/* Cards */}
        {cards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            setCards={setCards}
            sharedMode={{ token: token!, permission }}
            onRightClick={(x, y) => {
              if (!canEdit) return;
              const p = toCanvasCoords(x, y);
              setContextMenu({ x: p.x, y: p.y, type: "card", cardId: card.id });
            }}
          />
        ))}

        {/* Optional: context menu for shared boards */}
        {contextMenu.type && canEdit && (
          <div
            className="absolute z-50 rounded-xl border shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y, background: "var(--surface)", borderColor: "var(--border)" }}
            onClick={() => setContextMenu({ x: 0, y: 0, type: null })}
          >
            {contextMenu.type === "board" && (
              <button
                className="block px-4 py-2 hover:bg-[var(--muted)] w-full text-left"
                onClick={async () => {
                  await api.createSharedCard(token!, {
                    text: "New card",
                    position_x: contextMenu.x,
                    position_y: contextMenu.y,
                  });
                  setContextMenu({ x: 0, y: 0, type: null });
                  const cs = await api.getSharedCards(token!);
                  setCards(cs || []);
                }}
              >
                + Create Card
              </button>
            )}
          </div>
        )}
      </div>

      {/* 🔄 Refresh banner */}
      {stale && (
        <button
          onClick={handleRefresh}
          className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700"
        >
          🔄 Refresh board
        </button>
      )}
    </div>
  );
};

export default SharePage;
