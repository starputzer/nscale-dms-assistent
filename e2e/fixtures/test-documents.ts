/**
 * Testdaten für Dokumente.
 */
import * as fs from "fs";
import * as path from "path";

/**
 * Testdokumente für den Dokumentenkonverter.
 */
export const TEST_DOCUMENTS = {
  pdf: {
    path: path.join(__dirname, "files", "testdocument.pdf"),
    mimetype: "application/pdf",
    content: "Test PDF Dokument",
  },
  docx: {
    path: path.join(__dirname, "files", "testdocument.docx"),
    mimetype:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    content: "Test Word Dokument",
  },
  xlsx: {
    path: path.join(__dirname, "files", "testdocument.xlsx"),
    mimetype:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    content: "Test Excel Dokument",
  },
  pptx: {
    path: path.join(__dirname, "files", "testdocument.pptx"),
    mimetype:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    content: "Test PowerPoint Dokument",
  },
  html: {
    path: path.join(__dirname, "files", "testdocument.html"),
    mimetype: "text/html",
    content: "<html><body><h1>Test HTML Dokument</h1></body></html>",
  },
};

/**
 * Erstellt Testdokumente im Dateisystem, falls sie noch nicht existieren.
 */
export async function createTestDocuments() {
  // Verzeichnis für Testdateien erstellen, falls es nicht existiert
  const filesDir = path.join(__dirname, "files");
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  // PDF Testdokument erstellen
  if (!fs.existsSync(TEST_DOCUMENTS.pdf.path)) {
    // Hier würde normalerweise ein echtes PDF erstellt werden
    // Da dies komplex ist, verwenden wir für den Test eine Platzhalterdatei
    fs.writeFileSync(TEST_DOCUMENTS.pdf.path, "PDF Test Content");
  }

  // DOCX Testdokument erstellen
  if (!fs.existsSync(TEST_DOCUMENTS.docx.path)) {
    fs.writeFileSync(TEST_DOCUMENTS.docx.path, "DOCX Test Content");
  }

  // XLSX Testdokument erstellen
  if (!fs.existsSync(TEST_DOCUMENTS.xlsx.path)) {
    fs.writeFileSync(TEST_DOCUMENTS.xlsx.path, "XLSX Test Content");
  }

  // PPTX Testdokument erstellen
  if (!fs.existsSync(TEST_DOCUMENTS.pptx.path)) {
    fs.writeFileSync(TEST_DOCUMENTS.pptx.path, "PPTX Test Content");
  }

  // HTML Testdokument erstellen
  if (!fs.existsSync(TEST_DOCUMENTS.html.path)) {
    fs.writeFileSync(TEST_DOCUMENTS.html.path, TEST_DOCUMENTS.html.content);
  }

  console.log("Test documents created");
}
