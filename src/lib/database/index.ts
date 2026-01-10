/**
 * Database Module Index
 *
 * This file re-exports all database functions from the main database.ts file.
 * Import from "@/lib/database" continues to work as expected.
 *
 * Future: Functions will be gradually migrated to separate modules for better maintainability:
 * - items.ts: Items, recipes, and crafting calculations
 * - orders.ts: Market orders
 * - prices.ts: Price tracking and analytics
 * - alliances.ts: Alliance management
 * - characters.ts: Character showcase
 * - treasures.ts: Treasure hunting
 */

// Re-export everything from the main database file
export * from "../database";

// Also export common utilities
export { validatePagination } from "./common";
