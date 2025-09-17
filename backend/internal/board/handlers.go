package board

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"
)

type BoardHandler struct {
	DB *sql.DB
}

func (h *BoardHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := user.GetUserID(r)
	if userID == 0 {
		middleware.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		boards, err := GetBoards(h.DB, userID)
		if err != nil {
			middleware.JSONError(w, "Failed to fetch boards", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(boards)

	case http.MethodPost:
		var body struct {
			Title string `json:"title"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		id, err := CreateBoard(h.DB, userID, body.Title)
		if err != nil {
			middleware.JSONError(w, "Failed to create board", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":    id,
			"title": body.Title,
		})

	case http.MethodPut:
		var body struct {
			ID    int64  `json:"id"`
			Title string `json:"title"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if err := UpdateBoard(h.DB, body.ID, userID, body.Title); err != nil {
			middleware.JSONError(w, "Failed to update board", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

	case http.MethodDelete:
		var body struct {
			ID int64 `json:"id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		affected, err := DeleteBoard(h.DB, body.ID, userID)
		if err != nil {
			middleware.JSONError(w, "Failed to delete board", http.StatusInternalServerError)
			return
		}
		if affected == 0 {
			middleware.JSONError(w, "Board not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})

	default:
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
