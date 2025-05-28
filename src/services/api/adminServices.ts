/**
 * Admin Services - Zentraler Export aller Admin-Services
 *
 * Diese Datei exportiert alle spezialisierten Admin-Services für einfachen Import
 * in Admin-Komponenten und -Stores.
 */

// Import services
import { adminSystemService, IAdminSystemService } from "./AdminSystemService";
import { adminUsersService, IAdminUsersService } from "./AdminUsersService";
import {
  adminFeedbackService,
  IAdminFeedbackService,
} from "./AdminFeedbackService";
import { adminMotdService, IAdminMotdService } from "./AdminMotdService";
import {
  adminFeatureTogglesService,
  IAdminFeatureTogglesService,
} from "./AdminFeatureTogglesService";
// Import using default export for Document Converter
import adminDocConverterService from "./AdminDocConverterService";
import type { IAdminDocConverterService } from "./AdminDocConverterService";

// Export interfaces
export type {
  IAdminSystemService,
  IAdminUsersService,
  IAdminFeedbackService,
  IAdminMotdService,
  IAdminFeatureTogglesService,
  IAdminDocConverterService,
};

// Export singleton instances
export {
  adminSystemService,
  adminUsersService,
  adminFeedbackService,
  adminMotdService,
  adminFeatureTogglesService,
  adminDocConverterService,
};

// Export default as a convenience object for importing all services at once
const adminServices = {
  system: adminSystemService,
  users: adminUsersService,
  feedback: adminFeedbackService,
  motd: adminMotdService,
  featureToggles: adminFeatureTogglesService,
  docConverter: adminDocConverterService,
};

export default adminServices;
