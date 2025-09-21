package share

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"
)

type ShareHandler struct {
	DB *sql.DB
}

type PermissionHandler struct {
	DB *sql.DB
}

// Routes:
// - GET    /boards/{id}/share     (list all share links for board)
// - POST   /boards/{id}/share     (create new share link)
// - DELETE /boards/{id}/share     (delete a share link)
func (h *ShareHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := user.GetUserID(r)
	if userID == 0 {
		middleware.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Expecting /boards/{id}/share
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		middleware.JSONError(w, "Invalid path", http.StatusBadRequest)
		return
	}
	boardID, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		middleware.JSONError(w, "Invalid board ID", http.StatusBadRequest)
		return
	}

	// Only owner can manage share links
	perm, err := board.GetUserPermission(h.DB, userID, boardID)
	if err != nil {
		middleware.JSONError(w, "Failed to check permissions", http.StatusInternalServerError)
		return
	}
	if perm != board.PermissionOwner {
		middleware.JSONError(w, "Forbidden", http.StatusForbidden)
		return
	}

	switch r.Method {
	case http.MethodGet:
		shares, err := GetSharesByBoard(h.DB, boardID)
		if err != nil {
			middleware.JSONError(w, "Failed to fetch share links", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(shares)

	case http.MethodPost:
		var body struct {
			Permission string `json:"permission"` // "read" or "edit"
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if body.Permission != "read" && body.Permission != "edit" {
			middleware.JSONError(w, "Permission must be 'read' or 'edit'", http.StatusBadRequest)
			return
		}

		share, err := CreateShare(h.DB, boardID, body.Permission)
		if err != nil {
			middleware.JSONError(w, "Failed to create share link", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(share)

	case http.MethodDelete:
		var body struct {
			ShareID int64 `json:"share_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		affected, err := DeleteShare(h.DB, body.ShareID)
		if err != nil {
			middleware.JSONError(w, "Failed to delete share link", http.StatusInternalServerError)
			return
		}
		if affected == 0 {
			middleware.JSONError(w, "Share link not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})

	default:
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Routes: /permission/{token}
func (h *PermissionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		middleware.JSONError(w, "Invalid path", http.StatusBadRequest)
		return
	}
	token := parts[2]

	_, perm, err := board.GetSharePermission(h.DB, token)
	if err != nil {
		middleware.JSONError(w, "Failed to check share link", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"permission": perm})
}
