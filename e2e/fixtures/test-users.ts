/**
 * Hilfsfunktionen zum Erstellen von Testbenutzern.
 */
import axios from "axios";

/**
 * Erstellt Testbenutzer in der Datenbank.
 * Diese Funktion sollte nur im Testkontext verwendet werden.
 */
export async function createTestUsers() {
  const apiUrl = process.env.API_URL || "http://localhost:5173/api";

  // Admin-Benutzer erstellen
  try {
    await axios.post(
      `${apiUrl}/admin/users`,
      {
        username: "admin",
        password: "admin123",
        role: "admin",
        isTestUser: true,
      },
      {
        headers: {
          "X-Test-Setup": "true",
          "Content-Type": "application/json",
        },
      },
    );
    console.log("Admin user created");
  } catch (error) {
    if (error.response?.status === 409) {
      console.log("Admin user already exists");
    } else {
      console.error("Failed to create admin user:", error.message);
      throw error;
    }
  }

  // Standard-Benutzer erstellen
  try {
    await axios.post(
      `${apiUrl}/admin/users`,
      {
        username: "user",
        password: "user123",
        role: "user",
        isTestUser: true,
      },
      {
        headers: {
          "X-Test-Setup": "true",
          "Content-Type": "application/json",
        },
      },
    );
    console.log("Standard user created");
  } catch (error) {
    if (error.response?.status === 409) {
      console.log("Standard user already exists");
    } else {
      console.error("Failed to create standard user:", error.message);
      throw error;
    }
  }

  // Testdokumente erstellen
  try {
    await axios.post(
      `${apiUrl}/test/setup-fixtures`,
      {
        createSampleDocuments: true,
        createSampleChats: true,
      },
      {
        headers: {
          "X-Test-Setup": "true",
          "Content-Type": "application/json",
        },
      },
    );
    console.log("Test fixtures created");
  } catch (error) {
    console.error("Failed to create test fixtures:", error.message);
    // Nicht abbrechen, wenn Testdaten nicht erstellt werden konnten
  }
}

/**
 * Bereinigt Testdaten nach den Tests.
 */
export async function cleanupTestUsers() {
  const apiUrl = process.env.API_URL || "http://localhost:5173/api";

  try {
    await axios.delete(`${apiUrl}/test/cleanup-fixtures`, {
      headers: {
        "X-Test-Setup": "true",
      },
    });
    console.log("Test fixtures cleaned up");
  } catch (error) {
    console.error("Failed to clean up test fixtures:", error.message);
  }
}
