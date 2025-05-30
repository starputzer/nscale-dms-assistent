import { ref, reactive } from "vue";

export interface BannerAction {
  label: string;
  type?: "primary" | "secondary" | "text";
  handler?: () => void;
}

export interface BannerOptions {
  title?: string;
  dismissible?: boolean;
  actions?: BannerAction[];
  position?: "top" | "bottom";
  sticky?: boolean;
  autoDismiss?: number;
  showIcon?: boolean;
  variant?: "info" | "success" | "warning" | "error" | "neutral";
  onDismiss?: () => void;
  onAction?: (action: BannerAction) => void;
}

export interface BannerItem {
  id: string;
  message: string;
  options: BannerOptions;
  visible: boolean;
}

// Create a reactive store for banners
const banners = reactive<Record<string, BannerItem>>({});
const activeBannerId = ref<string | null>(null);

/**
 * Service for managing application-wide banners
 */
class BannerService {
  /**
   * Show a generic banner
   * @param message The message to display
   * @param options The banner options
   * @returns The banner ID
   */
  show(message: string, options: BannerOptions = {}): string {
    const id = this.generateId();

    const banner: BannerItem = {
      id,
      message,
      options: {
        variant: "info",
        dismissible: true,
        position: "top",
        sticky: false,
        showIcon: true,
        ...options,
      },
      visible: true,
    };

    // If there's an active banner, hide it
    if (activeBannerId.value) {
      this.hide(activeBannerId.value);
    }

    // Store the banner
    banners[id] = banner;
    activeBannerId.value = id;

    // Handle auto dismiss
    if (options.autoDismiss && options.autoDismiss > 0) {
      setTimeout(() => {
        this.hide(id);
      }, options.autoDismiss);
    }

    return id;
  }

  /**
   * Show an info banner
   * @param message The message to display
   * @param options The banner options
   */
  info(message: string, options: Omit<BannerOptions, "variant"> = {}): string {
    return this.show(message, { ...options, variant: "info" });
  }

  /**
   * Show a success banner
   * @param message The message to display
   * @param options The banner options
   */
  success(
    message: string,
    options: Omit<BannerOptions, "variant"> = {},
  ): string {
    return this.show(message, { ...options, variant: "success" });
  }

  /**
   * Show a warning banner
   * @param message The message to display
   * @param options The banner options
   */
  warning(
    message: string,
    options: Omit<BannerOptions, "variant"> = {},
  ): string {
    return this.show(message, { ...options, variant: "warning" });
  }

  /**
   * Show an error banner
   * @param message The message to display
   * @param options The banner options
   */
  error(message: string, options: Omit<BannerOptions, "variant"> = {}): string {
    return this.show(message, { ...options, variant: "error" });
  }

  /**
   * Show a neutral banner
   * @param message The message to display
   * @param options The banner options
   */
  neutral(
    message: string,
    options: Omit<BannerOptions, "variant"> = {},
  ): string {
    return this.show(message, { ...options, variant: "neutral" });
  }

  /**
   * Hide a specific banner
   * @param id The ID of the banner to hide
   */
  hide(id: string): void {
    const banner = banners[id];
    if (banner) {
      banner.visible = false;

      // If this was the active banner, clear it
      if (activeBannerId.value === id) {
        activeBannerId.value = null;
      }

      // Call onDismiss callback if provided
      if (banner.options.onDismiss) {
        banner.options.onDismiss();
      }

      // Remove the banner from the store after animation
      setTimeout(() => {
        delete banners[id];
      }, 300); // Animation duration
    }
  }

  /**
   * Hide all banners
   */
  hideAll(): void {
    Object.keys(banners).forEach((id: any) => {
      this.hide(id);
    });
  }

  /**
   * Get all active banners
   */
  getAll(): BannerItem[] {
    return Object.values(banners);
  }

  /**
   * Check if a banner is visible
   * @param id The ID of the banner
   */
  isVisible(id: string): boolean {
    return banners[id]?.visible || false;
  }

  /**
   * Get the active banner ID
   */
  getActiveBannerId(): string | null {
    return activeBannerId.value;
  }

  /**
   * Generate a unique ID for the banner
   */
  private generateId(): string {
    return `banner-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Handle an action being triggered
   * @param id The banner ID
   * @param action The action that was triggered
   */
  handleAction(id: string, action: BannerAction): void {
    const banner = banners[id];
    if (banner) {
      // Call action handler if provided
      if (action.handler) {
        action.handler();
      }

      // Call onAction callback if provided
      if (banner.options.onAction) {
        banner.options.onAction(action);
      }
    }
  }
}

// Create singleton instance
export const bannerService = new BannerService();

export default bannerService;
