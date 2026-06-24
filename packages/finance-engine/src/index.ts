/**
 * @finpilot/finance-engine
 *
 * Pure-TypeScript financial domain logic for FinPilot AI. No IO, no React Native,
 * fully unit-tested. Safe to run in Node, the browser, or a React Native bundle.
 */

export * from "./types.js";
export {
  computeHealthScore,
  bandForScore,
  HEALTH_WEIGHTS,
} from "./healthScore.js";
export { recommendBudget, type BudgetInput } from "./budget.js";
export { computeInsights } from "./insights.js";
export {
  categorize,
  DEFAULT_CATEGORY_RULES,
  type CategorizeOptions,
} from "./categorize.js";
