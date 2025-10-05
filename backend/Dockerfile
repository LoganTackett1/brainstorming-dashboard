FROM golang:1.25 AS build
WORKDIR /app
ENV GOPROXY=https://proxy.golang.org,direct GOSUMDB=sum.golang.org GIT_TERMINAL_PROMPT=0
COPY backend/go.mod backend/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/server ./cmd/api
FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=build /bin/server /app/server
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]