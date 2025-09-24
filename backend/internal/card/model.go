package card

import (
	"database/sql"
	"time"
)

type Card struct {
	ID        int64     `json:"id"`
	BoardID   int64     `json:"board_id"`
	Kind 	  string 	`json:"kind"`
	Text      string    `json:"text,omitempty"`
	ImageURL  string    `json:"image_url,omitempty"`
	PositionX float64   `json:"position_x"`
	PositionY float64   `json:"position_y"`
    Width     *float64  `json:"width,omitempty"`
    Height    *float64  `json:"height,omitempty"`
	CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// VerifyBoardOwnership checks if a board belongs to the user
func VerifyBoardOwnership(db *sql.DB, boardID, ownerID int64) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM boards WHERE id = ? AND owner_id = ?", boardID, ownerID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == 1, nil
}

func CreateCard(db *sql.DB, boardID int64, text string, x, y float64) (int64, error) {
	res, err := db.Exec(
		"INSERT INTO cards (board_id, text, position_x, position_y) VALUES (?, ?, ?, ?)",
		boardID, text, x, y,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func CreateImageCard(db *sql.DB, boardID int64, imageURL string, x, y float64, width, height *float64) (int64, error) {
	res, err := db.Exec(
		"INSERT INTO cards (board_id, kind, image_url, position_x, position_y, width, height) VALUES (?, 'image', ?, ?, ?, ?, ?)",
		boardID, imageURL, x, y, width, height,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetCardsByBoard(db *sql.DB, boardID int64) ([]Card, error) {
	rows, err := db.Query(
		"SELECT id, board_id, kind, COALESCE(text, '') AS text, COALESCE(image_url, '') AS image_url, position_x, position_y, width, height, created_at, COALESCE(updated_at, created_at) FROM cards WHERE board_id = ?",
		boardID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cards []Card
	for rows.Next() {
		var c Card
		if err := rows.Scan(&c.ID, &c.BoardID, &c.Kind, &c.Text, &c.ImageURL, &c.PositionX, &c.PositionY, &c.Width, &c.Height, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		cards = append(cards, c)
	}

	if cards == nil {
		cards = []Card{}
	}

	return cards, nil
}

func UpdateCard(db *sql.DB, cardID int64, text string, x, y float64) (int64, error) {
	res, err := db.Exec(
		"UPDATE cards SET text = ?, position_x = ?, position_y = ? WHERE id = ?",
		text, x, y, cardID,
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func UpdateImageCard(db *sql.DB, cardID int64, x, y float64, width, height *float64) (int64, error) {
	res, err := db.Exec(
		"UPDATE cards SET position_x = ?, position_y = ?, width = ?, height = ? WHERE id = ?",
		x, y, width, height, cardID,
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func DeleteCard(db *sql.DB, cardID int64) (int64, error) {
	res, err := db.Exec("DELETE FROM cards WHERE id = ?", cardID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
