package mailer

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
)

type Mailer interface {
	Send(to, subject, body string) error
}

type SMTPMailer struct {
	host     string
	port     string
	username string
	password string
	from     string
}

func (m *SMTPMailer) Send(to, subject, body string) error {
	auth := smtp.PlainAuth("", m.username, m.password, m.host)
	addr := fmt.Sprintf("%s:%s", m.host, m.port)
	msg := []byte(fmt.Sprintf("Subject: %s\r\nFrom: %s\r\nTo: %s\r\n\r\n%s", subject, m.from, to, body))
	return smtp.SendMail(addr, auth, m.from, []string{to}, msg)
}

type DevMailer struct{}

func (d *DevMailer) Send(to, subject, body string) error {
	log.Printf("[DEV MAIL] to=%s subject=%s\n%s", to, subject, body)
	return nil
}

func FromEnv() Mailer {
	if os.Getenv("DEV_MAILER") == "true" || os.Getenv("SMTP_HOST") == "" {
		return &DevMailer{}
	}
	return &SMTPMailer{
		host:     os.Getenv("SMTP_HOST"),
		port:     os.Getenv("SMTP_PORT"),
		username: os.Getenv("SMTP_USERNAME"),
		password: os.Getenv("SMTP_PASSWORD"),
		from:     os.Getenv("SMTP_FROM"),
	}
}
