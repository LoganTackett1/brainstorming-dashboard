package boardaccess

import "database/sql"

type BoardAccess struct {
	ID         int64  `json:"id"`
	BoardID    int64  `json:"board_id"`
	UserID     int64  `json:"user_id"`
	Email      string `json:"email"`
	Permission string `json:"permission"` // "edit" or "read"
	CreatedAt  string `json:"created_at"`
}

// Give a user access to a board or update on conflict
func GrantAccess(db *sql.DB, boardID, userID int64, permission string) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO board_access (board_id, user_id, permission)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE permission = ?`,
		boardID, userID, permission, permission,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// Revoke a user's access to a board
func RevokeAccess(db *sql.DB, boardID, userID int64) (int64, error) {
	res, err := db.Exec(`DELETE FROM board_access WHERE board_id = ? AND user_id = ?`, boardID, userID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// Get all access entries for a board
func GetBoardAccessList(db *sql.DB, boardID int64) ([]BoardAccess, error) {
	rows, err := db.Query(
		`SELECT ba.id, ba.board_id, ba.user_id, u.email, ba.permission, ba.created_at
		FROM board_access ba
		JOIN users u ON ba.user_id = u.id
		WHERE ba.board_id = ?;`,
		boardID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accessList []BoardAccess
	for rows.Next() {
		var ba BoardAccess
		if err := rows.Scan(&ba.ID, &ba.BoardID, &ba.UserID, &ba.Email, &ba.Permission, &ba.CreatedAt); err != nil {
			return nil, err
		}
		accessList = append(accessList, ba)
	}

	if accessList == nil {
		accessList = []BoardAccess{}
	}

	return accessList, nil
}

// Update a user's permission for a board
func UpdateBoardAccess(db *sql.DB, boardID, userID int64, permission string) (int64, error) {
	res, err := db.Exec(
		`UPDATE board_access SET permission = ? WHERE board_id = ? AND user_id = ?`,
		permission, boardID, userID,
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
