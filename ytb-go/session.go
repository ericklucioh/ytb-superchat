package main

type Session struct {
	ID   string
	User string
}

var sessions = make(map[string]Session)
