package user

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/LoganTackett1/brainstorming-backend/internal/middleware"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const userIDKey contextKey = "userID"

// AuthMiddleware checks for JWT and extracts the user ID
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			middleware.JSONError(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		secret := []byte(os.Getenv("JWT_SECRET"))
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Ensure signing method is HMAC
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return secret, nil
		})

		if err != nil || !token.Valid {
			middleware.JSONError(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			middleware.JSONError(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		userIDFloat, ok := claims["sub"].(float64)
		if !ok {
			middleware.JSONError(w, "Invalid user ID in token", http.StatusUnauthorized)
			return
		}
		userID := int64(userIDFloat)

		// Store userID in request context
		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID extracts userID from context
func GetUserID(r *http.Request) int64 {
	if val := r.Context().Value(userIDKey); val != nil {
		return val.(int64)
	}
	return 0
}
