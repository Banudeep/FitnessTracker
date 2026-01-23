import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  User,
  Camera,
  Mail,
  Calendar,
  Target,
  Ruler,
  Weight,
  Check,
} from "lucide-react-native";
import {
  colors as defaultColors,
  spacing,
  borderRadius,
  typography,
} from "../src/constants/theme";
import { useColors } from "../src/contexts/ThemeContext";
import { useAuthStore } from "../src/stores/authStore";
import { useSettingsStore } from "../src/stores/settingsStore";
import { showToast } from "../src/components/ui";
import { ScrollPicker } from "../src/components/ui/ScrollPicker";
import { BottomSheet } from "../src/components/ui/BottomSheet";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, profile, updateProfile } = useAuthStore();
  const { preferredUnit } = useSettingsStore();

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(
    profile?.displayName || user?.displayName || ""
  );
  const [height, setHeight] = useState(profile?.height || 170);
  const [weight, setWeight] = useState(profile?.weight || 70);
  const [birthYear, setBirthYear] = useState(profile?.birthYear || 1990);
  const [fitnessGoal, setFitnessGoal] = useState(
    profile?.fitnessGoal || "general"
  );

  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showBirthYearPicker, setShowBirthYearPicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const originalName = profile?.displayName || user?.displayName || "";
    const changed =
      displayName !== originalName ||
      height !== (profile?.height || 170) ||
      weight !== (profile?.weight || 70) ||
      birthYear !== (profile?.birthYear || 1990) ||
      fitnessGoal !== (profile?.fitnessGoal || "general");
    setHasChanges(changed);
  }, [displayName, height, weight, birthYear, fitnessGoal, profile, user]);

  const fitnessGoals = [
    {
      id: "general",
      label: "General Fitness",
      description: "Stay active and healthy",
    },
    {
      id: "strength",
      label: "Build Strength",
      description: "Increase muscle and power",
    },
    {
      id: "muscle",
      label: "Build Muscle",
      description: "Hypertrophy and size gains",
    },
    {
      id: "weight-loss",
      label: "Lose Weight",
      description: "Fat loss and toning",
    },
    {
      id: "endurance",
      label: "Improve Endurance",
      description: "Cardio and stamina",
    },
    {
      id: "flexibility",
      label: "Flexibility",
      description: "Mobility and stretching",
    },
  ];

  const handleSave = async () => {
    if (!displayName.trim()) {
      showToast({ type: "error", title: "Name is required" });
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        height,
        weight,
        birthYear,
        fitnessGoal,
      });
      showToast({ type: "success", title: "Profile updated!" });
      setHasChanges(false);
    } catch (error) {
      showToast({ type: "error", title: "Failed to update profile" });
    } finally {
      setIsLoading(false);
    }
  };

  const formatHeight = (cm: number): string => {
    if (preferredUnit === "lbs") {
      const totalInches = Math.round(cm / 2.54);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return `${feet}'${inches}"`;
    }
    return `${cm} cm`;
  };

  const formatWeight = (kg: number): string => {
    if (preferredUnit === "lbs") {
      return `${Math.round(kg * 2.205)} lbs`;
    }
    return `${kg} kg`;
  };

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  const getInitials = (): string => {
    if (displayName) {
      return displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Profile</Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              !hasChanges && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.accentPrimary} />
            ) : (
              <Check
                size={24}
                color={hasChanges ? colors.accentPrimary : colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials()}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() =>
                showToast({ type: "info", title: "Photo upload coming soon" })
              }
            >
              <Camera size={16} color={colors.bgPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.emailText, { color: colors.textSecondary }]}>{user?.email}</Text>
        </View>

        {/* Name Input */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Display Name</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}>
            <User size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Physical Stats */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Physical Stats</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Used for calorie estimates and personalized recommendations
          </Text>

          <TouchableOpacity
            style={[styles.statRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowHeightPicker(true)}
          >
            <View style={styles.statLeft}>
              <Ruler size={20} color={colors.textMuted} />
              <Text style={[styles.statLabel, { color: colors.textPrimary }]}>Height</Text>
            </View>
            <View style={styles.statRight}>
              <Text style={[styles.statValue, { color: colors.accentPrimary }]}>{formatHeight(height)}</Text>
              <ArrowLeft
                size={16}
                color={colors.textMuted}
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowWeightPicker(true)}
          >
            <View style={styles.statLeft}>
              <Weight size={20} color={colors.textMuted} />
              <Text style={[styles.statLabel, { color: colors.textPrimary }]}>Weight</Text>
            </View>
            <View style={styles.statRight}>
              <Text style={[styles.statValue, { color: colors.accentPrimary }]}>{formatWeight(weight)}</Text>
              <ArrowLeft
                size={16}
                color={colors.textMuted}
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowBirthYearPicker(true)}
          >
            <View style={styles.statLeft}>
              <Calendar size={20} color={colors.textMuted} />
              <Text style={[styles.statLabel, { color: colors.textPrimary }]}>Birth Year</Text>
            </View>
            <View style={styles.statRight}>
              <Text style={[styles.statValue, { color: colors.accentPrimary }]}>
                {birthYear} ({age} years old)
              </Text>
              <ArrowLeft
                size={16}
                color={colors.textMuted}
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Fitness Goal */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fitness Goal</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Helps us tailor workout suggestions for you
          </Text>

          <TouchableOpacity
            style={[styles.goalSelector, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}
            onPress={() => setShowGoalPicker(true)}
          >
            <View style={styles.goalLeft}>
              <Target size={20} color={colors.accentPrimary} />
              <View>
                <Text style={[styles.goalLabel, { color: colors.textPrimary }]}>
                  {fitnessGoals.find((g) => g.id === fitnessGoal)?.label}
                </Text>
                <Text style={[styles.goalDescription, { color: colors.textMuted }]}>
                  {fitnessGoals.find((g) => g.id === fitnessGoal)?.description}
                </Text>
              </View>
            </View>
            <ArrowLeft
              size={16}
              color={colors.textMuted}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
          </TouchableOpacity>
        </View>

        {/* Member Since */}
        <View style={styles.memberInfo}>
          <Mail size={16} color={colors.textMuted} />
          <Text style={styles.memberText}>
            Member since{" "}
            {profile?.createdAt
              ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              : "Recently"}
          </Text>
        </View>
      </ScrollView>

      {/* Height Picker */}
      <BottomSheet
        visible={showHeightPicker}
        onClose={() => setShowHeightPicker(false)}
        title="Select Height"
      >
        <View style={styles.pickerContent}>
          <ScrollPicker
            value={height}
            onValueChange={setHeight}
            min={120}
            max={220}
            step={1}
            unit="cm"
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => setShowHeightPicker(false)}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Weight Picker */}
      <BottomSheet
        visible={showWeightPicker}
        onClose={() => setShowWeightPicker(false)}
        title="Select Weight"
      >
        <View style={styles.pickerContent}>
          <ScrollPicker
            value={weight}
            onValueChange={setWeight}
            min={30}
            max={200}
            step={1}
            unit="kg"
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => setShowWeightPicker(false)}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Birth Year Picker */}
      <BottomSheet
        visible={showBirthYearPicker}
        onClose={() => setShowBirthYearPicker(false)}
        title="Select Birth Year"
      >
        <View style={styles.pickerContent}>
          <ScrollPicker
            value={birthYear}
            onValueChange={setBirthYear}
            min={1940}
            max={currentYear - 10}
            step={1}
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => setShowBirthYearPicker(false)}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Goal Picker */}
      <BottomSheet
        visible={showGoalPicker}
        onClose={() => setShowGoalPicker(false)}
        title="Select Fitness Goal"
      >
        <View style={styles.goalPickerContent}>
          {fitnessGoals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalOption,
                fitnessGoal === goal.id && styles.goalOptionActive,
              ]}
              onPress={() => {
                setFitnessGoal(goal.id);
                setShowGoalPicker(false);
              }}
            >
              <View>
                <Text
                  style={[
                    styles.goalOptionLabel,
                    fitnessGoal === goal.id && styles.goalOptionLabelActive,
                  ]}
                >
                  {goal.label}
                </Text>
                <Text style={styles.goalOptionDescription}>
                  {goal.description}
                </Text>
              </View>
              {fitnessGoal === goal.id && (
                <Check size={20} color={colors.accentPrimary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (themeColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bgPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: themeColors.textPrimary,
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: themeColors.accentPrimary + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: "700",
    color: themeColors.accentPrimary,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeColors.accentPrimary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: themeColors.bgPrimary,
  },
  emailText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
  },
  section: {
    backgroundColor: themeColors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: "700",
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginBottom: spacing.md,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColors.bgPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: themeColors.border,
  },
  statLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  statLabel: {
    ...typography.body,
    color: themeColors.textPrimary,
  },
  statRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statValue: {
    ...typography.body,
    color: themeColors.accentPrimary,
    fontWeight: "600",
  },
  goalSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: themeColors.bgPrimary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  goalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  goalLabel: {
    ...typography.body,
    fontWeight: "600",
    color: themeColors.textPrimary,
  },
  goalDescription: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  memberText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  pickerContent: {
    padding: spacing.lg,
  },
  confirmButton: {
    backgroundColor: themeColors.accentPrimary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  confirmButtonText: {
    ...typography.body,
    fontWeight: "600",
    color: themeColors.bgPrimary,
  },
  goalPickerContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  goalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: themeColors.bgPrimary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  goalOptionActive: {
    borderColor: themeColors.accentPrimary,
    backgroundColor: themeColors.accentPrimary + "10",
  },
  goalOptionLabel: {
    ...typography.body,
    fontWeight: "600",
    color: themeColors.textPrimary,
  },
  goalOptionLabelActive: {
    color: themeColors.accentPrimary,
  },
  goalOptionDescription: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
});


