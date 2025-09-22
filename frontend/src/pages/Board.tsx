import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { AuthContext } from "../context/AuthContext";
import BoardSettingsMenu from "../components/BoardSettingsMenu";
import DraggableCard from "../components/DraggableCard";
import { useStaleCheck } from "../hooks/useStaleCheck";
import { type Board, type Card } from "../types";

const BoardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Right-click context menu (board-level and card-level)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "card" | "board" | null;
    cardId?: number;
  }>({ x: 0, y: 0, type: null });

  // Settings modal
  const [settingsMenu, setSettingsMenu] = useState({
    open: false,
    board: null as Board | null,
  });

  // Canvas ref for relative positioning (Bug 2)
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Poll for stale data (existing behavior)
  const { stale, setStale } = useStaleCheck(
    () => api.getCards(Number(id)),
    cards,
    [id]
  );

  async function fetchBoard() {
    try {
      const data = await api.getBoardDetail(Number(id));
      setBoard(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCards() {
    try {
      const data = await api.getCards(Number(id));
      setCards(data);
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
    if (id) {
      fetchBoard();
      fetchCards();
    }
  }, [id]);

  // Close context menu on outside click (existing behavior)
  useEffect(() => {
    const handleClick = () => setContextMenu({ x: 0, y: 0, type: null });
    if (contextMenu.type) {
      window.addEventListener("click", handleClick);
    }
    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [contextMenu]);

  if (loading) return <div className="p-6">Loading board...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!board) return <div className="p-6">Board not found</div>;

  const isOwner = board.owner_id === user?.user_id;

  // Convert client coords to canvas-relative coords (Bug 2)
  const toCanvasCoords = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    };
  };

  return (
    <div className="w-full">
      {/* Title + access chip */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <h2 className="text-2xl font-bold tracking-tight">{board.title}</h2>
        <span
          className="text-xs px-2 py-1 rounded-full border"
          style={{
            borderColor: "var(--border)",
            background: "var(--muted)",
            color: "var(--fg-muted)",
          }}
        >
          {isOwner ? "Owner" : "Collaborator"}
        </span>
      </div>

      {/* Settings cog */}
      {isOwner && (
        <button
          onClick={() => setSettingsMenu({ open: true, board })}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
          title="Board settings"
          aria-label="Board settings"
        >
          ⚙️
        </button>
      )}

      {/* The canvas wrapper:
          - uses themed surface/border so dark mode looks correct (Bug 3)
          - is the positioning parent for the absolute context menu (Bug 2)
      */}
      <div
        ref={boardRef}
        className="relative w-full overflow-hidden"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          // Fill viewport under sticky navbar + title row
          minHeight: "calc(100vh - 56px - 64px)",
        }}
        // Board-level right click → create card at cursor
        onContextMenu={(e) => {
          e.preventDefault();
          const p = toCanvasCoords(e.clientX, e.clientY);
          setContextMenu({
            x: p.x,
            y: p.y,
            type: "board",
          });
        }}
      >
        {/* Cards */}
        {cards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            setCards={setCards}
            // Card-level right-click (Bug 2) – translate to canvas coords
            onRightClick={(x, y) => {
              const p = toCanvasCoords(x, y);
              setContextMenu({ x: p.x, y: p.y, type: "card", cardId: card.id });
            }}
          />
        ))}

        {/* Context menu (uses themed surface/border; Bug 3) */}
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
            {contextMenu.type === "board" && (
              <button
                className="block px-4 py-2 hover:bg-[var(--muted)] w-full text-left"
                onClick={async () => {
                  const newCard = await api.createCard(board.id, {
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
            {contextMenu.type === "card" && (
              <button
                className="block px-4 py-2 hover:bg-[var(--muted)] w-full text-left text-red-600"
                onClick={async () => {
                  if (contextMenu.cardId) {
                    await api.deleteCard(contextMenu.cardId);
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

      {/* Settings Menu */}
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

export default BoardPage;
