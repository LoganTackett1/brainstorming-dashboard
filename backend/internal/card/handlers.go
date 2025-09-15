package card

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

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

		switch r.Method {
		case http.MethodPost:
			var body struct {
				Text string  `json:"text"`
				X    float64 `json:"position_x"`
				Y    float64 `json:"position_y"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "Invalid request body", http.StatusBadRequest)
				return
			}
			id, err := CreateCard(h.DB, userID, boardID, body.Text, body.X, body.Y)
			if err != nil {
				http.Error(w, err.Error(), http.StatusForbidden)
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
			cards, err := GetCardsByBoard(h.DB, userID, boardID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusForbidden)
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

		switch r.Method {
		case http.MethodPut:
			var body struct {
				Text string  `json:"text"`
				X    float64 `json:"position_x"`
				Y    float64 `json:"position_y"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "Invalid request body", http.StatusBadRequest)
				return
			}
			affected, err := UpdateCard(h.DB, userID, cardID, body.Text, body.X, body.Y)
			if err != nil {
				http.Error(w, "Failed to update card", http.StatusInternalServerError)
				return
			}
			if affected == 0 {
				http.Error(w, "Card not found or not owned by user", http.StatusNotFound)
				return
			}
			json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

		case http.MethodDelete:
			affected, err := DeleteCard(h.DB, userID, cardID)
			if err != nil {
				http.Error(w, "Failed to delete card", http.StatusInternalServerError)
				return
			}
			if affected == 0 {
				http.Error(w, "Card not found or not owned by user", http.StatusNotFound)
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
