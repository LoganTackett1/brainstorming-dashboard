package share

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/card"
	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
)

type ShareCardHandler struct {
	DB *sql.DB
}

// Handles:
// - GET    /share/{token}/cards
// - POST   /share/{token}/cards
// - PUT    /share/{token}/cards/{id}
// - DELETE /share/{token}/cards/{id}
func (h *ShareCardHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	parts := strings.Split(path, "/")
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

	// --- Subroute: /share/{token}/cards ---
	if len(parts) == 4 && parts[3] == "cards" {
		switch r.Method {
		case http.MethodGet:
			cards, err := card.GetCardsByBoard(h.DB, boardID)
			if err != nil {
				middleware.JSONError(w, "Failed to fetch cards", http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(cards)

		case http.MethodPost:
			if perm != board.PermissionEdit {
				middleware.JSONError(w, "Forbidden", http.StatusForbidden)
				return
			}
			var body struct {
				Text string  `json:"text"`
				X    float64 `json:"position_x"`
				Y    float64 `json:"position_y"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
				return
			}
			id, err := card.CreateCard(h.DB, boardID, body.Text, body.X, body.Y)
			if err != nil {
				middleware.JSONError(w, "Failed to create card", http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":    id,
				"text":  body.Text,
				"x":     body.X,
				"y":     body.Y,
				"board": boardID,
			})

		default:
			middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// --- Subroute: /share/{token}/cards/{id} ---
	if len(parts) == 5 && parts[3] == "cards" {
		cardID, err := strconv.ParseInt(parts[4], 10, 64)
		if err != nil {
			middleware.JSONError(w, "Invalid card ID", http.StatusBadRequest)
			return
		}

		if perm != board.PermissionEdit {
			middleware.JSONError(w, "Forbidden", http.StatusForbidden)
			return
		}

		switch r.Method {
		case http.MethodPut:
			var body struct {
				Text string  `json:"text"`
				X    float64 `json:"position_x"`
				Y    float64 `json:"position_y"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
				return
			}
			affected, err := card.UpdateCard(h.DB, cardID, body.Text, body.X, body.Y)
			if err != nil {
				middleware.JSONError(w, "Failed to update card", http.StatusInternalServerError)
				return
			}
			if affected == 0 {
				middleware.JSONError(w, "Card not found", http.StatusNotFound)
				return
			}
			json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

		case http.MethodDelete:
			affected, err := card.DeleteCard(h.DB, cardID)
			if err != nil {
				middleware.JSONError(w, "Failed to delete card", http.StatusInternalServerError)
				return
			}
			if affected == 0 {
				middleware.JSONError(w, "Card not found", http.StatusNotFound)
				return
			}
			json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})

		default:
			middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// If none matched
	middleware.JSONError(w, "Not found", http.StatusNotFound)
}
