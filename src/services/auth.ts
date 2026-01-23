import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
  UserCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import {
  getFirebaseAuth,
  createUserProfile,
  getUserProfile,
  UserProfile,
} from "./firebase";

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs from Firebase Console
// Go to Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration
// The Web Client ID is used for Expo Go (with proxy)
// For production builds, you'll need iOS and Android client IDs from Google Cloud Console
const EXPO_CLIENT_ID =
  "819666894250-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"; // Web client ID from Firebase

// Auth state storage key
const AUTH_STATE_KEY = "fitness-auth-state";

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL: string | null;
}

// Convert Firebase user to our AuthUser type
const toAuthUser = (firebaseUser: FirebaseUser): AuthUser => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName,
  emailVerified: firebaseUser.emailVerified,
  photoURL: firebaseUser.photoURL,
});

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<{
  success: boolean;
  user?: AuthUser;
  profile?: UserProfile;
  error?: string;
}> => {
  try {
    const auth = getFirebaseAuth();
    const credential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update display name if provided
    if (displayName && credential.user) {
      await updateProfile(credential.user, { displayName });
    }

    // Create user profile in Firestore
    const profile = await createUserProfile(
      credential.user.uid,
      email,
      displayName
    );

    // Send verification email
    if (credential.user) {
      await sendEmailVerification(credential.user);
    }

    // Save auth state
    await saveAuthState(credential.user.uid);

    return {
      success: true,
      user: toAuthUser(credential.user),
      profile,
    };
  } catch (error: any) {
    console.error("Sign up failed:", error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: AuthUser;
  profile?: UserProfile;
  error?: string;
  errorCode?: string; // Include for UI to handle specific cases
}> => {
  try {
    const auth = getFirebaseAuth();
    const credential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Get user profile from Firestore
    const profile = await getUserProfile(credential.user.uid);

    // Save auth state
    await saveAuthState(credential.user.uid);

    return {
      success: true,
      user: toAuthUser(credential.user),
      profile: profile || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
      errorCode: error.code, // Include raw error code for UI handling
    };
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    await clearAuthState();
    return { success: true };
  } catch (error: any) {
    console.error("Sign out failed:", error);
    return {
      success: false,
      error: error.message || "Failed to sign out",
    };
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user) {
      return { success: false, error: "No user logged in" };
    }

    await sendEmailVerification(user);
    return { success: true };
  } catch (error: any) {
    console.error("Resend verification failed:", error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Update user display name
 */
export const updateDisplayName = async (
  displayName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user) {
      return { success: false, error: "No user logged in" };
    }

    await updateProfile(user, { displayName });
    return { success: true };
  } catch (error: any) {
    console.error("Update display name failed:", error);
    return {
      success: false,
      error: error.message || "Failed to update display name",
    };
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user) {
      return { success: false, error: "No user logged in" };
    }

    await deleteUser(user);
    await clearAuthState();
    return { success: true };
  } catch (error: any) {
    console.error("Delete account failed:", error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Reauthenticate user (required before sensitive operations like password change or account deletion)
 */
export const reauthenticateUser = async (
  currentPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user || !user.email) {
      return { success: false, error: "No user logged in" };
    }

    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    await reauthenticateWithCredential(user, credential);
    return { success: true };
  } catch (error: any) {
    console.error("Reauthentication failed:", error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Change password for logged-in user
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First reauthenticate
    const reauth = await reauthenticateUser(currentPassword);
    if (!reauth.success) {
      return reauth;
    }

    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user) {
      return { success: false, error: "No user logged in" };
    }

    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error: any) {
    console.error("Change password failed:", error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Delete account with reauthentication
 */
export const deleteAccountWithPassword = async (
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First reauthenticate
    const reauth = await reauthenticateUser(password);
    if (!reauth.success) {
      return reauth;
    }

    // Then delete account
    return await deleteAccount();
  } catch (error: any) {
    console.error("Delete account failed:", error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Get current Firebase user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  const auth = getFirebaseAuth();
  return auth.currentUser;
};

/**
 * Get current user ID
 */
export const getCurrentUserId = (): string | null => {
  const auth = getFirebaseAuth();
  return auth.currentUser?.uid || null;
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = (): boolean => {
  const auth = getFirebaseAuth();
  return auth.currentUser !== null;
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthChanges = (
  callback: (user: AuthUser | null) => void
): (() => void) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback(toAuthUser(firebaseUser));
    } else {
      callback(null);
    }
  });
};

// Helper: Save auth state to AsyncStorage
const saveAuthState = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      AUTH_STATE_KEY,
      JSON.stringify({ userId, timestamp: Date.now() })
    );
  } catch (error) {
    console.error("Failed to save auth state:", error);
  }
};

// Helper: Clear auth state from AsyncStorage
const clearAuthState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_STATE_KEY);
  } catch (error) {
    console.error("Failed to clear auth state:", error);
  }
};

// Helper: Get saved auth state
export const getSavedAuthState = async (): Promise<{
  userId: string;
} | null> => {
  try {
    const state = await AsyncStorage.getItem(AUTH_STATE_KEY);
    return state ? JSON.parse(state) : null;
  } catch {
    return null;
  }
};

// Helper: Convert Firebase error codes to user-friendly messages
export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in or use a different email.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Email/password accounts are not enabled. Please contact support.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email. Please sign up first.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      // Firebase enables email enumeration protection - this error can mean either:
      // 1. User doesn't exist, or 2. Wrong password
      return "Incorrect email or password. If you don't have an account, please sign up.";
    case "auth/user-not-found":
      return "No account found with this email. Please sign up first.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/requires-recent-login":
      return "Please sign in again to perform this action.";
    default:
      return "An error occurred. Please try again.";
  }
};

// ==================== APPLE SIGN IN ====================

/**
 * Check if Apple Sign-In is available (iOS 13+)
 */
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== "ios") return false;
  return await AppleAuthentication.isAvailableAsync();
};

/**
 * Sign in with Apple
 */
export const signInWithApple = async (): Promise<{
  success: boolean;
  user?: AuthUser;
  profile?: UserProfile;
  error?: string;
}> => {
  try {
    // Generate nonce for security
    const nonce = Math.random().toString(36).substring(2, 10);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce
    );

    // Request Apple sign-in
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return {
        success: false,
        error: "Apple Sign-In failed. No identity token.",
      };
    }

    // Create Firebase credential
    const auth = getFirebaseAuth();
    const provider = new OAuthProvider("apple.com");
    const oAuthCredential = provider.credential({
      idToken: credential.identityToken,
      rawNonce: nonce,
    });

    // Sign in to Firebase
    const result = await signInWithCredential(auth, oAuthCredential);

    // Get or create user profile
    let profile = await getUserProfile(result.user.uid);
    if (!profile) {
      const displayName = credential.fullName
        ? `${credential.fullName.givenName || ""} ${
            credential.fullName.familyName || ""
          }`.trim()
        : null;
      profile = await createUserProfile(
        result.user.uid,
        result.user.email || "",
        displayName || undefined
      );
    }

    await saveAuthState(result.user.uid);

    return {
      success: true,
      user: toAuthUser(result.user),
      profile,
    };
  } catch (error: any) {
    console.error("Apple Sign-In failed:", error);

    if (error.code === "ERR_REQUEST_CANCELED") {
      return { success: false, error: "Sign in was canceled." };
    }

    return {
      success: false,
      error:
        getAuthErrorMessage(error.code) ||
        "Apple Sign-In failed. Please try again.",
    };
  }
};

// ==================== GOOGLE SIGN IN ====================

/**
 * Get Google Auth configuration for use with expo-auth-session hook
 */
export const getGoogleAuthConfig = () => {
  return {
    webClientId:
      "819666894250-iscv2asl14l46r2upe00capt7rrdjbst.apps.googleusercontent.com",
    iosClientId:
      "819666894250-iscv2asl14l46r2upe00capt7rrdjbst.apps.googleusercontent.com",
    androidClientId:
      "819666894250-iscv2asl14l46r2upe00capt7rrdjbst.apps.googleusercontent.com",
  };
};

/**
 * Sign in with Google using an ID token from expo-auth-session
 * This should be called from a component that uses the Google.useIdTokenAuthRequest hook
 */
export const signInWithGoogleToken = async (
  idToken: string
): Promise<{
  success: boolean;
  user?: AuthUser;
  profile?: UserProfile;
  error?: string;
}> => {
  try {
    const auth = getFirebaseAuth();
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);

    // Get or create user profile
    let profile = await getUserProfile(result.user.uid);
    if (!profile) {
      profile = await createUserProfile(
        result.user.uid,
        result.user.email || "",
        result.user.displayName || undefined
      );
    }

    await saveAuthState(result.user.uid);

    return {
      success: true,
      user: toAuthUser(result.user),
      profile,
    };
  } catch (error: any) {
    console.error("Google Sign-In failed:", error);
    return {
      success: false,
      error:
        getAuthErrorMessage(error.code) ||
        "Google Sign-In failed. Please try again.",
    };
  }
};

/**
 * Legacy function - returns instructions for setup
 * Use signInWithGoogleToken with the hook-based approach instead
 */
export const signInWithGoogle = async (): Promise<{
  success: boolean;
  user?: AuthUser;
  profile?: UserProfile;
  error?: string;
}> => {
  return {
    success: false,
    error: "Use the Google Sign-In button which handles the OAuth flow.",
  };
};
