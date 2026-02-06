/**
 * Database Module - MySQL/MariaDB
 *
 * This module provides database functions for the WURM-TOOLS application.
 * All functions are async and use the MySQL connection pool.
 *
 * This is a barrel file that re-exports from sub-modules in ./db/
 */

// Re-export unified query functions from db/core
export { query, getClient, withTransaction, getMySQLPool, closeConnections } from "./db/core";
export type { QueryResult, DbClient } from "./db/core";

// Pagination
export { validatePagination } from "./db/pagination";
export type { PaginatedResult, PaginationParams } from "./db/pagination";

// Items (query + CRUD)
export {
  getAllItems,
  getItemsPaginated,
  getItem,
  getItemByName,
  searchItems,
  getCategories,
  getItemCategories,
  setItemCategories,
  getCategoriesWithCounts,
  getUncategorizedItems,
  getSkills,
  getRecipe,
  getAllRecipes,
  addItem,
  updateItem,
  updateItemCraftingData,
  deleteItem,
  addRecipeIngredient,
  updateRecipeIngredient,
  deleteRecipeIngredient,
} from "./db/items";

// Calculator
export {
  formatQuantity,
  calculateBaseMaterials,
  buildCraftingTree,
  getMaterialsList,
  getDirectIngredients,
  buildShallowCraftingTree,
  calculateAdvancedMaterials,
  getSkillGrindingPath,
  findOptimalTrainingItem,
  findOptimalTrainingItems,
  calculateBatchEfficiency,
} from "./db/calculator";

// Import/Export
export {
  exportToJson,
  importFromJson,
  clearAllData,
  getStats,
  parseItemsCsv,
  parseRecipesCsv,
  importItemsFromCsv,
  importRecipesFromCsv,
} from "./db/import-export";

// Market Orders & Merchants
export {
  getAllOrders,
  getOrdersPaginated,
  getOrderById,
  getUserOrders,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  expireOldOrders,
  getOrderStats,
  getAllMerchants,
  getMerchantsPaginated,
  getMerchantById,
  getUserMerchants,
  createMerchant,
  updateMerchant,
  toggleMerchantActive,
  deleteMerchant,
  getMerchantStats,
  getServers,
} from "./db/market";

// Alliances
export {
  getAllAlliances,
  getAlliancesPaginated,
  getAllianceById,
  getUserAlliance,
  createAlliance,
  updateAlliance,
  deleteAlliance,
  getAllianceMembers,
  getAllianceMember,
  getUserInvites,
  getAllianceInvites,
  createInvite,
  respondToInvite,
  cancelInvite,
  removeMember,
  updateMemberRole,
  transferLeadership,
} from "./db/alliances";

// Prices
export {
  recordPrice,
  getPriceHistory,
  getPriceGuideItems,
  getServerPriceComparison,
  getPopularPricedItems,
  submitPrice,
  getPriceAnalytics,
  getTrendingItems,
  getBestDeals,
  getUserPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
  checkPriceAlerts,
} from "./db/prices";
export type { PriceGuideItem, ServerPriceComparison } from "./db/prices";

// Projects
export {
  getUserProjects,
  getSharedProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectItems,
  addProjectItem,
  getProjectMaterials,
  removeProjectItem,
  updateProjectItemProgress,
} from "./db/projects";

// Map
export {
  getMapLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  verifyLocation,
} from "./db/map";

// Achievements
export {
  getAllAchievements,
  getAchievements,
  getUserAchievements,
  checkAndUpdateAchievements,
  getCompletedAchievements,
  getUserXP,
  getLeaderboard,
} from "./db/achievements";

// Webhooks
export {
  getUserWebhooks,
  getWebhookById,
  createWebhook,
  deleteWebhook,
  updateWebhook,
} from "./db/webhooks";

// Submissions
export {
  getUserSubmissions,
  getAllSubmissions,
  getRecipeSubmissionById,
  createRecipeSubmission,
  reviewRecipeSubmission,
  approveAndAddRecipe,
} from "./db/submissions";

// Trading
export {
  findMatches,
  getUserMatches,
  getMatchById,
  updateMatchStatus,
  expireOldMatches,
  getBarterSuggestions,
  createRating,
  getUserRatings,
  getUserReputation,
} from "./db/trading";

// Characters
export {
  getUserCharacters,
  getUserCharactersWithStats,
  getCharacterById,
  getCharacterWithStats,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  setPrimaryCharacter,
  getCharacterCount,
  getPrimaryCharacter,
} from "./db/characters";

// Treasure
export {
  getUserTreasureHunts,
  getTreasureHuntById,
  getChildHunts,
  createTreasureHunt,
  updateTreasureHunt,
  deleteTreasureHunt,
  getTreasureLoot,
  addTreasureLoot,
  deleteTreasureLoot,
  getTreasureStats,
  getSharedTreasures,
  getSharedTreasureById,
  createSharedTreasure,
  updateSharedTreasure,
  deleteSharedTreasure,
  voteSharedTreasure,
  verifySharedTreasure,
  shareTreasureHuntWithUser,
  unshareTreasureHunt,
  getTreasureHuntShares,
  getHuntsSharedWithMe,
  searchUsersForSharing,
} from "./db/treasure";

// Community
export {
  getCommunityResources,
  getCommunityResourceById,
  createCommunityResource,
  updateCommunityResource,
  deleteCommunityResource,
  incrementResourceViewCount,
  incrementResourceDownloadCount,
  getResourceVersions,
  addResourceVersion,
  getResourceRatings,
  addOrUpdateResourceRating,
  deleteResourceRating,
  getResourceComments,
  addResourceComment,
  deleteResourceComment,
  getResourceCategories,
  getPopularResources,
  getFeaturedResources,
} from "./db/community";

// Email
export {
  createEmailVerificationCode,
  verifyEmailCode,
  updateUserEmail,
  getUserByEmail,
  getUserById,
  isEmailInUse,
  setUser2FA,
  hasUser2FAEnabled,
  createPending2FASession,
  verifyPending2FASession,
  getPending2FASession,
  deletePending2FASession,
  getEmailAlertPreferences,
  upsertEmailAlertPreferences,
} from "./db/email";
export type {
  VerificationCodeType,
  EmailVerificationCode,
  Pending2FASession,
  Pending2FASessionOptions,
  EmailAlertPreferences,
} from "./db/email";

// Wurmpedia
export {
  importWurmpediaRecipes,
  getWurmpediaRecipes,
  getWurmpediaRecipeById,
  getWurmpediaRecipeByWurmpediaId,
  searchWurmpediaRecipes,
  getWurmpediaSkills,
  getWurmpediaCategories,
  getWurmpediaStats,
  getWurmpediaImportLogs,
  clearWurmpediaRecipes,
  deleteWurmpediaRecipe,
} from "./db/wurmpedia";

// Cooking
export {
  getCookingCookers,
  getCookingContainers,
  getCookingPreparations,
  getCookingIngredientCategories,
  getCookingIngredients,
  getCookingIngredientById,
  searchCookingIngredients,
  getCookingSkills,
  getCookingSkillById,
  calculateAffinity,
  calculateCCFP,
  discoverPlayerNumber,
  saveUserPlayerNumber,
  getUserPlayerNumber,
  getUserPlayerNumbers,
  saveUserRecipe,
  getUserSavedRecipes,
  deleteUserSavedRecipe,
  toggleUserRecipeFavorite,
  getCookingRecipes,
  getCookingStats,
} from "./db/cooking";

// Archaeology
export {
  getArchaeologyPinpoints,
  getArchaeologyPinpointById,
  createArchaeologyPinpoint,
  updateArchaeologyPinpoint,
  deleteArchaeologyPinpoint,
  verifyArchaeologyPinpoint,
  voteOnArchaeologyPinpoint,
  getArchaeologyComments,
  addArchaeologyComment,
  deleteArchaeologyComment,
  getUserArchaeologyPinpoints,
  getArchaeologyStats,
  getAllRecipeItems,
  searchRecipeItems,
  getRecipeItemBySlug,
  getRecipeItemById,
  getRecipeSkills,
  updateItemVisibility,
  bulkUpdateItemVisibility,
  getRecipeItemStats,
} from "./db/archaeology";
export type {
  RecipeItemLocal as RecipeItem,
  RecipeItemMaterialLocal as RecipeItemMaterial,
  RecipeItemToolLocal as RecipeItemTool,
  RecipeItemStepLocal as RecipeItemStep,
  RecipeItemFullLocal as RecipeItemFull,
} from "./db/archaeology";

// Animals
export {
  getUserStables,
  getStableById,
  createStable,
  updateStable,
  deleteStable,
  getUserAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
  deleteAnimal,
  getAnimalTraits,
  addAnimalTrait,
  removeAnimalTrait,
  getAnimalFamilyTree,
} from "./db/animals";
