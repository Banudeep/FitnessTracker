/**
 * Network Status Provider
 * Provides network connectivity status and shows offline indicator
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { WifiOff, Wifi } from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../../constants/theme";
import { showToast } from "./Toast";

interface NetworkStatusContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isConnected: true,
  isInternetReachable: true,
});

/**
 * Hook to access network status
 */
export function useNetworkStatus(): NetworkStatusContextType {
  return useContext(NetworkStatusContext);
}

interface NetworkStatusProviderProps {
  children: ReactNode;
}

/**
 * Provider component that monitors network status and displays offline banner
 */
export function NetworkStatusProvider({
  children,
}: NetworkStatusProviderProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<
    boolean | null
  >(true);
  const [showBanner, setShowBanner] = useState(false);
  const wasOfflineRef = useRef(false);
  const bannerHeight = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      setIsInternetReachable(state.isInternetReachable);
      if (!connected) {
        setShowBanner(true);
        wasOfflineRef.current = true;
      }
    });

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable;

      setIsConnected(connected);
      setIsInternetReachable(reachable);

      if (!connected) {
        // Going offline
        setShowBanner(true);
        wasOfflineRef.current = true;
      } else if (wasOfflineRef.current) {
        // Coming back online
        setShowBanner(false);
        wasOfflineRef.current = false;
        showToast({
          type: "success",
          title: "Back Online",
          message: "Your connection has been restored",
          duration: 3000,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Animate banner
  useEffect(() => {
    if (showBanner) {
      Animated.parallel([
        Animated.timing(bannerHeight, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(bannerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bannerHeight, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(bannerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [showBanner, bannerHeight, bannerOpacity]);

  const animatedBannerStyle = {
    height: bannerHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 48],
    }),
    opacity: bannerOpacity,
  };

  return (
    <NetworkStatusContext.Provider value={{ isConnected, isInternetReachable }}>
      <View style={styles.container}>
        <Animated.View style={[styles.banner, animatedBannerStyle]}>
          <WifiOff size={18} color={colors.textPrimary} />
          <Text style={styles.bannerText}>You're offline</Text>
          <Text style={styles.bannerSubtext}>
            Changes will sync when connected
          </Text>
        </Animated.View>
        {children}
      </View>
    </NetworkStatusContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    backgroundColor: colors.accentWarning,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  bannerText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  bannerSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
