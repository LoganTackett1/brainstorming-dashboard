package board

import (
	"database/sql"
)

// Permission levels
const (
	PermissionNone  = "none"
	PermissionRead  = "read"
	PermissionEdit  = "edit"
	PermissionOwner = "owner"
)

// GetUserPermission checks what level of access a user has to a board
func GetUserPermission(db *sql.DB, userID, boardID int64) (string, error) {
	var perm string

	// 1. Check if user is owner
	err := db.QueryRow("SELECT 'owner' FROM boards WHERE id = ? AND owner_id = ?", boardID, userID).Scan(&perm)
	if err == nil {
		return PermissionOwner, nil
	}
	if err != sql.ErrNoRows {
		return PermissionNone, err
	}

	// 2. Check if user has been granted access
	err = db.QueryRow("SELECT permission FROM board_access WHERE board_id = ? AND user_id = ?", boardID, userID).Scan(&perm)
	if err == nil {
		return perm, nil
	}
	if err != sql.ErrNoRows {
		return PermissionNone, err
	}

	// 3. No access
	return PermissionNone, nil
}

// For public link access
func GetSharePermission(db *sql.DB, token string) (int64, string, error) {
	var boardID int64
	var perm string

	err := db.QueryRow(
		"SELECT board_id, permission FROM board_shares WHERE token = ?",
		token,
	).Scan(&boardID, &perm)
	if err == sql.ErrNoRows {
		return 0, PermissionNone, nil
	}
	if err != nil {
		return 0, PermissionNone, err
	}

	return boardID, perm, nil
}
