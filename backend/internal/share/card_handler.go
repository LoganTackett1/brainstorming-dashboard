package share

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/card"
	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type ShareCardHandler struct {
	DB       *sql.DB
	S3Client *s3.Client
	Bucket   string
}

type createShareCardReq struct {
	Kind      string   `json:"kind"` // "text" | "image" (default: "text")
	Text      string   `json:"text,omitempty"`
	ImageURL  string   `json:"image_url,omitempty"`
	PositionX float64  `json:"position_x"`
	PositionY float64  `json:"position_y"`
	Width     *float64 `json:"width,omitempty"`  // images only
	Height    *float64 `json:"height,omitempty"` // images only
}

type updateShareCardReq struct {
	Text      *string  `json:"text,omitempty"`
	PositionX *float64 `json:"position_x,omitempty"`
	PositionY *float64 `json:"position_y,omitempty"`
	Width     *float64 `json:"width,omitempty"`  // images only
	Height    *float64 `json:"height,omitempty"` // images only
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

			var body createShareCardReq
			dec := json.NewDecoder(r.Body)
			if err := dec.Decode(&body); err != nil {
				middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
				return
			}

			kind := strings.ToLower(strings.TrimSpace(body.Kind))
			if kind == "" {
				kind = "text"
			}

			switch kind {
			case "text":
				if strings.TrimSpace(body.Text) == "" {
					body.Text = ""
				}
				id, err := card.CreateCard(h.DB, boardID, body.Text, body.PositionX, body.PositionY)
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

			case "image":
				if strings.TrimSpace(body.ImageURL) == "" {
					middleware.JSONError(w, "image_url is required for kind=image", http.StatusBadRequest)
					return
				}
				id, err := card.CreateImageCard(h.DB, boardID, body.ImageURL, body.PositionX, body.PositionY, body.Width, body.Height)
				if err != nil {
					middleware.JSONError(w, "Failed to create image card", http.StatusInternalServerError)
					return
				}
				json.NewEncoder(w).Encode(map[string]interface{}{
					"id":         id,
					"board_id":   boardID,
					"kind":       "image",
					"image_url":  body.ImageURL,
					"position_x": body.PositionX,
					"position_y": body.PositionY,
					"width":      body.Width,
					"height":     body.Height,
				})

			default:
				middleware.JSONError(w, "invalid kind (must be 'text' or 'image')", http.StatusBadRequest)
			}

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
			var kind string
			// Ensure the card belongs to this board + get kind for update rules
			if err := h.DB.QueryRow("SELECT kind FROM cards WHERE id = ? AND board_id = ?", cardID, boardID).Scan(&kind); err != nil {
				if err == sql.ErrNoRows {
					middleware.JSONError(w, "Card not found", http.StatusNotFound)
					return
				}
				middleware.JSONError(w, "Failed to fetch card", http.StatusInternalServerError)
				return
			}
			kind = strings.ToLower(strings.TrimSpace(kind))
			if kind == "" {
				kind = "text"
			}

			var body updateShareCardReq
			dec := json.NewDecoder(r.Body)
			if err := dec.Decode(&body); err != nil {
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
				// If text omitted, keep current text
				var txt string
				if body.Text == nil {
					if err := h.DB.QueryRow("SELECT text FROM cards WHERE id = ?", cardID).Scan(&txt); err != nil {
						middleware.JSONError(w, "Failed to fetch card text", http.StatusInternalServerError)
						return
					}
				} else {
					txt = *body.Text
				}

				affected, err := card.UpdateCard(h.DB, cardID, txt, x, y)
				if err != nil {
					middleware.JSONError(w, "Failed to update card", http.StatusInternalServerError)
					return
				}
				if affected == 0 {
					json.NewEncoder(w).Encode(map[string]string{"status": "no card found"})
					return
				}
				json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

			case "image":
				// Preserve existing width/height when omitted (prevents resetting to NULL)
				var curW, curH sql.NullFloat64
				if err := h.DB.QueryRow("SELECT width, height FROM cards WHERE id = ?", cardID).Scan(&curW, &curH); err != nil {
					middleware.JSONError(w, "Failed to fetch card size", http.StatusInternalServerError)
					return
				}

				var wPtr, hPtr *float64
				if body.Width != nil {
					wPtr = body.Width
				} else if curW.Valid {
					val := curW.Float64
					wPtr = &val
				}
				if body.Height != nil {
					hPtr = body.Height
				} else if curH.Valid {
					val := curH.Float64
					hPtr = &val
				}

				affected, err := card.UpdateImageCard(h.DB, cardID, x, y, wPtr, hPtr)
				if err != nil {
					middleware.JSONError(w, "Failed to update image card", http.StatusInternalServerError)
					return
				}
				if affected == 0 {
					json.NewEncoder(w).Encode(map[string]string{"status": "no card found"})
					return
				}
				json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

			default:
				middleware.JSONError(w, "invalid card kind", http.StatusBadRequest)
			}

		case http.MethodDelete:
			// 1) Look up info for S3 cleanup (ensure card belongs to this share's board)
			var kind, imageURL string
			if err := h.DB.QueryRow("SELECT kind, COALESCE(image_url, '') FROM cards WHERE id = ? AND board_id = ?", cardID, boardID).
				Scan(&kind, &imageURL); err != nil {
				if err == sql.ErrNoRows {
					json.NewEncoder(w).Encode(map[string]string{"status": "no card found"})
					return
				}
				middleware.JSONError(w, "Failed to fetch card", http.StatusInternalServerError)
				return
			}

			// 2) If image card, delete S3 object (best-effort)
			if kind == "image" && imageURL != "" && h.S3Client != nil && h.Bucket != "" {
				if idx := strings.LastIndex(imageURL, "images/"); idx != -1 {
					s3Key := imageURL[idx:] // e.g. "images/<boardID>/<uuid>.jpg"
					_, err := h.S3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
						Bucket: &h.Bucket,
						Key:    &s3Key,
					})
					if err != nil {
						log.Printf("WARN: failed to delete S3 object %s: %v", s3Key, err)
					}
				}
			}

			// 3) Delete DB row
			affected, err := card.DeleteCard(h.DB, cardID)
			if err != nil {
				middleware.JSONError(w, "Failed to delete card", http.StatusInternalServerError)
				return
			}
			if affected == 0 {
				json.NewEncoder(w).Encode(map[string]string{"status": "no card found"})
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
