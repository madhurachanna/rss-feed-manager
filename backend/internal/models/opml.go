package models

import "encoding/xml"

// OPML represents the root OPML element
type OPML struct {
	XMLName xml.Name `xml:"opml"`
	Version string   `xml:"version,attr"`
	Head    Head     `xml:"head"`
	Body    Body     `xml:"body"`
}

// Head contains metadata about the OPML file
type Head struct {
	Title       string `xml:"title,omitempty"`
	DateCreated string `xml:"dateCreated,omitempty"`
}

// Body contains the outline elements
type Body struct {
	Outlines []Outline `xml:"outline"`
}

// Outline represents a feed or a folder in OPML
type Outline struct {
	Text        string    `xml:"text,attr"`
	Title       string    `xml:"title,attr,omitempty"`
	Type        string    `xml:"type,attr,omitempty"`
	XMLURL      string    `xml:"xmlUrl,attr,omitempty"`
	HTMLURL     string    `xml:"htmlUrl,attr,omitempty"`
	Description string    `xml:"description,attr,omitempty"`
	Outlines    []Outline `xml:"outline,omitempty"` // Nested outlines (folders)
}
