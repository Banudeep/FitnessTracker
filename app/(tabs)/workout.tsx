import React, { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useRouter, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronRight,
  Plus,
  Dumbbell,
  Trash2,
  Edit2,
  Target,
  GripVertical,
  Activity,
} from "lucide-react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useWorkoutStore } from "../../src/stores/workoutStore";
import { ConfirmModal, InfoModal } from "../../src/components/ui";
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from "../../src/constants/theme";
import { useColors } from "../../src/contexts/ThemeContext";
import { getAllActiveWorkoutSessions } from "../../src/services/database";
import type { WorkoutTemplate, WorkoutSession } from "../../src/types";

export default function WorkoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const themeColors = useColors(); // Dynamic theme colors
  const styles = useMemo(() => createStyles(themeColors), [themeColors]); // Dynamic styles
  const templates = useWorkoutStore((state) => state.templates);
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const removeTemplate = useWorkoutStore((state) => state.removeTemplate);
  const reorderTemplates = useWorkoutStore((state) => state.reorderTemplates);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [cannotDeleteModalVisible, setCannotDeleteModalVisible] =
    useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Set header edit button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => setIsEditing((prev) => !prev)}
          style={{ padding: 8 }}
        >
          <Text style={{ 
            color: colors.accentPrimary, 
            fontWeight: "600",
            fontSize: 16 
          }}>
            {isEditing ? "Done" : "Edit"}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEditing]);
  const [liveTemplateIds, setLiveTemplateIds] = useState<Set<string>>(new Set());

  // Load active sessions on mount and when activeWorkout changes
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        const activeSessions = await getAllActiveWorkoutSessions();
        // Only show as "Live" if the session has at least one set logged
        const liveIds = new Set<string>();
        activeSessions.forEach((session) => {
          const hasLoggedSets = session.exerciseLogs.some(
            (log) => log.sets.length > 0
          );
          if (session.templateId && hasLoggedSets) {
            liveIds.add(session.templateId);
          }
        });
        setLiveTemplateIds(liveIds);
      } catch (error) {
        console.error("Failed to load active sessions:", error);
      }
    };
    loadActiveSessions();
  }, [activeWorkout]); // Re-run when activeWorkout changes

  const customTemplates = templates.filter((t) => !t.isPreset);

  const handleStartWorkout = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      await startWorkout(template);
      router.push(`/workout/${templateId}`);
    }
  };

  const handleCreateWorkout = () => {
    router.push("/workout/create");
  };

  const handleEditWorkout = (templateId: string) => {
    router.push(`/workout/create?edit=${templateId}`);
  };

  const handleDeleteWorkout = (templateId: string, templateName: string) => {
    // Find the template to check if it's a preset
    const template = templates.find((t) => t.id === templateId);

    // Don't allow deleting preset workouts
    if (template?.isPreset) {
      setCannotDeleteModalVisible(true);
      return;
    }

    setTemplateToDelete({ id: templateId, name: templateName });
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await removeTemplate(templateToDelete.id);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      setErrorMessage("Failed to delete workout. Please try again.");
      setErrorModalVisible(true);
      setTemplateToDelete(null);
    }
  };

  const handleDragEnd = useCallback(
    ({ data }: { data: WorkoutTemplate[] }) => {
      // Merge reordered custom templates back with preset templates
      const presetTemplates = templates.filter((t) => t.isPreset);
      reorderTemplates([...data, ...presetTemplates]);
    },
    [templates, reorderTemplates]
  );

  const renderItem = useCallback(
    ({ item: template, drag, isActive }: RenderItemParams<WorkoutTemplate>) => {
      const muscleGroups = [
        ...new Set(
          template.exercises.map((e) => e.exercise?.category).filter(Boolean)
        ),
      ];

      // Check if this template has an active workout with at least one set logged
      const isLive = liveTemplateIds.has(template.id);

      return (
        <ScaleDecorator>
          <TouchableOpacity
            style={[
              styles.workoutCard,
              isActive && styles.workoutCardDragging,
              isLive && styles.workoutCardLive,
            ]}
            onPress={() => handleStartWorkout(template.id)}
            onLongPress={isEditing ? drag : undefined}
            delayLongPress={150}
            activeOpacity={0.7}
          >
            {isEditing && (
              <TouchableOpacity
                style={styles.dragHandle}
                onPressIn={drag}
                delayLongPress={0}
              >
                <GripVertical size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            <View style={styles.workoutCardContent}>
              <View style={styles.workoutNameRow}>
                <Text style={styles.workoutName} numberOfLines={1}>
                  {template.name}
                </Text>
                {isLive && (
                  <View style={styles.liveBadge}>
                    <Activity size={12} color={colors.accentPrimary} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                )}
              </View>
              <View style={styles.workoutMeta}>
                <View style={styles.workoutMetaItem}>
                  <Target size={12} color={colors.textMuted} />
                  <Text style={styles.workoutMetaText}>
                    {template.exercises.length} exercises
                  </Text>
                </View>
                {muscleGroups.length > 0 && (
                  <View style={styles.workoutMetaItem}>
                    <Dumbbell size={12} color={colors.textMuted} />
                    <Text style={styles.workoutMetaText} numberOfLines={1}>
                      {muscleGroups.slice(0, 2).join(", ")}
                      {muscleGroups.length > 2 &&
                        ` +${muscleGroups.length - 2}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {isEditing && (
              <View style={styles.workoutCardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEditWorkout(template.id);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Edit2 size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteWorkout(template.id, template.name);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color={colors.accentDanger} />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [liveTemplateIds, isEditing, styles]
  );

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: themeColors.bgPrimary }]}>

      {customTemplates.length > 0 ? (
        <DraggableFlatList
          data={customTemplates}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          containerStyle={styles.listContainer}
          ListFooterComponent={
            <>
              {/* Create Button */}
              <TouchableOpacity
                style={styles.createButton}
                activeOpacity={0.7}
                onPress={handleCreateWorkout}
              >
                <View style={styles.createButtonIcon}>
                  <Plus size={20} color={colors.textPrimary} />
                </View>
                <View style={styles.createButtonContent}>
                  <Text style={styles.createButtonTitle}>
                    Create New Workout
                  </Text>
                  <Text style={styles.createButtonSubtext}>
                    Build your custom routine
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.bottomPadding} />
            </>
          }
        />
      ) : (
        <>
          <Animated.View 
            entering={FadeIn.delay(100).duration(300)}
            style={styles.emptyState}
          >
            <View style={styles.emptyStateIcon}>
              <Dumbbell size={32} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyStateText}>No workouts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first routine to get started
            </Text>
          </Animated.View>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            activeOpacity={0.7}
            onPress={handleCreateWorkout}
          >
            <View style={styles.createButtonIcon}>
              <Plus size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.createButtonContent}>
              <Text style={styles.createButtonTitle}>Create New Workout</Text>
              <Text style={styles.createButtonSubtext}>
                Build your custom routine
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Workout"
        message={`Are you sure you want to delete "${templateToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
      />

      {/* Error Modal */}
      <InfoModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        title="Error"
        message={errorMessage}
      />

      {/* Cannot Delete Modal */}
      <InfoModal
        visible={cannotDeleteModalVisible}
        onClose={() => setCannotDeleteModalVisible(false)}
        title="Cannot Delete"
        message="Preset workouts cannot be deleted."
      />
    </GestureHandlerRootView>
  );
}

// Dynamic styles creator function
const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: spacing.lg,
  },
  listContainer: {
    flex: 1,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  header: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  headerSubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },

  // Active Workout Card containing the Live indicator
  liveWorkoutContainer: {
    marginBottom: spacing.lg,
  },
  liveWorkoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
  },
  liveIndicator: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(234, 179, 8, 0.15)", // Translucent primary
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  liveContent: {
    flex: 1,
  },
  liveLabel: {
    ...typography.caption,
    color: colors.accentPrimary,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liveTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  liveArrow: {
    marginLeft: spacing.sm,
  },

  // Workout Card
  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  workoutCardDragging: {
    backgroundColor: colors.bgTertiary,
    shadowColor: colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  workoutCardLive: {
    borderWidth: 1,
    borderColor: colors.accentPrimary,
  },
  dragHandle: {
    padding: spacing.sm,
    marginRight: spacing.xs,
    marginLeft: -spacing.xs,
  },
  workoutCardLeft: {
    marginRight: spacing.md,
  },
  workoutNumber: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutNumberText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
  },
  workoutCardContent: {
    flex: 1,
  },
  workoutNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  workoutName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    flex: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  liveBadgeText: {
    ...typography.caption,
    color: colors.accentPrimary,
    fontWeight: "700",
    fontSize: 10,
  },
  workoutMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  workoutMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  workoutMetaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  workoutCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },

  // Create Button
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  createButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  createButtonTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  createButtonSubtext: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Empty State
  emptyState: {
    padding: spacing.xxl,
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyStateText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyStateSubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  bottomPadding: {
    height: 100,
  },
});
