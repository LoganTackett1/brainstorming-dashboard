import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { AuthContext } from "../context/AuthContext";
import BoardSettingsMenu from "../components/BoardSettingsMenu";
import DraggableCard from "../components/DraggableCard";
import ImageCreateModal from "../components/ImageCreateModal";
import { type Board, type Card } from "../types";
import RefreshIcon from "@/assets/refresh.svg?react";
import ImageIcon from "@/assets/image.svg?react";
import DeleteIcon from "@/assets/delete.svg?react";

type Permission = "read" | "edit";
type AccessEntry = {
  id: number;
  board_id: number;
  user_id: number;
  email: string;
  permission: Permission;
  created_at: string;
};

const BoardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  const [board, setBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // collaborator permission (for non-owners)
  const [collabPerm, setCollabPerm] = useState<Permission | null>(null);

  // Right-click context menu
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

  // Image modal
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Stale polling banner state
  const [stale, setStale] = useState(false);

  // Canvas ref for relative positioning
  const boardRef = useRef<HTMLDivElement | null>(null);

  const fetchBoard = async () => {
    const data = await api.getBoardDetail(Number(id));
    setBoard(data);
  };

  const fetchCards = async () => {
    const data = await api.getCards(Number(id));
    setCards(data || []);
  };

  // Load board & cards
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!id) throw new Error("No board id");
        await fetchBoard();
        await fetchCards();
        setError(null);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "Failed to load board");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // If user is NOT owner, determine their permission (read/edit) from access list
  useEffect(() => {
    (async () => {
      if (!board || !user) return;
      if (board.owner_id === user.user_id) {
        setCollabPerm(null); // owner path
        return;
      }
      try {
        const acl = (await api.getBoardAccess(board.id)) as AccessEntry[];
        const mine: AccessEntry | undefined = Array.isArray(acl)
          ? acl.find(
              (a) =>
                a.user_id === user.user_id ||
                a.email?.toLowerCase() === (user.email ?? "").toLowerCase(),
            )
          : undefined;
        setCollabPerm(mine?.permission ?? "read");
      } catch {
        // If access list is not visible to collaborators, fall back to 'read' for safety.
        setCollabPerm("read");
      }
    })();
  }, [board, user]);

  const isOwner = useMemo(() => {
    if (!board || !user) return false;
    return board.owner_id === user.user_id;
  }, [board, user]);

  const permissionLabel: "Owner" | Permission | null = useMemo(() => {
    if (!board || !user) return null;
    if (isOwner) return "Owner";
    return collabPerm; // "edit" or "read"
  }, [board, user, isOwner, collabPerm]);

  // Whether the current user is allowed to edit on this page
  const canEdit: boolean = useMemo(() => {
    if (isOwner) return true;
    return collabPerm === "edit";
  }, [isOwner, collabPerm]);

  // Convert client coords to canvas-relative coords
  const toCanvasCoords = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    };
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu({ x: 0, y: 0, type: null });
    if (contextMenu.type) {
      window.addEventListener("click", handleClick);
    }
    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [contextMenu]);

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
        .sort((a, b) => a.id - b.id),
    );

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let ticking = false;

    const check = async () => {
      if (ticking) return;
      ticking = true;
      try {
        const latest = (await api.getCards(Number(id))) || [];
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
  }, [id, snapshot(cards)]);

  const handleRefresh = async () => {
    const detailData = await api.getBoardDetail(Number(id));
    const cardData = await api.getCards(Number(id));
    setBoard(detailData);
    setCards(cardData || []);
    setStale(false);
  };

  if (loading) return <div className="p-6">Loading board...</div>;
  if (error || !board) return <div className="p-6 text-red-600">Error: {error ?? "Unknown"}</div>;

  return (
    <div className="w-full">
      {/* Title + access chip */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <h2 className="text-2xl font-bold tracking-tight">{board.title}</h2>
        {permissionLabel && (
          <span
            className={`rounded-full border px-2 py-1 text-xs capitalize ${
              permissionLabel === "read" ? "opacity-90" : ""
            }`}
            style={{
              borderColor: "var(--border)",
              background: "var(--muted)",
              color: "var(--fg-muted)",
            }}
            title={isOwner ? "Owner" : permissionLabel}
          >
            {isOwner ? "Owner" : permissionLabel}
          </span>
        )}
      </div>

      {/* Settings cog for owner only */}
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

      {/* Canvas */}
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
          if (!canEdit) return; // lock board-level menu for read-only
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
            forceReadOnly={!canEdit}
            onRightClick={(x, y) => {
              if (!canEdit) return;
              const p = toCanvasCoords(x, y);
              setContextMenu({ x: p.x, y: p.y, type: "card", cardId: card.id });
            }}
          />
        ))}

        {/* Context menu (create/delete) only when canEdit */}
        {contextMenu.type && canEdit && (
          <div
            className="absolute z-50 overflow-hidden rounded-xl border shadow-lg"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
            onClick={() => setContextMenu({ x: 0, y: 0, type: null })}
          >
            {contextMenu.type === "board" && (
              <>
                <button
                  className="block w-full px-4 py-2 text-left hover:bg-[var(--muted)]"
                  onClick={async () => {
                    await api.createCard(board.id, {
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

                {/* Create Image */}
                <button
                  className="block w-full px-4 py-2 text-left hover:bg-[var(--muted)]"
                  onClick={() => {
                    setPendingPos({ x: contextMenu.x, y: contextMenu.y });
                    setContextMenu({ x: 0, y: 0, type: null });
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
                  if (contextMenu.cardId) {
                    await api.deleteCard(contextMenu.cardId);
                    setCards((prev) => prev.filter((c) => c.id !== contextMenu.cardId));
                  }
                  setContextMenu({ x: 0, y: 0, type: null });
                }}
              >
                <DeleteIcon className="inline h-5 w-5 text-red-600" /> Delete Card
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

      {/* Image Modal */}
      <ImageCreateModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onCreateUrl={async (u) => {
          await api.createCard(Number(id), {
            kind: "image",
            image_url: u,
            position_x: pendingPos.x,
            position_y: pendingPos.y,
          });
          await fetchCards();
        }}
        onUploadFile={async (file) => {
          const r = await api.uploadBoardImage(Number(id), file);
          await api.createCard(Number(id), {
            kind: "image",
            image_url: r.url,
            position_x: pendingPos.x,
            position_y: pendingPos.y,
          });
          await fetchCards();
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

export default BoardPage;
