import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { AuthContext } from "../context/AuthContext";
import BoardCard from "../components/BoardCard";
import BoardSettingsMenu from "../components/BoardSettingsMenu";
import { type Board } from "../types";

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [boards, setBoards] = useState<Board[]>([]);
    const [activeTab, setActiveTab] = useState<"owned" | "shared">("owned");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [settingsMenu, setSettingsMenu] = useState({ open: false, board: null as Board | null });

    useEffect(() => {
        fetchBoards();
    }, []);

    async function fetchBoards() {
        try {
            const data = await api.getBoards();
            setBoards(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="p-6">Loading boards...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-600">Error: {error}</div>;
    }

    const ownedBoards = boards.filter((b) => b.owner_id === user?.user_id);
    const sharedBoards = boards.filter((b) => b.owner_id !== user?.user_id);

    const displayedBoards = activeTab === "owned" ? ownedBoards : sharedBoards;

  return (
    <div className="p-6">
      <div className="bg-red-500 text-white p-4">Tailwind is working!</div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("owned")}
          className={`px-4 py-2 rounded ${
            activeTab === "owned"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Owned Boards
        </button>
        <button
          onClick={() => setActiveTab("shared")}
          className={`px-4 py-2 rounded ${
            activeTab === "shared"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Shared Boards
        </button>
      </div>

      {/* Owned tab only: Create Board */}
      {activeTab === "owned" && (
        <button
          onClick={async () => {
            const title = prompt("Enter new board title:");
            if (title) {
              try {
                const newBoard = await api.createBoard(title);
                await fetchBoards();
              } catch (err: any) {
                alert(err.message);
              }
            }
          }}
          className="mb-6 px-4 py-2 bg-green-600 text-white rounded"
        >
          + Create Board
        </button>
      )}

      {/* Boards grid */}
      {displayedBoards.length === 0 ? (
        <p>No boards here yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displayedBoards.map((board) => (
            <BoardCard key={board.id} board={board} setSettingsMenu={setSettingsMenu} />
          ))}
        </div>
      )}
      { settingsMenu.open && settingsMenu.board && (
        <BoardSettingsMenu 
          board={settingsMenu.board} 
          closeMenu={() => setSettingsMenu({ open: false, board: null })} 
          refreshBoards={fetchBoards}
        />
      )}
    </div>
  );
};

export default Dashboard;
