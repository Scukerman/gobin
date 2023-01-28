package main

const BaseStyleURL = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/"

type Style struct {
	Name string
	URL  string
}

var Styles = []Style{
	{Name: "Default", URL: "default.min.css"},
	{Name: "A11y Dark", URL: "a11y-dark.min.css"},
	{Name: "A11y Light", URL: "a11y-light.min.css"},
	{Name: "GitHub Dark", URL: "github-dark.min.css"},
	{Name: "GitHub Light", URL: "github.min.css"},
	{Name: "Atom One Dark", URL: "atom-one-dark.min.css"},
	{Name: "Atom One Light", URL: "atom-one-light.min.css"},
}
