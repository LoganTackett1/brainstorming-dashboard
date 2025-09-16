package boarddetail

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/card"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"
)

type BoardDetailHandler struct {
	DB *sql.DB
}

// Handles: GET /boards/{id}
func (h *BoardDetailHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// If path contains "cards", delegate to CardHandler
	if strings.Contains(path, "/cards") {
		cardHandler := &card.CardHandler{DB: h.DB}
		cardHandler.ServeHTTP(w, r)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := user.GetUserID(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !strings.HasPrefix(path, "/boards/") {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	parts := strings.Split(path, "/")
	if len(parts) < 3 {
		http.Error(w, "Invalid board ID", http.StatusBadRequest)
		return
	}

	boardID, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		http.Error(w, "Invalid board ID", http.StatusBadRequest)
		return
	}

	// Check user’s permission
	perm, err := board.GetUserPermission(h.DB, userID, boardID)
	if err != nil {
		http.Error(w, "Failed to check permissions", http.StatusInternalServerError)
		return
	}
	if perm == board.PermissionNone {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Fetch board metadata
	var b board.Board
	err = h.DB.QueryRow(
		"SELECT id, title, owner_id, created_at FROM boards WHERE id = ?",
		boardID,
	).Scan(&b.ID, &b.Title, &b.OwnerID, &b.CreatedAt)
	if err == sql.ErrNoRows {
		http.Error(w, "Board not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Failed to fetch board", http.StatusInternalServerError)
		return
	}

	// Fetch cards
	cards, err := card.GetCardsByBoard(h.DB, boardID)
	if err != nil {
		http.Error(w, "Failed to fetch cards", http.StatusInternalServerError)
		return
	}

	// Response payload
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
