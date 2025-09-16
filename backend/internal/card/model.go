package card

import (
	"database/sql"
	"time"
)

type Card struct {
	ID        int64     `json:"id"`
	BoardID   int64     `json:"board_id"`
	Text      string    `json:"text"`
	PositionX float64   `json:"position_x"`
	PositionY float64   `json:"position_y"`
	CreatedAt time.Time `json:"created_at"`
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

func GetCardsByBoard(db *sql.DB, boardID int64) ([]Card, error) {
	rows, err := db.Query(
		"SELECT id, board_id, text, position_x, position_y, created_at FROM cards WHERE board_id = ?",
		boardID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cards []Card
	for rows.Next() {
		var c Card
		if err := rows.Scan(&c.ID, &c.BoardID, &c.Text, &c.PositionX, &c.PositionY, &c.CreatedAt); err != nil {
			return nil, err
		}
		cards = append(cards, c)
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

func DeleteCard(db *sql.DB, cardID int64) (int64, error) {
	res, err := db.Exec("DELETE FROM cards WHERE id = ?", cardID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
