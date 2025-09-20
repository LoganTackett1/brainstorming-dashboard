package board

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type ThumbnailHandler struct {
	DB       *sql.DB
	S3Client *s3.Client
	Bucket   string
}

func (h *ThumbnailHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := user.GetUserID(r)
	if userID == 0 {
		middleware.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodPost:
		// Parse form with a file
		err := r.ParseMultipartForm(10 << 20) // 10 MB limit
		if err != nil {
			log.Printf("Form parse error: %v", err)
			middleware.JSONError(w, "Invalid form data", http.StatusBadRequest)
			return
		}

		file, handler, err := r.FormFile("file")
		if err != nil {
			middleware.JSONError(w, "Missing file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		boardID := r.FormValue("board_id")
		if boardID == "" {
			middleware.JSONError(w, "Missing board_id", http.StatusBadRequest)
			return
		}

		// Verify board ownership
		var count int
		err = h.DB.QueryRow("SELECT COUNT(*) FROM boards WHERE id = ? AND owner_id = ?", boardID, userID).Scan(&count)
		if err != nil || count == 0 {
			middleware.JSONError(w, "Board not found or not owned by user", http.StatusForbidden)
			return
		}

		// Create S3 key
		key := fmt.Sprintf("thumbnails/%s%s", boardID, filepath.Ext(handler.Filename))

		// Upload to S3 (replaces old file if key already exists)
		_, err = h.S3Client.PutObject(context.TODO(), &s3.PutObjectInput{
			Bucket: &h.Bucket,
			Key:    &key,
			Body:   file,
		})
		if err != nil {
			log.Printf("S3 upload error: %v", err)
			middleware.JSONError(w, "Failed to upload to S3", http.StatusInternalServerError)
			return
		}

		// Construct URL
		url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s",
			h.Bucket, os.Getenv("AWS_REGION"), key)

		// Save to DB
		_, err = h.DB.Exec("UPDATE boards SET thumbnail_url = ? WHERE id = ? AND owner_id = ?", url, boardID, userID)
		if err != nil {
			middleware.JSONError(w, "Failed to update board", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"thumbnail_url": url})

	case http.MethodDelete:
		boardID := r.URL.Query().Get("board_id")
		if boardID == "" {
			middleware.JSONError(w, "Missing board_id", http.StatusBadRequest)
			return
		}

		// Verify board ownership
		var key string
		err := h.DB.QueryRow("SELECT thumbnail_url FROM boards WHERE id = ? AND owner_id = ?", boardID, userID).Scan(&key)
		if err == sql.ErrNoRows {
			middleware.JSONError(w, "Board not found or not owned by user", http.StatusForbidden)
			return
		} else if err != nil {
			middleware.JSONError(w, "Database error", http.StatusInternalServerError)
			return
		}

		// Clear DB field
		_, err = h.DB.Exec("UPDATE boards SET thumbnail_url = NULL WHERE id = ? AND owner_id = ?", boardID, userID)
		if err != nil {
			middleware.JSONError(w, "Failed to update board", http.StatusInternalServerError)
			return
		}

		// Delete from S3 if URL exists
		if key != "" {
			// Extract key from URL (after bucket hostname)
			// Example: https://bucket.s3.us-east-1.amazonaws.com/thumbnails/123.png
			s3Key := key[strings.Index(key, "thumbnails/"):]
			_, err = h.S3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
				Bucket: &h.Bucket,
				Key:    &s3Key,
			})
			if err != nil {
				middleware.JSONError(w, "Failed to delete from S3", http.StatusInternalServerError)
				return
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "thumbnail deleted"})

	default:
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
