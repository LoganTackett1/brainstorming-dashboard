package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/LoganTackett1/brainstorming-backend/internal/card"
	"github.com/LoganTackett1/brainstorming-backend/internal/db"
	"github.com/LoganTackett1/brainstorming-backend/internal/user"

	"github.com/LoganTackett1/brainstorming-backend/internal/board"

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

	//User Routes / Handlers:
	signupHandler := &user.SignupHandler{DB: database}
	loginHandler := &user.LoginHandler{DB: database}
	meHandler := &user.MeHandler{DB: database}
	http.Handle("/signup", signupHandler)
	http.Handle("/login", loginHandler)
	http.Handle("/me", user.AuthMiddleware(meHandler))

	//Board Routes / Handlers:
	boardsHandler := &board.BoardHandler{DB: database}
	http.Handle("/boards", user.AuthMiddleware(boardsHandler))

	//Card Routes / Handlers:
	cardHandler := &card.CardHandler{DB: database}
	http.Handle("/boards/", user.AuthMiddleware(cardHandler)) // handles /boards/{id}/cards
	http.Handle("/cards/", user.AuthMiddleware(cardHandler))

	log.Println("Server running on :8080")
	http.ListenAndServe(":8080", nil)
}

// test users (tokens expire 9/16/2025):
//test@example.com mypassword eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgxNzMyMjMsInN1YiI6MX0.OsZcexnuZtciNoIOTl5RylYKOe8VzKys3iQT7f7ahns
//test2@email.com password123 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgxNzU0MTgsInN1YiI6Mn0.RNYlbbUdaDVAbNB5wxUjuoLi2p0jXFPmttH4sybgbZs
