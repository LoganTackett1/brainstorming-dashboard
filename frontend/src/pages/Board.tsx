import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { AuthContext } from "../context/AuthContext";
import BoardSettingsMenu from "../components/BoardSettingsMenu";
import Draggable, {
  type DraggableData,
  type DraggableEvent,
  type DraggableEventHandler,
} from "react-draggable";
import {type Board, type Card} from "../types";
import DraggableCard from "../components/DraggableCard";
import { useStaleCheck } from "../hooks/useStaleCheck";

const BoardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
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
    () => api.getCards(Number(id)), // fetchFn
    cards,                          // local cards state
    [id]                            // deps
  );

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

  if (loading) return <div className="p-6">Loading board...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!board) return <div className="p-6">Board not found</div>;

  const isOwner = board.owner_id === user?.user_id;

  return (
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden" onContextMenu={(e) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: "board", // right-click background
      });
    }}>
      {/* Board title */}
      <h2 className="text-2xl font-bold p-4">{board.title}</h2>

      {/* Settings cog */}
      {isOwner && (
        <button
          onClick={() => setSettingsMenu({ open: true, board })}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
        >
          ⚙️
        </button>
      )}

      {/* Cards */}
      {cards.map((card) => (
        <DraggableCard key={card.id} card={card} setCards={setCards} onRightClick={(x: number, y: number) => setContextMenu({ x, y, type: "card", cardId: card.id })} />
      ))}


      {/* Settings Menu */}
      {settingsMenu.open && settingsMenu.board && (
        <BoardSettingsMenu
          board={settingsMenu.board}
          closeMenu={() => setSettingsMenu({ open: false, board: null })}
          refreshBoards={fetchBoard}
        />
      )}

      {contextMenu.type && (
        <div
          className="absolute bg-white border shadow rounded z-50"
          style={{ top: contextMenu.y-60, left: contextMenu.x+20 }}
          onClick={() => setContextMenu({ x: 0, y: 0, type: null })}
        >
          {contextMenu.type === "board" && (
            <button
              className="block px-4 py-2 hover:bg-gray-100 w-full text-left"
              onClick={async () => {
                const newCard = await api.createCard(board.id, {
                  text: "New card",
                  position_x: contextMenu.x,
                  position_y: contextMenu.y,
                });
                //setCards((prev) => [...prev, newCard]);
                setContextMenu({ x: 0, y: 0, type: null });
                await fetchCards();
              }}
            >
              + Create Card
            </button>
          )}
          {contextMenu.type === "card" && (
              <button
                className="block px-4 py-2 hover:bg-gray-100 w-full text-left text-red-600"
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
