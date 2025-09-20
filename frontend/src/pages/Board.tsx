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

const BoardPage: React.FC = () => {
  const nodeRefs = useRef<Map<number, React.RefObject<HTMLDivElement>>>(new Map());
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settingsMenu, setSettingsMenu] = useState({
    open: false,
    board: null as Board | null,
  });

  useEffect(() => {
    if (id) {
      fetchBoard();
      fetchCards();
    }
  }, [id]);

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
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
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
        <DraggableCard key={card.id} card={card} setCards={setCards} />
      ))}


      {/* Settings Menu */}
      {settingsMenu.open && settingsMenu.board && (
        <BoardSettingsMenu
          board={settingsMenu.board}
          closeMenu={() => setSettingsMenu({ open: false, board: null })}
          refreshBoards={ () => {} }
        />
      )}
    </div>
  );
};

export default BoardPage;
