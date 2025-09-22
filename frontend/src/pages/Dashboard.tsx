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
    <div className="space-y-6">
      {/* Title + tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div
          className="inline-flex overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setActiveTab("owned")}
            className={`px-4 py-2 text-sm ${activeTab === "owned" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`}
          >
            Owned
          </button>
          <button
            onClick={() => setActiveTab("shared")}
            className={`px-4 py-2 text-sm ${activeTab === "shared" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`}
          >
            Shared with me
          </button>
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayedBoards.map((b) => (
            <BoardCard key={b.id} board={b} setSettingsMenu={setSettingsMenu} />
          ))}
        </div>
      )}

      {/* Settings Menu */}
      {settingsMenu.open && settingsMenu.board && (
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
