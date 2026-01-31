package handlers

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

// Import handling size limit (e.g. 10MB)
const maxUploadSize = 10 << 20

func (h *Handler) importOPML(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	userID := h.getUserID(r)
	count, err := h.cfg.OPMLService.Import(r.Context(), userID, data)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":       fmt.Sprintf("Successfully imported %d feeds", count),
		"importedCount": count,
	})
}

func (h *Handler) exportOPML(w http.ResponseWriter, r *http.Request) {
	userID := h.getUserID(r)
	data, err := h.cfg.OPMLService.Export(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	filename := fmt.Sprintf("feeds-%s.opml", time.Now().Format("2006-01-02"))

	w.Header().Set("Content-Type", "text/x-opml+xml")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
