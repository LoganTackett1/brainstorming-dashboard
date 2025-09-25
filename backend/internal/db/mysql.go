package db

import (
	"database/sql"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

func NewMySQL() (*sql.DB, error) {
	dsn := os.Getenv("DB_DSN")
	return sql.Open("mysql", dsn)
}
