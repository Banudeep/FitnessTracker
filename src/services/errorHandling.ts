import { showToast } from "../components/ui";

/**
 * Database error handler utility
 * Wraps database operations with consistent error handling and user notifications
 */

export type DatabaseOperation = "save" | "load" | "delete" | "update" | "sync";

interface DatabaseErrorOptions {
  operation: DatabaseOperation;
  entity: string;
  silent?: boolean;
  rethrow?: boolean;
}

/**
 * Handle database errors consistently across the app
 */
export function handleDatabaseError(
  error: unknown,
  options: DatabaseErrorOptions
): void {
  const { operation, entity, silent = false, rethrow = false } = options;

  // Log error for debugging
  console.error(`[Database Error] ${operation} ${entity}:`, error);

  // Get user-friendly message
  const message = getDatabaseErrorMessage(error, operation, entity);

  // Show toast notification unless silent
  if (!silent) {
    showToast({
      type: "error",
      title: getErrorTitle(operation),
      message,
      duration: 5000,
    });
  }

  // Rethrow if needed
  if (rethrow) {
    throw error;
  }
}

/**
 * Wrap an async database operation with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  options: DatabaseErrorOptions
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleDatabaseError(error, options);
    return null;
  }
}

/**
 * Get user-friendly error title based on operation
 */
function getErrorTitle(operation: DatabaseOperation): string {
  switch (operation) {
    case "save":
      return "Save Failed";
    case "load":
      return "Load Failed";
    case "delete":
      return "Delete Failed";
    case "update":
      return "Update Failed";
    case "sync":
      return "Sync Failed";
    default:
      return "Database Error";
  }
}

/**
 * Get user-friendly error message
 */
function getDatabaseErrorMessage(
  error: unknown,
  operation: DatabaseOperation,
  entity: string
): string {
  // Check for specific error types
  if (error instanceof Error) {
    // SQLite specific errors
    if (error.message.includes("SQLITE_CONSTRAINT")) {
      return `Could not ${operation} ${entity}: A duplicate entry already exists.`;
    }
    if (error.message.includes("SQLITE_BUSY")) {
      return `Database is busy. Please try again in a moment.`;
    }
    if (error.message.includes("SQLITE_FULL")) {
      return `Storage is full. Please free up some space and try again.`;
    }
    if (error.message.includes("SQLITE_CORRUPT")) {
      return `Database appears corrupted. Please restart the app or reinstall.`;
    }
    if (error.message.includes("not initialized")) {
      return `Database not ready. Please restart the app.`;
    }
  }

  // Generic messages based on operation
  switch (operation) {
    case "save":
      return `Could not save ${entity}. Please try again.`;
    case "load":
      return `Could not load ${entity}. Some data may be unavailable.`;
    case "delete":
      return `Could not delete ${entity}. Please try again.`;
    case "update":
      return `Could not update ${entity}. Please try again.`;
    case "sync":
      return `Could not sync ${entity}. Check your connection and try again.`;
    default:
      return `An error occurred with ${entity}. Please try again.`;
  }
}

/**
 * Show a success toast for database operations
 */
export function showDatabaseSuccess(
  operation: DatabaseOperation,
  entity: string
): void {
  const messages: Record<DatabaseOperation, string> = {
    save: `${entity} saved successfully`,
    load: `${entity} loaded successfully`,
    delete: `${entity} deleted successfully`,
    update: `${entity} updated successfully`,
    sync: `${entity} synced successfully`,
  };

  showToast({
    type: "success",
    title: "Success",
    message: messages[operation],
    duration: 3000,
  });
}
