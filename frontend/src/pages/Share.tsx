import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import BoardSettingsMenu from "../components/BoardSettingsMenu";
import DraggableCard from "../components/DraggableCard";
import { useStaleCheck } from "../hooks/useStaleCheck";
import { type Board, type Card } from "../types";

type Permission = "read" | "edit" | null;

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [permission, setPermission] = useState<Permission>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "card" | "board" | null;
    cardId?: number;
  }>({ x: 0, y: 0, type: null });

  // (Your page already had settings)
  const [settingsMenu, setSettingsMenu] = useState({
    open: false,
    board: null as Board | null,
  });

  // Canvas ref for relative positioning (Bug 2)
  const boardRef = useRef<HTMLDivElement | null>(null);

  const canEdit = permission === "edit";

  const { stale, setStale } = useStaleCheck(
    () => api.getSharedCards(token!),
    cards,
    [token]
  );

  async function fetchBoard() {
    try {
      const b = await api.getSharedBoard(token!);
      setBoard(b);
      const p = await api.getSharePermission(token!);
      setPermission(p);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCards() {
    try {
      const cs = await api.getSharedCards(token!);
      setCards(cs);
    } catch (err: any) {
      setError(err.message);
    }
  }

  const handleRefresh = async () => {
    await fetchBoard();
    await fetchCards();
    setStale(false);
  };

  useEffect(() => {
    if (token) {
      fetchBoard();
      fetchCards();
    }
  }, [token]);

  // Convert client coords to canvas-relative coords (Bug 2)
  const toCanvasCoords = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    };
  };

  if (loading) return <div className="p-6">Loading board...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!board) return <div className="p-6">Board not found</div>;

  return (
    <div className="w-full">
      {/* Title + share permission */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <h2 className="text-2xl font-bold tracking-tight">{board.title}</h2>
        {permission && (
          <span
            className="text-xs px-2 py-1 rounded-full border capitalize"
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

      {/* Themed canvas wrapper (Bug 3) + relative anchor for context menu (Bug 2) */}
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
            setContextMenu({
              x: p.x,
              y: p.y,
              type: "board",
            });
          }
        }}
      >
        {/* Cards */}
        {cards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            setCards={setCards}
            sharedMode={{ token: token!, permission }} // preserve your shared API usage
            onRightClick={(x, y) => {
              if (!canEdit) return;
              const p = toCanvasCoords(x, y);
              setContextMenu({ x: p.x, y: p.y, type: "card", cardId: card.id });
            }}
          />
        ))}

        {/* Context menu (themed; Bug 3) */}
        {contextMenu.type && (
          <div
            className="absolute z-50 rounded-xl border shadow-lg"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
            onClick={() => setContextMenu({ x: 0, y: 0, type: null })}
          >
            {contextMenu.type === "board" && canEdit && (
              <button
                className="block px-4 py-2 hover:bg-[var(--muted)] w-full text-left"
                onClick={async () => {
                  const newCard = await api.createSharedCard(token!, {
                    text: "New card",
                    position_x: contextMenu.x,
                    position_y: contextMenu.y,
                  });
                  setContextMenu({ x: 0, y: 0, type: null });
                  await fetchCards();
                }}
              >
                + Create Card
              </button>
            )}
            {contextMenu.type === "card" && canEdit && (
              <button
                className="block px-4 py-2 hover:bg-[var(--muted)] w-full text-left text-red-600"
                onClick={async () => {
                  if (contextMenu.cardId) {
                    await api.deleteSharedCard(token!, contextMenu.cardId);
                    setCards((prev) => prev.filter((c) => c.id !== contextMenu.cardId));
                  }
                  setContextMenu({ x: 0, y: 0, type: null });
                }}
              >
                🗑 Delete Card
              </button>
            )}
          </div>
        )}
      </div>

      {/* Settings Menu (kept; you already had it) */}
      {settingsMenu.open && settingsMenu.board && (
        <BoardSettingsMenu
          board={settingsMenu.board}
          closeMenu={() => setSettingsMenu({ open: false, board: null })}
          refreshBoards={fetchBoard}
        />
      )}

      {/* Refresh banner (existing behavior) */}
      {stale && (
        <button
          onClick={handleRefresh}
          className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700"
        >
          🔄 Refresh Board
        </button>
      )}
    </div>
  );
};

export default SharePage;
