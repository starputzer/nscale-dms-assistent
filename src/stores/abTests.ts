import { defineStore } from "pinia";

interface ABTest {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  variants: {
    id: string;
    name: string;
    weight: number;
  }[];
  startDate: string;
  endDate?: string;
}

interface ABTestState {
  tests: ABTest[];
  isLoading: boolean;
  error: string | null;
}

export const useABTestStore = defineStore("abTests", {
  state: (): ABTestState => ({
    tests: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    getTestById: (state) => (id: string) => {
      return state.tests.find((test) => test.id === id);
    },
    activeTests: (state) => {
      return state.tests.filter((test: any) => test.isActive);
    },
  },

  actions: {
    async loadTests() {
      this.isLoading = true;
      this.error = null;

      try {
        // Simulating API call with mock data
        await new Promise((resolve) => setTimeout(resolve, 300));

        this.tests = [
          {
            id: "test-1",
            name: "New chat interface",
            description: "Testing the new chat interface design",
            isActive: true,
            variants: [
              { id: "control", name: "Control", weight: 50 },
              { id: "variant-a", name: "New UI", weight: 50 },
            ],
            startDate: "2025-04-01T00:00:00Z",
          },
          {
            id: "test-2",
            name: "Enhanced source references",
            description: "Testing enhanced source reference display",
            isActive: true,
            variants: [
              { id: "control", name: "Control", weight: 50 },
              { id: "variant-a", name: "Enhanced display", weight: 50 },
            ],
            startDate: "2025-05-01T00:00:00Z",
          },
        ];
      } catch (error) {
        console.error("Failed to load A/B tests:", error);
        this.error = "Failed to load A/B tests";
      } finally {
        this.isLoading = false;
      }
    },

    async createTest(test: Omit<ABTest, "id">) {
      this.isLoading = true;
      this.error = null;

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 300));

        const newTest: ABTest = {
          ...test,
          id: `test-${Date.now()}`,
        };

        this.tests.push(newTest);
        return newTest;
      } catch (error) {
        console.error("Failed to create A/B test:", error);
        this.error = "Failed to create A/B test";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async updateTest(id: string, updates: Partial<ABTest>) {
      this.isLoading = true;
      this.error = null;

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 300));

        const index = this.tests.findIndex((test) => test.id === id);
        if (index === -1) {
          throw new Error(`Test with ID ${id} not found`);
        }

        this.tests[index] = {
          ...this.tests[index],
          ...updates,
        };

        return this.tests[index];
      } catch (error) {
        console.error(`Failed to update A/B test ${id}:`, error);
        this.error = "Failed to update A/B test";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async toggleTestStatus(id: string) {
      const test = this.getTestById(id);
      if (!test) {
        throw new Error(`Test with ID ${id} not found`);
      }

      return this.updateTest(id, { isActive: !test.isActive });
    },
  },
});
