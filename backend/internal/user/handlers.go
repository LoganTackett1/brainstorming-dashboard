package user

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
)

type SignupHandler struct {
	DB *sql.DB
}

type LoginHandler struct {
	DB *sql.DB
}

type MeHandler struct {
	DB *sql.DB
}

func (h *LoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	id, err := AuthenticateUser(h.DB, body.Email, body.Password)
	if err != nil {
		middleware.JSONError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token, _ := GenerateJWT(id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func (h *MeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := GetUserID(r)
	if userID == 0 {
		middleware.JSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id": userID,
	})
}

func (h *SignupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		middleware.JSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create user (and return ID if successful)
	id, err := CreateUser(h.DB, body.Email, body.Password)
	if err != nil {
		middleware.JSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Generate JWT for new user
	token, _ := GenerateJWT(id)

	w.Header().Set("Content-Type", "application/json")
	// return token like login does
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}
