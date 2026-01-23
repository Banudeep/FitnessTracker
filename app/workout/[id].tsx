import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Check,
  X,
  Dumbbell,
  ChevronRight,
  Clock,
  Target,
  Flame,
  GripVertical,
} from "lucide-react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useWorkoutStore } from "../../src/stores/workoutStore";
import { useSettingsStore } from "../../src/stores/settingsStore";
import { Button, Card, ConfirmModal } from "../../src/components/ui";
import {
  colors as defaultColors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "../../src/constants/theme";
import { useColors } from "../../src/contexts/ThemeContext";
import {
  getLastWorkoutForTemplate,
  saveWorkoutSession,
} from "../../src/services/database";
import type { ExercisePrefill, Exercise, ExerciseLog } from "../../src/types";

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const templates = useWorkoutStore((state) => state.templates);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const endWorkout = useWorkoutStore((state) => state.endWorkout);
  const cancelWorkout = useWorkoutStore((state) => state.cancelWorkout);
  const selectExercise = useWorkoutStore((state) => state.selectExercise);
  const reorderExerciseLogs = useWorkoutStore(
    (state) => state.reorderExerciseLogs
  );
  const preferredUnit = useSettingsStore((state) => state.preferredUnit);
  const colors = useColors();

  const [prefillData, setPrefillData] = useState<
    Record<string, ExercisePrefill>
  >({});
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("0:00");

  // Resume active workout or start new one
  useEffect(() => {
    const loadWorkout = async () => {
      if (!id) return;

      // If there's already an active workout for this template, use it
      if (activeWorkout && activeWorkout.session.templateId === id) {
        // Already have the active workout, no need to do anything
        return;
      }

      const template = templates.find((t) => t.id === id);
      if (!template) return;

      // Start/resume workout (this will check for existing active workout for this template)
      await startWorkout(template);
    };

    loadWorkout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, templates, startWorkout]);

  // Load prefill data
  useEffect(() => {
    const loadPrefill = async () => {
      if (id) {
        const lastSession = await getLastWorkoutForTemplate(id);
        if (lastSession) {
          const prefill: Record<string, ExercisePrefill> = {};
          lastSession.exerciseLogs.forEach((log) => {
            prefill[log.exerciseId] = {
              exerciseId: log.exerciseId,
              sets: log.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
            };
          });
          setPrefillData(prefill);
        }
      }
    };
    loadPrefill();
  }, [id]);

  const handleExercisePress = (exerciseId: string) => {
    selectExercise(exerciseId);
    router.push(`/workout/exercise/${exerciseId}`);
  };

  const handleDragEnd = useCallback(
    ({ data }: { data: ExerciseLog[] }) => {
      reorderExerciseLogs(data);
    },
    [reorderExerciseLogs]
  );

  const handleFinishWorkout = async () => {
    const completedSession = endWorkout();
    if (completedSession) {
      await saveWorkoutSession(completedSession);
      router.replace("/workout/complete");
    }
  };

  const handleCancelWorkout = () => {
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    await cancelWorkout();
    router.replace("/");
  };

  // Calculate elapsed time - only starts counting after first set is logged
  useEffect(() => {
    if (!activeWorkout) return;

    // Only start timer if user has logged at least one set
    if (!activeWorkout.firstSetTime) {
      setElapsedTime("0:00");
      return;
    }

    const startTime = activeWorkout.firstSetTime;
    const updateTimer = () => {
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      setElapsedTime(`${diffMins}:${diffSecs.toString().padStart(2, "0")}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  if (!activeWorkout) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading workout...</Text>
      </View>
    );
  }

  const completedCount = activeWorkout.completedExerciseIds.length;
  const totalCount = activeWorkout.session.exerciseLogs.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Calculate total volume
  const totalVolume = activeWorkout.session.exerciseLogs.reduce((acc, log) => {
    return (
      acc + log.sets.reduce((setAcc, set) => setAcc + set.weight * set.reps, 0)
    );
  }, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: activeWorkout.template.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCancelWorkout}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* Stats Header */}
        <View style={[styles.statsHeader, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.bgTertiary }]}>
                <Clock size={16} color={colors.accentPrimary} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{elapsedTime}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.bgTertiary }]}>
                <Target size={16} color={colors.accentSecondary} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {completedCount}/{totalCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Exercises</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.bgTertiary }]}>
                <Flame size={16} color={colors.accentWarning} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {totalVolume.toLocaleString()}{" "}
                  <Text style={[styles.statUnit, { color: colors.textMuted }]}>({preferredUnit})</Text>
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Volume</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        {/* Exercise List */}
        <View style={styles.exerciseList}>
          <Text style={styles.sectionTitle}>Exercises</Text>

          <DraggableFlatList
            data={activeWorkout.session.exerciseLogs}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({
              item: log,
              drag,
              isActive,
              getIndex,
            }: RenderItemParams<ExerciseLog>) => {
              const index = getIndex() ?? 0;
              const isCompleted = activeWorkout.completedExerciseIds.includes(
                log.exerciseId
              );
              const lastData = prefillData[log.exerciseId];
              const setsCompleted = log.sets.length;
              const exerciseVolume = log.sets.reduce(
                (acc, set) => acc + set.weight * set.reps,
                0
              );

              return (
                <ScaleDecorator>
                  <TouchableOpacity
                    style={[
                      styles.exerciseCard,
                      { backgroundColor: colors.bgSecondary },
                      isCompleted && { backgroundColor: colors.bgTertiary, borderColor: colors.accentSecondary + "40" },
                      isActive && { backgroundColor: colors.bgTertiary, shadowColor: colors.accentPrimary },
                    ]}
                    onPress={() => handleExercisePress(log.exerciseId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exerciseContent}>
                      <TouchableOpacity
                        style={styles.dragHandle}
                        onLongPress={drag}
                        delayLongPress={100}
                      >
                        <GripVertical size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                      <View style={styles.exerciseLeft}>
                        <View
                          style={[
                            styles.exerciseNumber,
                            { backgroundColor: colors.bgTertiary },
                            isCompleted && { backgroundColor: colors.accentSecondary },
                          ]}
                        >
                          {isCompleted ? (
                            <Check size={16} color={colors.bgPrimary} />
                          ) : (
                            <Text style={[styles.exerciseNumberText, { color: colors.textMuted }]}>
                              {index + 1}
                            </Text>
                          )}
                        </View>

                        <View style={styles.exerciseInfo}>
                          <Text
                            style={[
                              styles.exerciseName,
                              { color: colors.textPrimary },
                              isCompleted && { color: colors.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {log.exerciseName}
                          </Text>

                          {isCompleted && log.sets.length > 0 ? (
                            <View style={styles.exerciseMetaRow}>
                              <Text style={styles.exerciseStatsCompleted}>
                                {log.sets.length} sets •{" "}
                                {exerciseVolume.toLocaleString()}{" "}
                                {preferredUnit}
                              </Text>
                            </View>
                          ) : lastData && lastData.sets.length > 0 ? (
                            <Text style={styles.exerciseLast}>
                              Last: {lastData.sets[0].weight} {preferredUnit} ×{" "}
                              {lastData.sets[0].reps}
                            </Text>
                          ) : (
                            <Text style={styles.exerciseLast}>
                              Tap to start
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.exerciseRight}>
                        {setsCompleted > 0 && !isCompleted && (
                          <View style={styles.inProgressBadge}>
                            <Text style={styles.inProgressText}>
                              {setsCompleted}{" "}
                              {setsCompleted === 1 ? "set" : "sets"}
                            </Text>
                          </View>
                        )}
                        <ChevronRight size={20} color={colors.textMuted} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </ScaleDecorator>
              );
            }}
          />
        </View>

        {/* Finish Button */}
        <View style={[styles.footer, { backgroundColor: colors.bgPrimary, borderTopColor: colors.border }]}>
          <Button
            title="Finish Workout"
            onPress={handleFinishWorkout}
            size="lg"
            fullWidth
            disabled={completedCount === 0}
          />
        </View>

        {/* Cancel Workout Modal */}
        <ConfirmModal
          visible={cancelModalVisible}
          onClose={() => setCancelModalVisible(false)}
          onConfirm={handleConfirmCancel}
          title="Cancel Workout"
          message="Are you sure you want to cancel this workout? Your progress will be lost."
          confirmText="Cancel Workout"
          cancelText="Keep Going"
          destructive
        />
      </GestureHandlerRootView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultColors.bgPrimary,
  },
  cancelButton: {
    padding: spacing.sm,
  },
  cancelButtonText: {
    ...typography.body,
    color: defaultColors.accentDanger,
    fontWeight: "600",
  },
  statsHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: defaultColors.bgSecondary,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: defaultColors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "700",
  },
  statLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
  },
  statUnit: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    fontWeight: "400",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: defaultColors.border,
    marginHorizontal: spacing.sm,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: defaultColors.accentPrimary,
    borderRadius: 2,
  },
  progressHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: defaultColors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
  },
  resumeText: {
    ...typography.caption,
    color: defaultColors.textMuted,
  },
  sectionTitle: {
    ...typography.caption,
    color: defaultColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  listContent: {
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  exerciseCardCompleted: {
    backgroundColor: defaultColors.bgTertiary,
    borderColor: defaultColors.accentSecondary + "40",
  },
  exerciseCardDragging: {
    backgroundColor: defaultColors.bgTertiary,
    shadowColor: defaultColors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    padding: spacing.sm,
    marginRight: spacing.xs,
    marginLeft: -spacing.xs,
  },
  exerciseContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: defaultColors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseNumberCompleted: {
    backgroundColor: defaultColors.accentSecondary,
  },
  exerciseNumberText: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    fontWeight: "600",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  exerciseNameCompleted: {
    color: defaultColors.textSecondary,
  },
  exerciseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  exerciseStatsCompleted: {
    ...typography.bodySmall,
    color: defaultColors.accentSecondary,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${defaultColors.accentPrimary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseStats: {
    ...typography.bodySmall,
    color: defaultColors.accentPrimary,
    marginTop: spacing.sm,
  },
  exerciseLast: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    marginTop: spacing.xs,
  },
  exerciseRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inProgressBadge: {
    backgroundColor: defaultColors.accentWarning + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  inProgressText: {
    ...typography.caption,
    color: defaultColors.accentWarning,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 100,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: defaultColors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: defaultColors.border,
  },
  errorText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    textAlign: "center",
    marginTop: 100,
  },
});
