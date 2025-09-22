import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import BoardSettingsMenu from "../components/BoardSettingsMenu";
import { type Board, type Card } from "../types";
import DraggableCard from "../components/DraggableCard";
import { useStaleCheck } from "../hooks/useStaleCheck";

type Permission = "read" | "edit" | null;

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [permission, setPermission] = useState<Permission>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "card" | "board" | null;
    cardId?: number;
  }>({ x: 0, y: 0, type: null });

  const [settingsMenu, setSettingsMenu] = useState({
    open: false,
    board: null as Board | null,
  });

  const { stale, setStale } = useStaleCheck(
    () => api.getSharedCards(token!), // fetchFn
    cards, // local cards state
    [token], // deps
  );

  const handleRefresh = async () => {
    await fetchBoard();
    await fetchCards();
    setStale(false);
  };

  useEffect(() => {
    if (token) {
      fetchBoard();
      fetchCards();
      fetchPermission();
    }
  }, [token]);

  useEffect(() => {
    const handleClick = () => setContextMenu({ x: 0, y: 0, type: null });
    if (contextMenu.type) {
      window.addEventListener("click", handleClick);
    }
    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [contextMenu]);

  async function fetchBoard() {
    try {
      const data = await api.getSharedBoard(token!);
      setBoard(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCards() {
    try {
      const data = await api.getSharedCards(token!);
      setCards(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function fetchPermission() {
    try {
      const res = await api.getSharePermission(token!);
      setPermission(res.permission as Permission);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <div className="p-6">Loading shared board...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!board) return <div className="p-6">Board not found</div>;

  const canEdit = permission === "edit";

  return (
    <div
      className="relative h-screen w-full overflow-hidden bg-gray-100"
      onContextMenu={(e) => {
        e.preventDefault();
        if (canEdit) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type: "board", // right-click background
          });
        }
      }}
    >
      {/* Board title */}
      <div className="flex items-center gap-3 p-4">
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

      {/* Settings cog (only for edit links) */}
      {canEdit && (
        <button
          onClick={() => setSettingsMenu({ open: true, board })}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
        >
          ⚙️
        </button>
      )}

      {/* Cards */}
      {cards.map((card) => (
        <DraggableCard
          key={card.id}
          card={card}
          setCards={setCards}
          onRightClick={(x: number, y: number) => {
            if (canEdit) {
              setContextMenu({ x, y, type: "card", cardId: card.id });
            }
          }}
          sharedMode={{ token: token!, permission }} // 👈 use shared API inside card
        />
      ))}

      {/* Settings Menu */}
      {settingsMenu.open && settingsMenu.board && (
        <BoardSettingsMenu
          board={settingsMenu.board}
          closeMenu={() => setSettingsMenu({ open: false, board: null })}
          refreshBoards={fetchBoard}
        />
      )}

      {/* Context Menu */}
      {contextMenu.type && (
        <div
          className="absolute z-50 rounded border bg-white shadow"
          style={{ top: contextMenu.y - 60, left: contextMenu.x + 20 }}
          onClick={() => setContextMenu({ x: 0, y: 0, type: null })}
        >
          {contextMenu.type === "board" && (
            <button
              className="block w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={async () => {
                const newCard = await api.createSharedCard(token!, {
                  text: "New card",
                  position_x: contextMenu.x,
                  position_y: contextMenu.y,
                });
                fetchCards();
                setContextMenu({ x: 0, y: 0, type: null });
              }}
            >
              + Create Card
            </button>
          )}
          {contextMenu.type === "card" && (
            <button
              className="block w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
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

      {stale && (
        <button
          onClick={handleRefresh}
          className="fixed right-4 bottom-4 rounded bg-blue-600 px-4 py-2 text-white shadow-lg hover:bg-blue-700"
        >
          🔄 Refresh Board
        </button>
      )}
    </div>
  );
};

export default SharePage;
