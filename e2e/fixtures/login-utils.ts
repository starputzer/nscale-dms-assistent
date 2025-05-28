import { Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  role: "admin" | "user";
}

// Test users for different roles
export const testUsers: Record<string, TestUser> = {
  admin: {
    email: "admin@example.com",
    password: "admin-password-123",
    role: "admin",
  },
  user: {
    email: "user@example.com",
    password: "user-password-123",
    role: "user",
  },
  editor: {
    email: "editor@example.com",
    password: "editor-password-123",
    role: "user", // with additional permissions
  },
};

/**
 * Login helper function
 */
export async function login(page: Page, user: TestUser) {
  // Navigate to login page
  await page.goto("/login");

  // Fill login form
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: "networkidle" });

  // Verify login success
  await page.waitForSelector(".user-menu", { timeout: 5000 });
}

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page) {
  await login(page, testUsers.admin);
}

/**
 * Login as regular user
 */
export async function loginAsUser(page: Page) {
  await login(page, testUsers.user);
}

/**
 * Login as editor
 */
export async function loginAsEditor(page: Page) {
  await login(page, testUsers.editor);
}

/**
 * Legacy function for backward compatibility
 */
export async function loginAsTestUser(
  page: Page,
  username: string = "user",
  password: string = "user123",
): Promise<void> {
  // Map to new login function
  await login(page, {
    email: username + "@example.com",
    password: password,
    role: "user",
  });
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click(".user-menu-trigger");

  // Click logout
  await page.click('button:text("Abmelden")');

  // Wait for redirect to login
  await page.waitForURL("**/login");
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector(".user-menu", { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current user info from page
 */
export async function getCurrentUser(page: Page): Promise<any> {
  return await page.evaluate(() => {
    // Access auth store from window (if exposed for testing)
    const authStore = (window as any).__authStore;
    return authStore?.user || null;
  });
}

/**
 * Setup interceptors for authentication in tests
 */
export async function setupAuthInterceptors(page: Page) {
  // Intercept login requests for faster tests
  await page.route("**/auth/login", async (route) => {
    const request = route.request();
    const data = JSON.parse(request.postData() || "{}");

    // Check test users
    const user = Object.values(testUsers).find((u) => u.email === data.email);

    if (user && user.password === data.password) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "test-token-" + Date.now(),
          user: {
            id: "test-" + user.email,
            email: user.email,
            name: user.email.split("@")[0],
            role: user.role,
            roles: [user.role],
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Invalid credentials",
        }),
      });
    }
  });

  // Intercept token refresh
  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        token: "refreshed-token-" + Date.now(),
      }),
    });
  });
}

/**
 * Create a test user via API
 */
export async function createTestUser(page: Page, userData: Partial<TestUser>) {
  const response = await page.request.post("/api/auth/register", {
    data: {
      email: userData.email || `test_${Date.now()}@example.com`,
      password: userData.password || "test-password-123",
      name: userData.email?.split("@")[0] || "Test User",
    },
  });

  return response.json();
}

/**
 * Delete a test user via API
 */
export async function deleteTestUser(page: Page, userId: string) {
  await loginAsAdmin(page);

  const response = await page.request.delete(`/api/admin/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${await getAuthToken(page)}`,
    },
  });

  return response.ok();
}

/**
 * Get auth token from page
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return localStorage.getItem("auth_token");
  });
}

/**
 * Set auth token in page
 */
export async function setAuthToken(page: Page, token: string) {
  await page.evaluate((token) => {
    localStorage.setItem("auth_token", token);
  }, token);
}
