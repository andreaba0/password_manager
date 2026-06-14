package main

import "fmt"

func main() {
	http.HandleFunc("/signup", nil)
    http.HandleFunc("/signin", nil)
    http.HandleFunc("/challenge", nil)
	http.ListenAndServe(":8080", nil)
}
