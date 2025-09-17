package share

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/card"
	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
)

type ShareDetailHandler struct {
	DB *sql.DB
}

// Handles: GET /share/{token}
func (h *ShareDetailHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		middleware.JSONError(w, "Invalid share link", http.StatusBadRequest)
		return
	}
	token := parts[2]

	boardID, perm, err := board.GetSharePermission(h.DB, token)
	if err != nil {
		middleware.JSONError(w, "Failed to check share link", http.StatusInternalServerError)
		return
	}
	if perm == board.PermissionNone {
		middleware.JSONError(w, "Invalid or expired share link", http.StatusForbidden)
		return
	}

	// Fetch baord
	var b board.Board
	err = h.DB.QueryRow(
		"SELECT id, title, owner_id, created_at FROM boards WHERE id = ?",
		boardID,
	).Scan(&b.ID, &b.Title, &b.OwnerID, &b.CreatedAt)
	if err == sql.ErrNoRows {
		middleware.JSONError(w, "Board not found", http.StatusNotFound)
		return
	}
	if err != nil {
		middleware.JSONError(w, "Failed to fetch board", http.StatusInternalServerError)
		return
	}

	// Fetch cards
	cards, err := card.GetCardsByBoard(h.DB, boardID)
	if err != nil {
		middleware.JSONError(w, "Failed to fetch cards", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"id":         b.ID,
		"title":      b.Title,
		"owner_id":   b.OwnerID,
		"permission": perm,
		"cards":      cards,
		"created_at": b.CreatedAt,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
