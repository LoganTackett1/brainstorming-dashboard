package user

import (
	"database/sql"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
}

// CreateUser inserts a new user with a hashed password
func CreateUser(db *sql.DB, email, password string) (int64, error) {
	// hash password, insert, etc.
	res, err := db.Exec("INSERT INTO users (email, password_hash) VALUES (?, ?)", email, password)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// AuthenticateUser checks if email/password match and returns user ID
func AuthenticateUser(db *sql.DB, email, password string) (int64, error) {
	var id int64
	var hash string
	err := db.QueryRow("SELECT id, password_hash FROM users WHERE email = ?", email).Scan(&id, &hash)
	if err != nil {
		return 0, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return 0, sql.ErrNoRows
	}
	return id, nil
}
