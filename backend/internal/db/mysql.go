package db

import (
	"database/sql"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

func NewMySQL() (*sql.DB, error) {
	dsn := os.Getenv("DB_DSN") // e.g. "root:password@tcp(localhost:3306)/brainstorming?parseTime=true"
	return sql.Open("mysql", dsn)
}
