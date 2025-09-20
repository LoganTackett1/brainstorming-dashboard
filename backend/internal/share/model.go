package share

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"time"
)

type BoardShare struct {
	ID         int64  `json:"id"`
	BoardID    int64  `json:"board_id"`
	Token      string `json:"token"`
	Permission string `json:"permission"` // "read" or "edit"
	CreatedAt  string `json:"created_at"`
}

// Generate a random token
func generateToken() (string, error) {
	bytes := make([]byte, 16)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Create a new share link
func CreateShare(db *sql.DB, boardID int64, permission string) (BoardShare, error) {
	token, err := generateToken()
	if err != nil {
		return BoardShare{}, err
	}

	res, err := db.Exec(
		"INSERT INTO board_shares (board_id, token, permission, created_at) VALUES (?, ?, ?, ?)",
		boardID, token, permission, time.Now(),
	)
	if err != nil {
		return BoardShare{}, err
	}
	id, _ := res.LastInsertId()

	return BoardShare{
		ID:         id,
		BoardID:    boardID,
		Token:      token,
		Permission: permission,
		CreatedAt:  time.Now().Format(time.RFC3339),
	}, nil
}

// Get all share links for a board
func GetSharesByBoard(db *sql.DB, boardID int64) ([]BoardShare, error) {
	rows, err := db.Query(
		"SELECT id, board_id, token, permission, created_at FROM board_shares WHERE board_id = ?",
		boardID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []BoardShare
	for rows.Next() {
		var s BoardShare
		if err := rows.Scan(&s.ID, &s.BoardID, &s.Token, &s.Permission, &s.CreatedAt); err != nil {
			return nil, err
		}
		shares = append(shares, s)
	}

	if shares == nil {
		shares = []BoardShare{}
	}

	return shares, nil
}

// Delete a share link
func DeleteShare(db *sql.DB, shareID int64) (int64, error) {
	res, err := db.Exec("DELETE FROM board_shares WHERE id = ?", shareID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
