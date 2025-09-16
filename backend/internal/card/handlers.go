package card

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"
)

type CardHandler struct {
	DB *sql.DB
}

// Routes handled:
// - POST   /boards/{id}/cards
// - GET    /boards/{id}/cards
// - PUT    /cards/{id}
// - DELETE /cards/{id}
func (h *CardHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := user.GetUserID(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path

	// --- Board-scoped routes: /boards/{id}/cards ---
	if strings.HasPrefix(path, "/boards/") && strings.HasSuffix(path, "/cards") {
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

		// Check permissions for this board
		perm, err := board.GetUserPermission(h.DB, userID, boardID)
		if err != nil {
			http.Error(w, "Failed to check permissions", http.StatusInternalServerError)
			return
		}

		switch r.Method {
		case http.MethodPost:
			if perm != board.PermissionOwner && perm != board.PermissionEdit {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			var body struct {
				Text string  `json:"text"`
				X    float64 `json:"position_x"`
				Y    float64 `json:"position_y"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "Invalid request body", http.StatusBadRequest)
				return
			}
			id, err := CreateCard(h.DB, boardID, body.Text, body.X, body.Y)
			if err != nil {
				http.Error(w, "Failed to create card", http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":    id,
				"text":  body.Text,
				"x":     body.X,
				"y":     body.Y,
				"board": boardID,
			})

		case http.MethodGet:
			if perm == board.PermissionNone {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			cards, err := GetCardsByBoard(h.DB, boardID)
			if err != nil {
				http.Error(w, "Failed to fetch cards", http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(cards)

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// --- Card-specific routes: /cards/{id} ---
	if strings.HasPrefix(path, "/cards/") {
		parts := strings.Split(path, "/")
		cardID, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil {
			http.Error(w, "Invalid card ID", http.StatusBadRequest)
			return
		}

		// Find the board ID for this card so we can check permissions
		var boardID int64
		err = h.DB.QueryRow("SELECT board_id FROM cards WHERE id = ?", cardID).Scan(&boardID)
		if err == sql.ErrNoRows {
			http.Error(w, "Card not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Failed to fetch card", http.StatusInternalServerError)
			return
		}

		perm, err := board.GetUserPermission(h.DB, userID, boardID)
		if err != nil {
			http.Error(w, "Failed to check permissions", http.StatusInternalServerError)
			return
		}

		switch r.Method {
		case http.MethodPut:
			if perm != board.PermissionOwner && perm != board.PermissionEdit {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			var body struct {
				Text string  `json:"text"`
				X    float64 `json:"position_x"`
				Y    float64 `json:"position_y"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "Invalid request body", http.StatusBadRequest)
				return
			}
			affected, err := UpdateCard(h.DB, cardID, body.Text, body.X, body.Y)
			if err != nil {
				http.Error(w, "Failed to update card", http.StatusInternalServerError)
				return
			}
			if affected == 0 {
				http.Error(w, "Card not found", http.StatusNotFound)
				return
			}
			json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

		case http.MethodDelete:
			if perm != board.PermissionOwner && perm != board.PermissionEdit {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			affected, err := DeleteCard(h.DB, cardID)
			if err != nil {
				http.Error(w, "Failed to delete card", http.StatusInternalServerError)
				return
			}
			if affected == 0 {
				http.Error(w, "Card not found", http.StatusNotFound)
				return
			}
			json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// --- No matching route ---
	http.Error(w, "Not found", http.StatusNotFound)
}
