package model

type Event struct {
	Session         string  `json:"session"`
	Platform        string  `json:"platform,omitempty"`
	Type            string  `json:"type"`
	User            string  `json:"user,omitempty"`
	Message         string  `json:"message,omitempty"`
	Timestamp       int64   `json:"timestamp"`
	Status          string  `json:"status,omitempty"`
	ChatImg         string  `json:"chatimg,omitempty"`
	ChatBadges      string  `json:"chatbadges,omitempty"`
	Amount          float64 `json:"amount,omitempty"`
	Currency        string  `json:"currency,omitempty"`
	Tier            int     `json:"tier,omitempty"`
	Months          int     `json:"months,omitempty"`
	GiftCount       int     `json:"giftCount,omitempty"`
	BackgroundColor string  `json:"backgroundColor,omitempty"`
	TextColor       string  `json:"textColor,omitempty"`
}
