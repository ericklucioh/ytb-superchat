FROM golang:1.22-alpine AS builder

WORKDIR /src

COPY ytb-go/go.mod ./go.mod
COPY ytb-go/cmd ./cmd
COPY ytb-go/internal ./internal

RUN go build -o /out/ytb-go ./cmd/ytb-go

FROM alpine:3.20

WORKDIR /app/ytb-go

RUN apk add --no-cache ca-certificates

COPY --from=builder /out/ytb-go ./ytb-go
COPY src/overlay /app/src/overlay

EXPOSE 8080

ENTRYPOINT ["./ytb-go"]
