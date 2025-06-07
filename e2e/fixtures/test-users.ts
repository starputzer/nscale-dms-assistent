/**
 * Hilfsfunktionen zum Erstellen von Testbenutzern.
 */
import axios from "axios";

/**
 * Erstellt Testbenutzer in der Datenbank.
 * Diese Funktion sollte nur im Testkontext verwendet werden.
 */
export async function createTestUsers() {
<<<<<<< HEAD
  const apiUrl = process.env.API_URL || "http://localhost:8000/api";
=======
  const apiUrl = process.env.API_URL || "http://localhost:5173/api";
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

  // Admin-Benutzer erstellen
  try {
    await axios.post(
      `${apiUrl}/admin/users`,
      {
<<<<<<< HEAD
        email: "martin@danglefeet.com",
        password: "123",
=======
        username: "admin",
        password: "admin123",
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
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
<<<<<<< HEAD
        email: "user@example.com",
        password: "password123",
=======
        username: "user",
        password: "user123",
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
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
<<<<<<< HEAD
 * Test-Benutzer-Daten für E2E-Tests
 */
export const testUsers = {
  admin: {
    email: "martin@danglefeet.com",
    password: "123"
  },
  user: {
    email: "user@example.com", 
    password: "password123"
  }
};

/**
 * Bereinigt Testdaten nach den Tests.
 */
export async function cleanupTestUsers() {
  const apiUrl = process.env.API_URL || "http://localhost:8000/api";
=======
 * Bereinigt Testdaten nach den Tests.
 */
export async function cleanupTestUsers() {
  const apiUrl = process.env.API_URL || "http://localhost:5173/api";
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

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
