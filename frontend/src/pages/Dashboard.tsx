import React, { useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { AuthContext } from "../context/AuthContext";
import BoardCard from "../components/BoardCard";
import BoardSettingsMenu from "../components/BoardSettingsMenu";
import { type Board } from "../types";
import CreateBoardModal from "../components/CreateBoardModal";

type TabKey = "owned" | "shared";

const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("owned");

  const [createOpen, setCreateOpen] = useState(false);

  const [settingsMenu, setSettingsMenu] = useState<{
    open: boolean;
    board: Board | null;
  }>({ open: false, board: null });

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const data = await api.getBoards();
      setBoards(data || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const ownedBoards = useMemo(
    () => boards.filter((b) => b.owner_id === user?.user_id),
    [boards, user],
  );
  const sharedBoards = useMemo(
    () => boards.filter((b) => b.owner_id !== user?.user_id),
    [boards, user],
  );

  const displayedBoards = activeTab === "owned" ? ownedBoards : sharedBoards;

  return (
    <div className="space-y-6">
      {/* Header row: title, tabs, create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <div
            className="inline-flex overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              onClick={() => setActiveTab("owned")}
              className={`px-4 py-2 text-sm ${
                activeTab === "owned" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"
              }`}
            >
              Owned
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`px-4 py-2 text-sm ${
                activeTab === "shared" ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"
              }`}
            >
              Shared with me
            </button>
          </div>
        </div>

        {/* New Board button */}
        <div className="flex items-center gap-2">
          <button className="btn btn-accent" onClick={() => setCreateOpen(true)}>
            + New board
          </button>
        </div>
      </div>

      {/* Data states */}
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {/* Boards grid */}
      {!loading && !error && (
        <>
          {displayedBoards.length === 0 ? (
            <div className="text-[var(--fg-muted)]">
              {activeTab === "owned"
                ? "You don’t own any boards yet. Create one to get started."
                : "No boards have been shared with you yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayedBoards.map((b) => (
                <BoardCard key={b.id} board={b} setSettingsMenu={setSettingsMenu} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Settings Modal (unchanged behavior) */}
      {settingsMenu.open && settingsMenu.board && (
        <BoardSettingsMenu
          board={settingsMenu.board}
          closeMenu={() => setSettingsMenu({ open: false, board: null })}
          refreshBoards={fetchBoards}
        />
      )}

      <CreateBoardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchBoards /* whatever you already use to refresh */}
      />
    </div>
  );
};

export default Dashboard;
