package card

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/awsclient"
	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"
	"github.com/google/uuid"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type BoardImageUploadHandler struct {
	DB     *sql.DB
	S3     *s3.Client
	Bucket string
}

func NewBoardImageUploadHandler(db *sql.DB) *BoardImageUploadHandler {
	return &BoardImageUploadHandler{
		DB:     db,
		S3:     awsclient.NewS3Client(),
		Bucket: os.Getenv("S3_BUCKET"),
	}
}

// POST /boards/{id}/images   (multipart form: file=<file>)
// perms: owner or edit
func (h *BoardImageUploadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := user.GetUserID(r)
	if userID == 0 {
		middleware.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if r.Method != http.MethodPost {
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	// /boards/{id}/images → ["", "boards", "{id}", "images"]
	if len(parts) < 4 || parts[1] != "boards" || parts[3] != "images" {
		middleware.JSONError(w, "Invalid path", http.StatusBadRequest)
		return
	}
	boardID, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		middleware.JSONError(w, "Invalid board ID", http.StatusBadRequest)
		return
	}

	// Allow owner OR collaborators with edit permission
	perm, err := board.GetUserPermission(h.DB, userID, boardID)
	if err != nil {
		middleware.JSONError(w, "Failed to check permissions", http.StatusInternalServerError)
		return
	}
	if perm != board.PermissionOwner && perm != board.PermissionEdit {
		middleware.JSONError(w, "Forbidden", http.StatusForbidden)
		return
	}

	// 10 MB max like your thumbnail handler
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

	// S3 key: images/{boardID}/{uuid}.{ext}
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
