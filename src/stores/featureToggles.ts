/**
 * Feature Toggles Store
 * 
 * This file exports the appropriate feature toggles store based on the environment.
 * In development, it provides all the feature flags needed for the SFC migration.
 * In production, it uses the production feature toggle system.
 */

import { useFeatureTogglesStore as DevStore } from './featureToggles.development';
import { useFeatureTogglesStore as ProdStore } from './featureToggles.production';

// Check if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development' || 
                      import.meta.env.DEV === true ||
                      !import.meta.env.PROD;

// Export the appropriate store
export const useFeatureTogglesStore = isDevelopment ? DevStore : ProdStore;