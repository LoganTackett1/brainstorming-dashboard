package boardaccess

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

type BoardAccessHandler struct {
	DB *sql.DB
}

func (h *BoardAccessHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := user.GetUserID(r)
	if userID == 0 {
		middleware.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Expecting routes like: /boards/{id}/access
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 4 {
		middleware.JSONError(w, "Invalid path", http.StatusBadRequest)
		return
	}

	boardID, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		middleware.JSONError(w, "Invalid board ID", http.StatusBadRequest)
		return
	}

	// Check ownership (only owner can manage access)
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
		// List all access entries
		accessList, err := GetBoardAccessList(h.DB, boardID)
		if err != nil {
			middleware.JSONError(w, "Failed to fetch access list", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(accessList)

	case http.MethodPost:
		// Add or update access
		var body struct {
			UserID     int64  `json:"user_id"`
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

		_, err := GrantAccess(h.DB, boardID, body.UserID, body.Permission)
		if err != nil {
			middleware.JSONError(w, "Failed to grant access", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "granted"})

	case http.MethodDelete:
		// Remove access
		var body struct {
			UserID int64 `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		affected, err := RevokeAccess(h.DB, boardID, body.UserID)
		if err != nil {
			middleware.JSONError(w, "Failed to revoke access", http.StatusInternalServerError)
			return
		}
		if affected == 0 {
			middleware.JSONError(w, "No access entry found", http.StatusNotFound)
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"status": "revoked"})

	default:
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
