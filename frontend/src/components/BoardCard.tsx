import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import BoardSettingsMenu from "./BoardSettingsMenu";
import { type Board } from "../types";

interface BoardCardProps {
  board: Board;
  setSettingsMenu: React.Dispatch<React.SetStateAction<{ open: boolean; board: Board | null }>>;
}

const BoardCard: React.FC<BoardCardProps> = ({ board, setSettingsMenu }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const isOwner = board.owner_id === user?.user_id;

  return (
    <div className="w-full h-full p-4 border">
      {/* Thumbnail */}
      {board.thumbnail_url ? (
        <img
          src={`${board.thumbnail_url}?t=${new Date().getTime()}`} 
          alt={board.title}
          className="w-5/6 h-auto mb-2"
          onClick={() => navigate(`/board/${board.id}`)}
        />
      ) : (
        <div
          className="w-full h-32 bg-gray-200 flex items-center justify-center text-gray-500 rounded mb-2 cursor-pointer"
          onClick={() => navigate(`/board/${board.id}`)}
        >
          No Thumbnail
        </div>
      )}

      {/* Title */}
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => navigate(`/board/${board.id}`)}
      >
        <span>{board.title}</span>
      </div>

      {/* Settings Cog */}
      {isOwner && (
        <button
          onClick={() => setSettingsMenu({ open: true, board })}
          className="text-gray-500 hover:text-gray-800"
        >
          ⚙️
        </button>
      )}
    </div>
  );
};

export default BoardCard;
