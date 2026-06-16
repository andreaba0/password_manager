package main

import "net/http"

func main() {
	// The following method return a json object with {salt,nonce}
	http.HandleFunc("/api/signin-flow/begin", nil)

	// The following method completes the signin process by verifying nonce signature from the client
	http.HandleFunc("/api/signin-flow/complete", nil)

	http.ListenAndServe(":8080", nil)
}
