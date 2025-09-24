package card

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"
)

type CardHandler struct {
	DB *sql.DB
}

type CardOnlyHandler struct {
	DB *sql.DB
}

type createCardReq struct {
	Kind      string   `json:"kind"` // "text" | "image" (default: "text")
	Text      string   `json:"text,omitempty"`
	ImageURL  string   `json:"image_url,omitempty"`
	PositionX float64  `json:"position_x"`
	PositionY float64  `json:"position_y"`
	Width     *float64 `json:"width,omitempty"`
	Height    *float64 `json:"height,omitempty"`
}

type updateCardReq struct {
	Text      *string  `json:"text,omitempty"`
	PositionX *float64 `json:"position_x,omitempty"`
	PositionY *float64 `json:"position_y,omitempty"`
	Width     *float64 `json:"width,omitempty"`  // images only
	Height    *float64 `json:"height,omitempty"` // images only
}

// Routes handled:
// - POST   /boards/{id}/cards
// - GET    /boards/{id}/cards
// - PUT    /cards/{id}
// - DELETE /cards/{id}
func (h *CardHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := user.GetUserID(r)
	if userID == 0 {
		middleware.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path

	// --- Board-scoped routes: /boards/{id}/cards ---
	if strings.HasPrefix(path, "/boards/") && strings.HasSuffix(path, "/cards") {
		parts := strings.Split(path, "/")
		if len(parts) < 3 {
			middleware.JSONError(w, "Invalid board ID", http.StatusBadRequest)
			return
		}
		boardID, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil {
			middleware.JSONError(w, "Invalid board ID", http.StatusBadRequest)
			return
		}

		// Check permissions for this board
		perm, err := board.GetUserPermission(h.DB, userID, boardID)
		if err != nil {
			middleware.JSONError(w, "Failed to check permissions", http.StatusInternalServerError)
			return
		}

		switch r.Method {
		//POST Create Card
		case http.MethodPost:
			if perm != board.PermissionOwner && perm != board.PermissionEdit {
				middleware.JSONError(w, "Forbidden", http.StatusForbidden)
				return
			}

			var body createCardReq
			dec := json.NewDecoder(r.Body)
			if err := dec.Decode(&body); err != nil {
				middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
				return
			}

			kind := strings.ToLower(strings.TrimSpace(body.Kind))
			if kind == "" {
				kind = "text" // default
			}

			switch kind {
			//Create Text Card
			case "text":
				if strings.TrimSpace(body.Text) == "" {
					body.Text = ""
				}
				id, err := CreateCard(h.DB, boardID, body.Text, body.PositionX, body.PositionY)
				if err != nil {
					middleware.JSONError(w, "Failed to create card", http.StatusInternalServerError)
					return
				}
				json.NewEncoder(w).Encode(map[string]interface{}{
					"id":         id,
					"board_id":   boardID,
					"kind":       "text",
					"text":       body.Text,
					"position_x": body.PositionX,
					"position_y": body.PositionY,
				})
			//Create Image Card
			case "image":
				if strings.TrimSpace(body.ImageURL) == "" {
					middleware.JSONError(w, "image_url is required for kind=image", http.StatusBadRequest)
					return
				}
				id, err := CreateImageCard(h.DB, boardID, body.ImageURL, body.PositionX, body.PositionY, body.Width, body.Height)
				if err != nil {
					middleware.JSONError(w, "Failed to create image card", http.StatusInternalServerError)
					return
				}
				json.NewEncoder(w).Encode(map[string]interface{}{
					"id":          id,
					"board_id":    boardID,
					"kind":        "image",
					"image_url":   body.ImageURL,
					"position_x":  body.PositionX,
					"position_y":  body.PositionY,
					"width":       body.Width,
					"height":      body.Height,
				})

			default:
				middleware.JSONError(w, "invalid kind (must be 'text' or 'image')", http.StatusBadRequest)
			}

		case http.MethodGet:
			if perm == board.PermissionNone {
				middleware.JSONError(w, "Forbidden", http.StatusForbidden)
				return
			}
			cards, err := GetCardsByBoard(h.DB, boardID)
			if err != nil {
				middleware.JSONError(w, "Failed to fetch cards", http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(cards)

		default:
			middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// --- No matching route ---
	middleware.JSONError(w, "Not found", http.StatusNotFound)
}

func (h *CardOnlyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := user.GetUserID(r)
	if userID == 0 {
		middleware.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path

	// --- Card-specific routes: /cards/{id} ---
	if strings.HasPrefix(path, "/cards/") {
		parts := strings.Split(path, "/")
		cardID, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil {
			middleware.JSONError(w, "Invalid card ID", http.StatusBadRequest)
			return
		}

		// Find the board ID for this card so we can check permissions
		var boardID int64
		err = h.DB.QueryRow("SELECT board_id FROM cards WHERE id = ?", cardID).Scan(&boardID)
		if err == sql.ErrNoRows {
			middleware.JSONError(w, "Card not found", http.StatusNotFound)
			return
		}
		if err != nil {
			middleware.JSONError(w, "Failed to fetch card", http.StatusInternalServerError)
			return
		}

		perm, err := board.GetUserPermission(h.DB, userID, boardID)
		if err != nil {
			middleware.JSONError(w, "Failed to check permissions", http.StatusInternalServerError)
			return
		}

		switch r.Method {
		case http.MethodPut:
			if perm != board.PermissionOwner && perm != board.PermissionEdit {
				middleware.JSONError(w, "Forbidden", http.StatusForbidden)
				return
			}

			// Find the card kind so we know what fields are allowed
			var kind string
			if err := h.DB.QueryRow("SELECT kind FROM cards WHERE id = ?", cardID).Scan(&kind); err != nil {
				if err == sql.ErrNoRows {
					middleware.JSONError(w, "Card not found", http.StatusNotFound)
					return
				}
				middleware.JSONError(w, "Failed to fetch card", http.StatusInternalServerError)
				return
			}
			kind = strings.ToLower(strings.TrimSpace(kind))
			if kind == "" {
				kind = "text" // legacy rows default
			}

			var body updateCardReq
			dec := json.NewDecoder(r.Body)
			if err := dec.Decode(&body); err != nil {
				log.Print(err)
				middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
				return
			}

			// Default current positions if not provided
			var curX, curY float64
			if body.PositionX == nil || body.PositionY == nil {
				if err := h.DB.QueryRow("SELECT position_x, position_y FROM cards WHERE id = ?", cardID).Scan(&curX, &curY); err != nil {
					middleware.JSONError(w, "Failed to fetch card position", http.StatusInternalServerError)
					return
				}
			}
			x := curX
			y := curY
			if body.PositionX != nil {
				x = *body.PositionX
			}
			if body.PositionY != nil {
				y = *body.PositionY
			}

			switch kind {
			case "text":
				// For text cards we update text + position
				// If text is omitted, keep the existing one (read it)
				txt := ""
				if body.Text == nil {
					if err := h.DB.QueryRow("SELECT text FROM cards WHERE id = ?", cardID).Scan(&txt); err != nil {
						middleware.JSONError(w, "Failed to fetch card text", http.StatusInternalServerError)
						return
					}
				} else {
					txt = *body.Text
				}

				affected, err := UpdateCard(h.DB, cardID, txt, x, y)
				if err != nil {
					middleware.JSONError(w, "Failed to update card", http.StatusInternalServerError)
					return
				}
				if affected == 0 {
					json.NewEncoder(w).Encode(map[string]string{"status": "no rows affected"})
					return
				}
				json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

			case "image":
				// For image cards, allow position/size updates.
				affected, err := UpdateImageCard(h.DB, cardID, x, y, body.Width, body.Height)
				if err != nil {
					middleware.JSONError(w, "Failed to update image card", http.StatusInternalServerError)
					return
				}
				if affected == 0 {
					json.NewEncoder(w).Encode(map[string]string{"status": "no rows affected"})
					return
				}
				json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

			default:
				middleware.JSONError(w, "invalid card kind", http.StatusBadRequest)
			}

		case http.MethodDelete:
			if perm != board.PermissionOwner && perm != board.PermissionEdit {
				middleware.JSONError(w, "Forbidden", http.StatusForbidden)
				return
			}
			affected, err := DeleteCard(h.DB, cardID)
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

	// --- No matching route ---
	middleware.JSONError(w, "Not found", http.StatusNotFound)
}
