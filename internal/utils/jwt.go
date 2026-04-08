package utils

import (
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"

    "github.com/astianmuchui/mobilerobot/internal/models"
)

func JwtGenerateToken(user *models.User) string {
    token := jwt.New(jwt.SigningMethodHS256)

    claims := token.Claims.(jwt.MapClaims)
    claims["uuid"] = user.Uuid
    claims["email"] = user.Email
    claims["username"] = user.Username
    claims["exp"] = time.Now().Add(time.Hour * 72).Unix()

    t, err := token.SignedString([]byte(uuid.New().String()))
    if err != nil {
        return ""
    }

    return t
}
