import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFeatureToggles } from '@/composables/useFeatureToggles';
import { useFeatureToggleStore } from '@/stores/featureToggles';
import { createPinia, setActivePinia } from 'pinia';

describe('Feature Toggle System - System Integrity', () => {
  let featureToggleStore: ReturnType<typeof useFeatureToggleStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    featureToggleStore = useFeatureToggleStore();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Feature Toggle Management', () => {
    it('should load default feature toggles on initialization', async () => {
      await featureToggleStore.initialize();

      // Check default toggles are loaded
      expect(featureToggleStore.isEnabled('chatStreaming')).toBeDefined();
      expect(featureToggleStore.isEnabled('documentConverter')).toBeDefined();
      expect(featureToggleStore.isEnabled('adminPanel')).toBeDefined();
      expect(featureToggleStore.isEnabled('enhancedSearch')).toBeDefined();
    });

    it('should merge server-side toggles with defaults', async () => {
      // Mock API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          toggles: {
            chatStreaming: false,
            newFeature: true,
            experimentalApi: true
          }
        })
      });

      await featureToggleStore.fetchToggles();

      // Server toggle should override default
      expect(featureToggleStore.isEnabled('chatStreaming')).toBe(false);
      // New toggle from server should be added
      expect(featureToggleStore.isEnabled('newFeature')).toBe(true);
      // Default toggles should remain if not in server response
      expect(featureToggleStore.isEnabled('documentConverter')).toBeDefined();
    });

    it('should persist toggle overrides to localStorage', async () => {
      await featureToggleStore.initialize();

      // Override a toggle
      featureToggleStore.setToggle('chatStreaming', false);

      const stored = localStorage.getItem('featureToggleOverrides');
      expect(stored).toBeTruthy();
      
      const overrides = JSON.parse(stored!);
      expect(overrides.chatStreaming).toBe(false);
    });

    it('should apply localStorage overrides on initialization', async () => {
      // Set override in localStorage
      const overrides = { chatStreaming: false, adminPanel: false };
      localStorage.setItem('featureToggleOverrides', JSON.stringify(overrides));

      await featureToggleStore.initialize();

      expect(featureToggleStore.isEnabled('chatStreaming')).toBe(false);
      expect(featureToggleStore.isEnabled('adminPanel')).toBe(false);
    });
  });

  describe('Toggle Evaluation', () => {
    it('should evaluate simple boolean toggles', () => {
      featureToggleStore.$patch({
        toggles: {
          simpleFeature: { enabled: true },
          disabledFeature: { enabled: false }
        }
      });

      expect(featureToggleStore.isEnabled('simpleFeature')).toBe(true);
      expect(featureToggleStore.isEnabled('disabledFeature')).toBe(false);
    });

    it('should evaluate toggles with user role conditions', () => {
      featureToggleStore.$patch({
        toggles: {
          adminFeature: {
            enabled: true,
            conditions: { roles: ['admin'] }
          }
        },
        currentUser: { role: 'user' }
      });

      expect(featureToggleStore.isEnabled('adminFeature')).toBe(false);

      // Change user role
      featureToggleStore.$patch({
        currentUser: { role: 'admin' }
      });

      expect(featureToggleStore.isEnabled('adminFeature')).toBe(true);
    });

    it('should evaluate toggles with percentage rollout', () => {
      const mockRandom = vi.spyOn(Math, 'random');

      featureToggleStore.$patch({
        toggles: {
          rolloutFeature: {
            enabled: true,
            conditions: { percentage: 50 }
          }
        },
        userId: 'user123'
      });

      // Test with value that should enable (< 0.5)
      mockRandom.mockReturnValue(0.3);
      expect(featureToggleStore.isEnabled('rolloutFeature')).toBe(true);

      // Test with value that should disable (>= 0.5)
      mockRandom.mockReturnValue(0.7);
      expect(featureToggleStore.isEnabled('rolloutFeature')).toBe(false);

      mockRandom.mockRestore();
    });

    it('should evaluate toggles with user ID whitelist', () => {
      featureToggleStore.$patch({
        toggles: {
          betaFeature: {
            enabled: true,
            conditions: {
              userIds: ['user123', 'user456']
            }
          }
        }
      });

      // User not in whitelist
      featureToggleStore.$patch({ userId: 'user789' });
      expect(featureToggleStore.isEnabled('betaFeature')).toBe(false);

      // User in whitelist
      featureToggleStore.$patch({ userId: 'user123' });
      expect(featureToggleStore.isEnabled('betaFeature')).toBe(true);
    });

    it('should evaluate toggles with multiple conditions (AND logic)', () => {
      featureToggleStore.$patch({
        toggles: {
          complexFeature: {
            enabled: true,
            conditions: {
              roles: ['admin'],
              percentage: 100,
              minVersion: '2.0.0'
            }
          }
        },
        currentUser: { role: 'admin' },
        appVersion: '2.1.0'
      });

      expect(featureToggleStore.isEnabled('complexFeature')).toBe(true);

      // Fail one condition
      featureToggleStore.$patch({
        currentUser: { role: 'user' }
      });

      expect(featureToggleStore.isEnabled('complexFeature')).toBe(false);
    });
  });

  describe('Toggle Dependencies', () => {
    it('should respect toggle dependencies', () => {
      featureToggleStore.$patch({
        toggles: {
          parentFeature: { enabled: true },
          childFeature: {
            enabled: true,
            dependencies: ['parentFeature']
          }
        }
      });

      expect(featureToggleStore.isEnabled('childFeature')).toBe(true);

      // Disable parent
      featureToggleStore.setToggle('parentFeature', false);
      expect(featureToggleStore.isEnabled('childFeature')).toBe(false);
    });

    it('should handle nested dependencies', () => {
      featureToggleStore.$patch({
        toggles: {
          featureA: { enabled: true },
          featureB: {
            enabled: true,
            dependencies: ['featureA']
          },
          featureC: {
            enabled: true,
            dependencies: ['featureB']
          }
        }
      });

      expect(featureToggleStore.isEnabled('featureC')).toBe(true);

      // Disable root dependency
      featureToggleStore.setToggle('featureA', false);
      expect(featureToggleStore.isEnabled('featureB')).toBe(false);
      expect(featureToggleStore.isEnabled('featureC')).toBe(false);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache toggle evaluations', () => {
      const evaluateSpy = vi.spyOn(featureToggleStore, 'evaluateToggle' as any);

      featureToggleStore.$patch({
        toggles: {
          cachedFeature: { enabled: true }
        }
      });

      // First call should evaluate
      featureToggleStore.isEnabled('cachedFeature');
      expect(evaluateSpy).toHaveBeenCalledTimes(1);

      // Subsequent calls should use cache
      featureToggleStore.isEnabled('cachedFeature');
      featureToggleStore.isEnabled('cachedFeature');
      expect(evaluateSpy).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache on toggle change', () => {
      const evaluateSpy = vi.spyOn(featureToggleStore, 'evaluateToggle' as any);

      featureToggleStore.$patch({
        toggles: {
          dynamicFeature: { enabled: true }
        }
      });

      featureToggleStore.isEnabled('dynamicFeature');
      expect(evaluateSpy).toHaveBeenCalledTimes(1);

      // Change toggle
      featureToggleStore.setToggle('dynamicFeature', false);

      // Should re-evaluate after change
      featureToggleStore.isEnabled('dynamicFeature');
      expect(evaluateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('A/B Testing Integration', () => {
    it('should track toggle usage for analytics', () => {
      const trackingSpy = vi.fn();
      featureToggleStore.$patch({
        toggles: {
          trackedFeature: { enabled: true }
        },
        trackingCallback: trackingSpy
      });

      featureToggleStore.isEnabled('trackedFeature');

      expect(trackingSpy).toHaveBeenCalledWith({
        feature: 'trackedFeature',
        enabled: true,
        timestamp: expect.any(Number)
      });
    });

    it('should support variant selection for A/B tests', () => {
      featureToggleStore.$patch({
        toggles: {
          abTestFeature: {
            enabled: true,
            variants: {
              control: 33,
              variantA: 33,
              variantB: 34
            }
          }
        }
      });

      const variant = featureToggleStore.getVariant('abTestFeature');
      expect(['control', 'variantA', 'variantB']).toContain(variant);
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await featureToggleStore.fetchToggles();

      // Should fall back to defaults
      expect(featureToggleStore.hasError).toBe(true);
      expect(featureToggleStore.errorMessage).toContain('Network error');
      expect(Object.keys(featureToggleStore.toggles).length).toBeGreaterThan(0);
    });

    it('should return false for undefined toggles', () => {
      expect(featureToggleStore.isEnabled('undefinedFeature')).toBe(false);
    });

    it('should handle malformed toggle configurations', () => {
      featureToggleStore.$patch({
        toggles: {
          malformedFeature: null as any
        }
      });

      expect(() => featureToggleStore.isEnabled('malformedFeature')).not.toThrow();
      expect(featureToggleStore.isEnabled('malformedFeature')).toBe(false);
    });
  });

  describe('Admin Override', () => {
    it('should allow admin users to override toggles temporarily', () => {
      featureToggleStore.$patch({
        toggles: {
          overridableFeature: { enabled: false }
        },
        currentUser: { role: 'admin' }
      });

      expect(featureToggleStore.isEnabled('overridableFeature')).toBe(false);

      // Admin override
      featureToggleStore.setAdminOverride('overridableFeature', true);
      expect(featureToggleStore.isEnabled('overridableFeature')).toBe(true);

      // Clear override
      featureToggleStore.clearAdminOverride('overridableFeature');
      expect(featureToggleStore.isEnabled('overridableFeature')).toBe(false);
    });

    it('should not allow non-admin users to use overrides', () => {
      featureToggleStore.$patch({
        toggles: {
          adminOnlyFeature: { enabled: false }
        },
        currentUser: { role: 'user' }
      });

      featureToggleStore.setAdminOverride('adminOnlyFeature', true);
      expect(featureToggleStore.isEnabled('adminOnlyFeature')).toBe(false);
    });
  });

  describe('Composable Integration', () => {
    it('should work correctly with useFeatureToggles composable', () => {
      const { isEnabled, setToggle } = useFeatureToggles();

      featureToggleStore.$patch({
        toggles: {
          composableFeature: { enabled: true }
        }
      });

      expect(isEnabled('composableFeature')).toBe(true);

      setToggle('composableFeature', false);
      expect(isEnabled('composableFeature')).toBe(false);
    });
  });
});