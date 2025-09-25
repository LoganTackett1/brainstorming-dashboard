package share

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/awsclient"
	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
	"github.com/google/uuid"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type ShareImageUploadHandler struct {
	DB     *sql.DB
	S3     *s3.Client
	Bucket string
}

func NewShareImageUploadHandler(db *sql.DB) *ShareImageUploadHandler {
	return &ShareImageUploadHandler{
		DB:     db,
		S3:     awsclient.NewS3Client(),
		Bucket: os.Getenv("S3_BUCKET"),
	}
}

// POST /share/{token}/images  (multipart form: file=<file>)
// perms: edit only
func (h *ShareImageUploadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	// /share/{token}/images
	if len(parts) < 4 || parts[1] != "share" || parts[3] != "images" {
		middleware.JSONError(w, "Invalid path", http.StatusBadRequest)
		return
	}
	token := parts[2]

	boardID, perm, err := board.GetSharePermission(h.DB, token)
	if err != nil {
		middleware.JSONError(w, "Failed to check share link", http.StatusInternalServerError)
		return
	}
	if perm != board.PermissionEdit {
		middleware.JSONError(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		middleware.JSONError(w, "Invalid form data", http.StatusBadRequest)
		return
	}
	file, handler, err := r.FormFile("file")
	if err != nil {
		middleware.JSONError(w, "Missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(handler.Filename))
	if ext == "" {
		ext = ".bin"
	}
	key := fmt.Sprintf("images/%d/%s%s", boardID, uuid.New().String(), ext)

	_, err = h.S3.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      &h.Bucket,
		Key:         &key,
		Body:        file,
	})
	if err != nil {
		middleware.JSONError(w, "Failed to upload to S3", http.StatusInternalServerError)
		return
	}

	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", h.Bucket, os.Getenv("AWS_REGION"), key)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": url})
}
