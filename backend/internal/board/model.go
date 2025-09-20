package board

import (
	"database/sql"
	"time"
)

type Board struct {
	ID           int64     `json:"id"`
	Title        string    `json:"title"`
	OwnerID      int64     `json:"owner_id"`
	IsOwner      bool      `json:"is_owner"`
	Permission   string    `json:"permission"` // "owner", "edit", "read"
	CreatedAt    time.Time `json:"created_at"`
	ThumbnailURL string    `json:"thumbnail_url"`
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
func GetBoards(db *sql.DB, userID int64) ([]Board, error) {
	rows, err := db.Query(`
        SELECT b.id, b.title, b.owner_id, 'owner' AS permission, b.created_at, COALESCE(b.thumbnail_url, '')
        FROM boards b
        WHERE b.owner_id = ?
        
        UNION

        SELECT b.id, b.title, b.owner_id, ba.permission, b.created_at, COALESCE(b.thumbnail_url, '')
        FROM boards b
        JOIN board_access ba ON b.id = ba.board_id
        WHERE ba.user_id = ?

        ORDER BY created_at DESC
    `, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boards []Board
	for rows.Next() {
		var b Board
		if err := rows.Scan(&b.ID, &b.Title, &b.OwnerID, &b.Permission, &b.CreatedAt, &b.ThumbnailURL); err != nil {
			return nil, err
		}
		b.IsOwner = (b.Permission == "owner")
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
