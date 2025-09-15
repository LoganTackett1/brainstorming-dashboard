package board

import (
	"database/sql"
	"time"
)

type Board struct {
	ID        int64     `json:"id"`
	OwnerID   int64     `json:"owner_id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
}

// Create a new board
func CreateBoard(db *sql.DB, ownerID int64, title string) (int64, error) {
	res, err := db.Exec("INSERT INTO boards (owner_id, title) VALUES (?, ?)", ownerID, title)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// Get all boards for a user
func GetBoards(db *sql.DB, ownerID int64) ([]Board, error) {
	rows, err := db.Query("SELECT id, owner_id, title, created_at FROM boards WHERE owner_id = ?", ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boards []Board
	for rows.Next() {
		var b Board
		if err := rows.Scan(&b.ID, &b.OwnerID, &b.Title, &b.CreatedAt); err != nil {
			return nil, err
		}
		boards = append(boards, b)
	}
	return boards, nil
}

// UpdateBoard updates a board's title if it belongs to the user
func UpdateBoard(db *sql.DB, boardID, ownerID int64, title string) error {
	_, err := db.Exec("UPDATE boards SET title = ? WHERE id = ? AND owner_id = ?", title, boardID, ownerID)
	return err
}

// DeleteBoard deletes a board if it belongs to the user
func DeleteBoard(db *sql.DB, boardID, ownerID int64) (int64, error) {
	res, err := db.Exec("DELETE FROM boards WHERE id = ? AND owner_id = ?", boardID, ownerID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
