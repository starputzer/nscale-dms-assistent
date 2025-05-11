import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AdminUsers from "@/components/admin/tabs/AdminUsers.vue";
import { createTestingPinia } from "@pinia/testing";
import type { User } from "@/types/admin";

// Mock the date-fns library
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatStr) => {
    // Simple date formatting for testing
    return "01.01.2023 10:00";
  }),
  de: {},
}));

// Mock the useToast composable
vi.mock("@/composables/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Sample user data for testing
const mockUsers: User[] = [
  {
    id: "user-1",
    email: "admin@example.com",
    role: "admin",
    created_at: 1641034800000, // 2022-01-01
    last_login: 1672570800000, // 2023-01-01
  },
  {
    id: "user-2",
    email: "user@example.com",
    role: "user",
    created_at: 1641124800000, // 2022-01-02
    last_login: null,
  },
  {
    id: "user-3",
    email: "test@example.com",
    role: "user",
    created_at: 1641214800000, // 2022-01-03
    last_login: 1672657200000, // 2023-01-02
  },
];

// Helper to create wrapper with default props and configs
const createWrapper = (options = {}) => {
  return mount(AdminUsers, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            auth: {
              currentUser: {
                id: "user-1",
                email: "admin@example.com",
                role: "admin",
              },
            },
            "admin/users": {
              users: mockUsers,
              loading: false,
              error: null,
            },
          },
          stubActions: false,
        }),
      ],
      stubs: {
        Dialog: true,
      },
      mocks: {
        $t: (key, fallback) => fallback || key,
      },
      ...options,
    },
    attachTo: document.body,
  });
};

describe("AdminUsers.vue", () => {
  // Setup and cleanup
  beforeEach(() => {
    // Mock showModal and close methods for HTMLDialogElement
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    // Mock confirm dialog
    global.confirm = vi.fn(() => true);

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any attached elements
    document.body.innerHTML = "";
  });

  // Rendering Tests
  describe("Rendering", () => {
    it("renders the component correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find(".admin-users").exists()).toBe(true);
      expect(wrapper.find(".admin-users__title").text()).toContain(
        "Benutzerverwaltung",
      );
    });

    it("displays user statistics correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Should show total users (3)
      const statCards = wrapper.findAll(".admin-users__stat-card");
      expect(statCards.length).toBe(3); // Total, Admin, and Standard user stats

      // Total users
      expect(statCards[0].find(".admin-users__stat-value").text()).toBe("3");

      // Admin users (1)
      expect(statCards[1].find(".admin-users__stat-value").text()).toBe("1");

      // Standard users (2)
      expect(statCards[2].find(".admin-users__stat-value").text()).toBe("2");
    });

    it("renders user table with correct data", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      const table = wrapper.find(".admin-users__table");
      expect(table.exists()).toBe(true);

      const rows = wrapper.findAll(".admin-users__table-row");
      expect(rows.length).toBe(mockUsers.length);

      // Check first row
      const firstRow = rows[0];
      expect(firstRow.findAll(".admin-users__table-cell")[0].text()).toBe(
        "admin@example.com",
      );
      expect(
        firstRow
          .findAll(".admin-users__table-cell")[1]
          .find(".admin-users__role-badge")
          .exists(),
      ).toBe(true);
      expect(firstRow.findAll(".admin-users__table-cell")[2].text()).toBe(
        "01.01.2023 10:00",
      ); // Mocked date
    });

    it("shows role badges with correct styling", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      const adminBadge = wrapper.find(".admin-users__role-badge--admin");
      expect(adminBadge.exists()).toBe(true);

      const userBadges = wrapper.findAll(".admin-users__role-badge--user");
      expect(userBadges.length).toBe(2);
    });

    it("displays empty state when no users are found", async () => {
      const wrapper = createWrapper({
        initialState: {
          "admin/users": {
            users: [],
            loading: false,
            error: null,
          },
        },
      });
      await flushPromises();

      const emptyState = wrapper.find(".admin-users__empty-state");
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.text()).toContain("Keine Benutzer vorhanden");
    });

    it("displays action buttons correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      const rows = wrapper.findAll(".admin-users__table-row");

      // First row (admin) should have edit button
      const adminActions = rows[0].find(".admin-users__actions");
      expect(
        adminActions.find(".admin-users__action-button--edit").exists(),
      ).toBe(true);

      // Delete button should be disabled for current user
      const adminDeleteBtn = adminActions.find(
        ".admin-users__action-button--delete",
      );
      expect(adminDeleteBtn.exists()).toBe(true);
      expect(adminDeleteBtn.attributes("disabled")).toBeDefined();

      // User row should have both edit and delete buttons enabled
      const userActions = rows[1].find(".admin-users__actions");
      expect(
        userActions.find(".admin-users__action-button--edit").exists(),
      ).toBe(true);
      expect(
        userActions.find(".admin-users__action-button--delete").exists(),
      ).toBe(true);
      expect(
        userActions
          .find(".admin-users__action-button--delete")
          .attributes("disabled"),
      ).toBeUndefined();
    });
  });

  // Search and Filtering Tests
  describe("Search and Filtering", () => {
    it("filters users based on search query", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Initially shows all users
      expect(wrapper.findAll(".admin-users__table-row").length).toBe(3);

      // Enter search query
      const searchInput = wrapper.find(".admin-users__search-input");
      await searchInput.setValue("test");

      // Should now only show matching users
      expect(wrapper.findAll(".admin-users__table-row").length).toBe(1);
      expect(wrapper.find(".admin-users__table-row").text()).toContain(
        "test@example.com",
      );
    });

    it("shows clear button when search has input", async () => {
      const wrapper = createWrapper();

      // Initially no clear button
      expect(wrapper.find(".admin-users__search-clear").exists()).toBe(false);

      // Enter search query
      const searchInput = wrapper.find(".admin-users__search-input");
      await searchInput.setValue("test");

      // Clear button should appear
      expect(wrapper.find(".admin-users__search-clear").exists()).toBe(true);
    });

    it("clears search when clear button is clicked", async () => {
      const wrapper = createWrapper();

      // Enter search query
      const searchInput = wrapper.find(".admin-users__search-input");
      await searchInput.setValue("test");

      // Click clear button
      await wrapper.find(".admin-users__search-clear").trigger("click");

      // Search should be cleared
      expect(wrapper.vm.searchQuery).toBe("");
      expect(wrapper.findAll(".admin-users__table-row").length).toBe(3);
    });

    it("shows empty state with reset button when search has no results", async () => {
      const wrapper = createWrapper();

      // Enter search query with no matches
      const searchInput = wrapper.find(".admin-users__search-input");
      await searchInput.setValue("nonexistent");

      // Should show empty state
      const emptyState = wrapper.find(".admin-users__empty-state");
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.text()).toContain("Keine Benutzer gefunden");

      // Should have reset button
      const resetButton = wrapper.find(".admin-users__clear-search");
      expect(resetButton.exists()).toBe(true);

      // Click reset button
      await resetButton.trigger("click");

      // Search should be cleared
      expect(wrapper.vm.searchQuery).toBe("");
    });
  });

  // Sorting Tests
  describe("Sorting", () => {
    it("sorts users when clicking on table headers", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Get all sortable headers
      const headers = wrapper.findAll(".admin-users__table-header");

      // Click on email header to sort by email
      await headers[0].trigger("click");

      // Check if sort indicators appear
      expect(wrapper.find(".admin-users__table-header--sorted").exists()).toBe(
        true,
      );
      expect(wrapper.find(".fa-sort-up").exists()).toBe(true); // Default ascending

      // Click again to toggle sort direction
      await headers[0].trigger("click");

      // Should now be descending
      expect(wrapper.find(".fa-sort-down").exists()).toBe(true);
    });

    it("sorts by different columns correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Get headers
      const headers = wrapper.findAll(".admin-users__table-header");

      // Sort by role
      await headers[1].trigger("click");

      // Check if correct header is marked as sorted
      expect(headers[1].classes()).toContain(
        "admin-users__table-header--sorted",
      );

      // Sort by creation date
      await headers[2].trigger("click");

      // Check if correct header is marked as sorted
      expect(headers[2].classes()).toContain(
        "admin-users__table-header--sorted",
      );

      // Previous header should no longer be sorted
      expect(headers[1].classes()).not.toContain(
        "admin-users__table-header--sorted",
      );
    });
  });

  // Modal Tests
  describe("Modals", () => {
    it("opens create user modal when clicking create button", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Find create button and click it
      const createButton = wrapper.find(".admin-users__create-button");
      await createButton.trigger("click");

      // Check if showModal was called on the dialog
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    });

    it("opens edit role modal when clicking edit button", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Find edit button on a non-current user and click it
      const rows = wrapper.findAll(".admin-users__table-row");
      const editButton = rows[1].find(".admin-users__action-button--edit");
      await editButton.trigger("click");

      // Check if showModal was called
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

      // Check if selected user is set correctly
      expect(wrapper.vm.selectedUser).toEqual(mockUsers[1]);
      expect(wrapper.vm.selectedRole).toBe("user");
    });

    it("opens delete confirmation modal when clicking delete button", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Find delete button on a standard user and click it
      const rows = wrapper.findAll(".admin-users__table-row");
      const deleteButton = rows[1].find(".admin-users__action-button--delete");
      await deleteButton.trigger("click");

      // Check if showModal was called
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

      // Check if selected user is set correctly
      expect(wrapper.vm.selectedUser).toEqual(mockUsers[1]);
    });

    it("creates a new user when submitting the form", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Open create modal
      const createButton = wrapper.find(".admin-users__create-button");
      await createButton.trigger("click");

      // Fill form fields
      await wrapper.find("#email").setValue("newuser@example.com");
      await wrapper.find("#password").setValue("password123");
      await wrapper.find("#role").setValue("user");

      // Get reference to the store and spy on createUser action
      const adminUsersStore = wrapper.vm.adminUsersStore;
      const createUserSpy = vi.spyOn(adminUsersStore, "createUser");

      // Submit form
      await wrapper.find(".admin-users__form").trigger("submit");

      // Check if store action was called with correct data
      expect(createUserSpy).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "password123",
        role: "user",
      });

      // Dialog should be closed
      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it("updates user role when submitting the edit form", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Open edit modal for a user
      const rows = wrapper.findAll(".admin-users__table-row");
      const editButton = rows[1].find(".admin-users__action-button--edit");
      await editButton.trigger("click");

      // Change role
      await wrapper.find("#edit-role").setValue("admin");

      // Get reference to the store and spy on updateUserRole action
      const adminUsersStore = wrapper.vm.adminUsersStore;
      const updateUserRoleSpy = vi.spyOn(adminUsersStore, "updateUserRole");

      // Submit form
      await wrapper.find("form").trigger("submit");

      // Check if store action was called with correct data
      expect(updateUserRoleSpy).toHaveBeenCalledWith("user-2", "admin");

      // Dialog should be closed
      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it("deletes a user when confirming deletion", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Open delete modal for a user
      const rows = wrapper.findAll(".admin-users__table-row");
      const deleteButton = rows[1].find(".admin-users__action-button--delete");
      await deleteButton.trigger("click");

      // Get reference to the store and spy on deleteUser action
      const adminUsersStore = wrapper.vm.adminUsersStore;
      const deleteUserSpy = vi.spyOn(adminUsersStore, "deleteUser");

      // Click delete button in modal
      const deleteConfirmButton = wrapper.find(
        ".admin-users__form-button--danger",
      );
      await deleteConfirmButton.trigger("click");

      // Check if store action was called with correct user ID
      expect(deleteUserSpy).toHaveBeenCalledWith("user-2");

      // Dialog should be closed
      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it("handles form validation for new user", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Open create modal
      const createButton = wrapper.find(".admin-users__create-button");
      await createButton.trigger("click");

      // Submit with invalid email and no password
      await wrapper.find("#email").setValue("invalid-email");
      await wrapper.find("#password").setValue("123"); // Too short

      // Submit form
      await wrapper.find(".admin-users__form").trigger("submit");

      // Should not close dialog
      expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();

      // Should show validation errors
      expect(wrapper.find(".admin-users__form-error").exists()).toBe(true);
      expect(wrapper.vm.validationErrors.email).toBeTruthy();
      expect(wrapper.vm.validationErrors.password).toBeTruthy();
    });
  });

  // Form Interaction Tests
  describe("Form Interactions", () => {
    it("toggles password visibility", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Open create modal
      const createButton = wrapper.find(".admin-users__create-button");
      await createButton.trigger("click");

      // Password should be hidden by default
      const passwordInput = wrapper.find("#password");
      expect(passwordInput.attributes("type")).toBe("password");

      // Click toggle button
      const toggleButton = wrapper.find(".admin-users__password-toggle");
      await toggleButton.trigger("click");

      // Password should now be visible
      expect(passwordInput.attributes("type")).toBe("text");

      // Icon should change
      expect(wrapper.find(".fa-eye-slash").exists()).toBe(true);
    });

    it("resets form when closed", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Open create modal
      const createButton = wrapper.find(".admin-users__create-button");
      await createButton.trigger("click");

      // Fill form fields
      await wrapper.find("#email").setValue("newuser@example.com");
      await wrapper.find("#password").setValue("password123");

      // Close the modal
      const cancelButton = wrapper.find(".admin-users__form-button--cancel");
      await cancelButton.trigger("click");

      // Open modal again
      await createButton.trigger("click");

      // Form should be reset
      expect(wrapper.find("#email").element.value).toBe("");
      expect(wrapper.find("#password").element.value).toBe("");
    });
  });

  // API Interaction Tests
  describe("API Interactions", () => {
    it("loads users on mount", async () => {
      // Spy on the store's fetchUsers method
      const fetchUsersSpy = vi.fn();

      const wrapper = createWrapper({
        mocks: {
          useAdminUsersStore: () => ({
            fetchUsers: fetchUsersSpy,
            users: [],
            adminUsers: [],
            standardUsers: [],
            totalUsers: 0,
          }),
        },
      });

      // Call onMounted hook manually
      await wrapper.vm.$options.mounted?.call(wrapper.vm);

      // Should call fetchUsers
      expect(fetchUsersSpy).toHaveBeenCalled();
    });

    it("handles API errors gracefully", async () => {
      // Create a store with an error
      const wrapper = createWrapper({
        initialState: {
          "admin/users": {
            users: [],
            loading: false,
            error: "Failed to load users",
          },
        },
      });

      // Mock showToast function
      const showToastSpy = vi.spyOn(wrapper.vm.showToast, "showToast");

      // Trigger the watch function for storeError
      await wrapper.vm.$options.watch?.storeError.call(
        wrapper.vm,
        "Failed to load users",
      );

      // Should show an error toast
      expect(showToastSpy).toHaveBeenCalled();
      expect(showToastSpy.mock.calls[0][0].type).toBe("error");
    });

    it("shows loading spinner when creating user", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Open create modal
      const createButton = wrapper.find(".admin-users__create-button");
      await createButton.trigger("click");

      // Fill form with valid data
      await wrapper.find("#email").setValue("newuser@example.com");
      await wrapper.find("#password").setValue("password123");

      // Mock the create function to delay
      const adminUsersStore = wrapper.vm.adminUsersStore;
      vi.spyOn(adminUsersStore, "createUser").mockImplementation(() => {
        wrapper.vm.isSubmitting = true;
        return new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Submit form
      await wrapper.find(".admin-users__form").trigger("submit");

      // Should show loading spinner
      expect(wrapper.find(".fa-spinner").exists()).toBe(true);
      expect(
        wrapper
          .find(".admin-users__form-button--submit")
          .attributes("disabled"),
      ).toBeDefined();
      expect(
        wrapper
          .find(".admin-users__form-button--cancel")
          .attributes("disabled"),
      ).toBeDefined();
    });
  });

  // Accessibility Tests
  describe("Accessibility", () => {
    it("uses proper ARIA attributes for interactive elements", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Action buttons should have titles for tooltips
      const actionButtons = wrapper.findAll(".admin-users__action-button");
      actionButtons.forEach((button) => {
        expect(button.attributes("title")).toBeDefined();
      });

      // Search clear button should have aria-label
      const searchInput = wrapper.find(".admin-users__search-input");
      await searchInput.setValue("test");

      const clearButton = wrapper.find(".admin-users__search-clear");
      expect(clearButton.attributes("aria-label")).toBeDefined();
    });

    it("has accessible form labels and controls", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Open create modal
      const createButton = wrapper.find(".admin-users__create-button");
      await createButton.trigger("click");

      // Form labels should be associated with inputs
      const emailLabel = wrapper.find('label[for="email"]');
      const emailInput = wrapper.find("#email");

      expect(emailLabel.exists()).toBe(true);
      expect(emailInput.attributes("id")).toBe("email");

      // Password toggle should have aria-label
      const passwordToggle = wrapper.find(".admin-users__password-toggle");
      expect(passwordToggle.attributes("aria-label")).toBeDefined();
    });
  });
});
