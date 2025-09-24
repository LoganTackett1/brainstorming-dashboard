import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { type Board } from "../types";
import GearIcon from "@/assets/gear.svg?react";
import BoardIcon from "@/assets/board.svg?react";

interface BoardCardProps {
  board: Board;
  setSettingsMenu: React.Dispatch<React.SetStateAction<{ open: boolean; board: Board | null }>>;
}

const BoardCard: React.FC<BoardCardProps> = ({ board, setSettingsMenu }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isOwner = board.owner_id === user?.user_id;

  const go = () => navigate(`/boards/${board.id}`);

  return (
    <div
      className="group card cursor-pointer overflow-hidden transition hover:shadow-md"
      onClick={go}
      role="button"
    >
      {/* Top: thumbnail area, no padding, consistent size */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]">
        {board.thumbnail_url ? (
          <img
            src={board.thumbnail_url}
            alt={board.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl opacity-60">
            <BoardIcon className="h-14 w-14 text-[var(--fg-muted)] hover:text-[var(--fg)]" />
          </div>
        )}
      </div>

      {/* Bottom: title + settings */}
      <div className="flex items-center justify-between p-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{board.title}</h3>
        </div>

        {isOwner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSettingsMenu({ open: true, board });
            }}
            className="rounded-lg p-2 text-gray-500 hover:bg-[var(--muted)] hover:text-gray-900"
            aria-label="Board settings"
            title="Board settings"
          >
            <GearIcon className="h-5 w-5 text-[var(--fg-muted)] hover:text-[var(--fg)]" />
          </button>
        )}
      </div>
    </div>
  );
};

export default BoardCard;
