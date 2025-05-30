import { EnhancedSelfHealing } from "./enhancedSelfHealing";
import { BridgeError } from "../types";

interface HealingRule {
  condition: (error: BridgeError) => boolean;
  action: () => void | Promise<void>;
  description: string;
}

/**
 * Extended EnhancedSelfHealing with additional methods
 */
export class ExtendedEnhancedSelfHealing extends EnhancedSelfHealing {
  private healingRules: HealingRule[] = [];
  private registeredComponents: Map<string, any> = new Map();

  /**
   * Register components for self-healing
   */
  public registerComponents(components: Record<string, any>): void {
    Object.entries(components).forEach(([name, component]: any) => {
      this.registeredComponents.set(name, component);
    });
  }

  /**
   * Handle an error
   */
  public async handleError(error: BridgeError | Error): Promise<void> {
    const bridgeError: BridgeError =
      "code" in error
        ? error
        : {
            code: "UNKNOWN_ERROR",
            message: error.message,
            timestamp: Date.now(),
            details: { originalError: error },
          };

    // Try to apply healing rules
    for (const rule of this.healingRules) {
      if (rule.condition(bridgeError)) {
        try {
          await rule.action();
          console.log(`Applied healing rule: ${rule.description}`);
          return;
        } catch (healingError) {
          console.error(
            `Failed to apply healing rule: ${rule.description}`,
            healingError,
          );
        }
      }
    }

    // If no rule matched, log the error
    console.error("Unhandled bridge error:", bridgeError);
  }

  /**
   * Register a healing rule
   */
  public registerRule(
    condition: (error: BridgeError) => boolean,
    action: () => void | Promise<void>,
    description: string,
  ): void {
    this.healingRules.push({ condition, action, description });
  }
}
