export type { User, DatabaseInstance } from "./server/db/core";
export { getDb } from "./server/db/core";

export {
  createConversation,
  updateConversationTitle,
  updateConversationTool,
  getConversationsFromDb,
  getConversationById,
  getConversationByShortCode,
  claimConversationForUser,
  resolveConversationId,
  saveMessageToDb,
  getMessagesFromDb,
  countUserMessages,
  deleteConversation,
  searchMessages,
} from "./server/db/conversations";

export {
  saveVerificationCode,
  getRecentVerificationCodeCount,
  recordLoginAttempt,
  getRecentLoginFailureCount,
  clearLoginAttempts,
  verifyCode,
  getOrCreateUser,
  createUserWithPassword,
  getUserByEmail,
  getUserById,
  listUsersForAdmin,
  clearUserPasswordById,
  deleteUserById,
  updateUserPassword,
  updateUserProfile,
  getUserFeatureOrder,
  updateUserFeatureOrder,
} from "./server/db/auth";

export { getUserProfileFromDb, saveUserProfileToDb } from "./server/db/profiles";

export {
  listAssessmentsForUser,
  saveAssessmentForUser,
  deleteAssessmentsForUser,
  deleteAssessmentsByUserId,
} from "./server/db/assessments";

export {
  saveWinlinezScoreToDb,
  getWinlinezScoresForUser,
  getWinlinezSummaryForUser,
  deleteWinlinezScoreById,
  getWinlinezLeaderboard,
} from "./server/db/winlinez";

export {
  savePikachuVolleyballScoreToDb,
  getPikachuVolleyballScoresForUser,
} from "./server/db/pikachu-volleyball";

export {
  incrementUserTokens,
  incrementToolUsage,
  getUserStats,
  trackEvent,
  getAnalyticsEvents,
} from "./server/db/analytics";
