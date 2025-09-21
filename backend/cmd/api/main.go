package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/awsclient"
	"github.com/LoganTackett1/brainstorming-backend/internal/board"
	"github.com/LoganTackett1/brainstorming-backend/internal/boardaccess"
	"github.com/LoganTackett1/brainstorming-backend/internal/boarddetail"
	"github.com/LoganTackett1/brainstorming-backend/internal/card"
	"github.com/LoganTackett1/brainstorming-backend/internal/db"
	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
	"github.com/LoganTackett1/brainstorming-backend/internal/share"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"

	"github.com/joho/godotenv"
)

func init() {
	godotenv.Load()
}

var database *sql.DB

func main() {
	var err error
	database, err = db.NewMySQL()
	if err != nil {
		log.Fatal(err)
	}

	// --- AWS S3 ---
	s3Client := awsclient.NewS3Client()
	bucket := os.Getenv("S3_BUCKET")
	thumbnailHandler := &board.ThumbnailHandler{DB: database, S3Client: s3Client, Bucket: bucket}

	// --- User Routes ---
	signupHandler := &user.SignupHandler{DB: database}
	loginHandler := &user.LoginHandler{DB: database}
	meHandler := &user.MeHandler{DB: database}
	emailHandler := &user.EmailHandler{DB: database}
	http.Handle("/signup", signupHandler)
	http.Handle("/login", loginHandler)
	http.Handle("/me", user.AuthMiddleware(meHandler))
	http.Handle("/emailToID", user.AuthMiddleware(emailHandler))

	// --- Board Routes ---
	boardHandler := &board.BoardHandler{DB: database}
	http.Handle("/boards", user.AuthMiddleware(boardHandler)) // exact match only

	// --- Card Routes ---
	cardOnlyHandler := &card.CardOnlyHandler{DB: database}
	http.Handle("/cards/", user.AuthMiddleware(cardOnlyHandler)) // exact match only

	// --- /boards/ dispatch to sub-handlers ---
	http.Handle("/boards/", user.AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		switch {
		case strings.HasSuffix(path, "/cards"):
			cardHandler := &card.CardHandler{DB: database}
			cardHandler.ServeHTTP(w, r)
			return

		case strings.HasSuffix(path, "/access"):
			accessHandler := &boardaccess.BoardAccessHandler{DB: database}
			accessHandler.ServeHTTP(w, r)
			return

		case strings.HasSuffix(path, "/share"):
			shareHandler := &share.ShareHandler{DB: database}
			shareHandler.ServeHTTP(w, r)
			return

		case strings.HasSuffix(path, "/thumbnail"):
			thumbnailHandler.ServeHTTP(w, r)
			return

		default:
			// fallback /boards/{id}
			detailHandler := &boarddetail.BoardDetailHandler{DB: database}
			detailHandler.ServeHTTP(w, r)
			return
		}
	})))

	// --- Share routes ---
	http.Handle("/share/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		if strings.HasSuffix(path, "/cards") || strings.Contains(path, "/cards/") {
			shareCardHandler := &share.ShareCardHandler{DB: database}
			shareCardHandler.ServeHTTP(w, r)
			return
		}

		// fallback /share/{token}
		shareDetailHandler := &share.ShareDetailHandler{DB: database}
		shareDetailHandler.ServeHTTP(w, r)
	}))

	log.Println("Server running on :8080")
	http.ListenAndServe(":8080", middleware.CORS(http.DefaultServeMux))
}

// test users (tokens expire 9/16/2025):
// test@example.com mypassword eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgxNzMyMjMsInN1YiI6MX0.OsZcexnuZtciNoIOTl5RylYKOe8VzKys3iQT7f7ahns
// test2@email.com password123 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgxNzU0MTgsInN1YiI6Mn0.RNYlbbUdaDVAbNB5wxUjuoLi2p0jXFPmttH4sybgbZs
// test3@example.com mypassword3 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTg0MDQ3MzksInN1YiI6M30.wImBNPh19_wAp6XThXMRqBPLpWhZzW4HDDBdJFNWnrE
// test5@example.com mypassword5
