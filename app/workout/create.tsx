import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import {
  X,
  Plus,
  GripVertical,
  Trash2,
  Dumbbell,
  ChevronRight,
  ChevronDown,
  Play,
} from "lucide-react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { useWorkoutStore } from "../../src/stores/workoutStore";
import { Button, InfoModal, ConfirmModal } from "../../src/components/ui";
import { ExercisePicker } from "../../src/components/ExercisePicker";
import {
  colors as defaultColors,
  spacing,
  typography,
  borderRadius,
} from "../../src/constants/theme";
import { useColors } from "../../src/contexts/ThemeContext";
import { saveTemplate } from "../../src/services/database";
import type {
  Exercise,
  TemplateExercise,
  WorkoutTemplate,
} from "../../src/types";

interface SelectedExercise {
  id: string;
  exercise: Exercise;
}

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const colors = useColors();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const addTemplate = useWorkoutStore((state) => state.addTemplate);
  const updateTemplate = useWorkoutStore((state) => state.updateTemplate);
  const templates = useWorkoutStore((state) => state.templates);
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);

  const [workoutName, setWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<
    SelectedExercise[]
  >([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [missingNameModalVisible, setMissingNameModalVisible] = useState(false);
  const [missingExercisesModalVisible, setMissingExercisesModalVisible] =
    useState(false);
  const [discardModalVisible, setDiscardModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null
  );
  const [showPresetWorkouts, setShowPresetWorkouts] = useState(false);
  const [showCustomWorkouts, setShowCustomWorkouts] = useState(false);

  // Get preset workouts (suggested workouts)
  const presetWorkouts = (templates || []).filter((t) => t.isPreset);

  // Get custom workouts (non-preset)
  const customWorkouts = (templates || []).filter((t) => !t.isPreset);

  // Load template for editing if edit param is present
  useEffect(() => {
    if (edit) {
      const template = templates.find((t) => t.id === edit);
      if (template && !template.isPreset) {
        setIsEditing(true);
        setEditingTemplateId(edit);
        setWorkoutName(template.name);
        const exercises = template.exercises
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((te) => ({
            id: Math.random().toString(36).substring(2, 15),
            exercise: te.exercise!,
          }));
        setSelectedExercises(exercises);
      }
    }
  }, [edit, templates]);

  const handleStartWorkout = async (templateId: string) => {
    // If there's already an active workout for this template, just navigate to it
    if (activeWorkout && activeWorkout.session.templateId === templateId) {
      router.push(`/workout/${templateId}`);
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // Start/resume workout (will check for existing active workout for this template)
      await startWorkout(template);
      router.push(`/workout/${templateId}`);
    }
  };

  const handleAddExercises = (exercises: Exercise[]) => {
    const newExercises = exercises
      .filter((e) => !selectedExercises.some((se) => se.exercise.id === e.id))
      .map((exercise) => ({
        id: Math.random().toString(36).substring(2, 15),
        exercise,
      }));
    setSelectedExercises((prev) => [...prev, ...newExercises]);
  };

  const handleRemoveExercise = (id: string) => {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleExerciseDragEnd = useCallback(
    ({ data }: { data: SelectedExercise[] }) => {
      setSelectedExercises(data);
    },
    []
  );

  const renderExerciseItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<SelectedExercise>) => (
      <ScaleDecorator>
        <View
          style={[
            styles.exerciseItem,
            { backgroundColor: colors.bgSecondary },
            isActive && { backgroundColor: colors.bgTertiary, shadowColor: colors.accentPrimary },
          ]}
        >
          <TouchableOpacity
            style={styles.exerciseDragHandle}
            onLongPress={drag}
            delayLongPress={100}
          >
            <GripVertical size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.exerciseInfo}>
            <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>{item.exercise.name}</Text>
            <Text style={[styles.exerciseMeta, { color: colors.textMuted }]}>
              {item.exercise.category} • {item.exercise.equipment}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveExercise(item.id)}
          >
            <Trash2 size={18} color={colors.accentDanger} />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    ),
    []
  );

  const handleSave = async () => {
    if (!workoutName.trim()) {
      setMissingNameModalVisible(true);
      return;
    }

    if (selectedExercises.length === 0) {
      setMissingExercisesModalVisible(true);
      return;
    }

    setIsSaving(true);

    try {
      const templateExercises: Omit<TemplateExercise, "id" | "templateId">[] =
        selectedExercises.map((se, index) => ({
          exerciseId: se.exercise.id,
          displayOrder: index,
          exercise: se.exercise,
        }));

      if (isEditing && editingTemplateId) {
        // Update existing template
        await updateTemplate(editingTemplateId, {
          userId: null,
          name: workoutName.trim(),
          isPreset: false,
          exercises: templateExercises,
        });
      } else {
        // Create new template
        const savedTemplate = await saveTemplate({
          userId: null,
          name: workoutName.trim(),
          isPreset: false,
          exercises: templateExercises as TemplateExercise[],
        });

        addTemplate(savedTemplate);
      }

      router.back();
    } catch (error) {
      console.error("Failed to save template:", error);
      setErrorMessage(
        isEditing
          ? "Failed to update workout. Please try again."
          : "Failed to save workout. Please try again."
      );
      setErrorModalVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (workoutName.trim() || selectedExercises.length > 0) {
      setDiscardModalVisible(true);
    } else {
      router.back();
    }
  };

  const handleUsePreset = (template: WorkoutTemplate) => {
    // Set workout name
    setWorkoutName(template.name);

    // Add all exercises from the preset template
    const exercises = template.exercises
      .filter((te) => te.exercise)
      .map((te) => ({
        id: Math.random().toString(36).substring(2, 15),
        exercise: te.exercise!,
      }));
    setSelectedExercises(exercises);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create Workout",
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.headerButton}
            >
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Suggested Preset Workouts */}
          {presetWorkouts.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.dropdownHeader, { backgroundColor: colors.bgSecondary }]}
                onPress={() => setShowPresetWorkouts(!showPresetWorkouts)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownHeaderLeft}>
                  <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>
                    Suggested Preset Workouts
                  </Text>
                  <Text style={[styles.dropdownCount, { color: colors.textMuted }]}>
                    {presetWorkouts.length} templates
                  </Text>
                </View>
                {showPresetWorkouts ? (
                  <ChevronDown size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronRight size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {showPresetWorkouts && (
                <View style={styles.presetWorkoutsContainer}>
                  {presetWorkouts.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[styles.presetWorkoutCard, { backgroundColor: colors.bgSecondary }]}
                      onPress={() => handleUsePreset(template)}
                      activeOpacity={0.7}
                    >
                      <Dumbbell size={20} color={colors.accentPrimary} />
                      <View style={styles.presetWorkoutInfo}>
                        <Text style={[styles.presetWorkoutName, { color: colors.textPrimary }]}>
                          {template.name}
                        </Text>
                        <Text style={[styles.presetWorkoutExercises, { color: colors.textMuted }]}>
                          {template.exercises.length} exercises
                        </Text>
                      </View>
                      <ChevronRight size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Your Workouts */}
          {customWorkouts.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.dropdownHeader, { backgroundColor: colors.bgSecondary }]}
                onPress={() => setShowCustomWorkouts(!showCustomWorkouts)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownHeaderLeft}>
                  <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>Your Workouts</Text>
                  <Text style={[styles.dropdownCount, { color: colors.textMuted }]}>
                    {customWorkouts.length} templates
                  </Text>
                </View>
                {showCustomWorkouts ? (
                  <ChevronDown size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronRight size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {showCustomWorkouts && (
                <View style={styles.workoutsContainer}>
                  {customWorkouts.map((template) => {
                    const isActive =
                      activeWorkout &&
                      activeWorkout.session.templateId === template.id;
                    return (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.workoutCard,
                          { backgroundColor: colors.bgSecondary },
                          isActive && { backgroundColor: colors.bgTertiary, borderColor: colors.accentPrimary + "40", borderWidth: 1 },
                        ]}
                        onPress={() => handleStartWorkout(template.id)}
                        activeOpacity={0.7}
                      >
                        <Dumbbell
                          size={20}
                          color={
                            isActive
                              ? colors.accentPrimary
                              : colors.textSecondary
                          }
                        />
                        <View style={styles.workoutInfo}>
                          <Text
                            style={[
                              styles.workoutName,
                              { color: colors.textPrimary },
                              isActive && { color: colors.accentPrimary },
                            ]}
                          >
                            {template.name}
                          </Text>
                          <Text style={[styles.workoutExercises, { color: colors.textMuted }]}>
                            {template.exercises.length} exercises
                          </Text>
                        </View>
                        {isActive && (
                          <View style={[styles.activeIndicator, { backgroundColor: colors.accentPrimary + "20" }]}>
                            <Play size={14} color={colors.accentPrimary} />
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.useAsTemplateButton, { backgroundColor: colors.accentPrimary + "20" }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleUsePreset(template);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.useAsTemplateText, { color: colors.accentPrimary }]}>Use</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Workout Name Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Workout Name</Text>
            <TextInput
              style={[styles.nameInput, { color: colors.textPrimary, backgroundColor: colors.bgSecondary }]}
              placeholder="e.g., Upper Body, Leg Day, Push..."
              placeholderTextColor={colors.textMuted}
              value={workoutName}
              onChangeText={setWorkoutName}
              autoFocus
            />
          </View>

          {/* Exercises Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Exercises</Text>
              <Text style={[styles.count, { color: colors.textMuted }]}>
                {selectedExercises.length} selected
              </Text>
            </View>

            {selectedExercises.length === 0 ? (
              <View style={[styles.emptyExercises, { backgroundColor: colors.bgSecondary }]}>
                <Dumbbell size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No exercises added yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Tap the button below to add exercises
                </Text>
              </View>
            ) : (
              <View style={styles.exerciseList}>
                <DraggableFlatList
                  data={selectedExercises}
                  onDragEnd={handleExerciseDragEnd}
                  keyExtractor={(item) => item.id}
                  renderItem={renderExerciseItem}
                  scrollEnabled={false}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.addExerciseButton, { borderColor: colors.border }]}
              onPress={() => setShowExercisePicker(true)}
              activeOpacity={0.7}
            >
              <Plus size={20} color={colors.accentPrimary} />
              <Text style={[styles.addExerciseText, { color: colors.accentPrimary }]}>Add Exercises</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { backgroundColor: colors.bgPrimary, borderTopColor: colors.border }]}>
          <Button
            title={
              isSaving
                ? "Saving..."
                : isEditing
                ? "Update Workout"
                : "Create Workout"
            }
            onPress={handleSave}
            size="lg"
            fullWidth
            disabled={
              isSaving || !workoutName.trim() || selectedExercises.length === 0
            }
          />
        </View>

        {/* Exercise Picker */}
        <ExercisePicker
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelectExercise={() => {}}
          multiSelect
          onSelectMultiple={handleAddExercises}
          selectedExerciseIds={selectedExercises.map((e) => e.exercise.id)}
        />

        {/* Error Modal */}
        <InfoModal
          visible={errorModalVisible}
          onClose={() => setErrorModalVisible(false)}
          title="Error"
          message={errorMessage}
        />

        {/* Missing Name Modal */}
        <InfoModal
          visible={missingNameModalVisible}
          onClose={() => setMissingNameModalVisible(false)}
          title="Missing Name"
          message="Please enter a workout name."
        />

        {/* Missing Exercises Modal */}
        <InfoModal
          visible={missingExercisesModalVisible}
          onClose={() => setMissingExercisesModalVisible(false)}
          title="No Exercises"
          message="Please add at least one exercise."
        />

        {/* Discard Changes Modal */}
        <ConfirmModal
          visible={discardModalVisible}
          onClose={() => setDiscardModalVisible(false)}
          onConfirm={() => router.back()}
          title="Discard Changes"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmText="Discard"
          cancelText="Keep Editing"
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
  headerButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  count: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
  },
  nameInput: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
    backgroundColor: defaultColors.bgSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyExercises: {
    alignItems: "center",
    padding: spacing.xxxl,
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  exerciseList: {
    marginBottom: spacing.md,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  exerciseItemDragging: {
    backgroundColor: defaultColors.bgTertiary,
    shadowColor: defaultColors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exerciseDragHandle: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -spacing.xs,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "500",
  },
  exerciseMeta: {
    ...typography.caption,
    color: defaultColors.textMuted,
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  removeButton: {
    padding: spacing.sm,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: defaultColors.border,
    borderStyle: "dashed",
  },
  addExerciseText: {
    ...typography.body,
    color: defaultColors.accentPrimary,
    marginLeft: spacing.sm,
  },
  bottomPadding: {
    height: 120,
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
  sectionSubtext: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  dropdownHeaderLeft: {
    flex: 1,
  },
  dropdownLabel: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dropdownCount: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    marginTop: spacing.xs / 2,
  },
  presetWorkoutsContainer: {
    marginTop: spacing.sm,
  },
  presetWorkoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  presetWorkoutInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  presetWorkoutName: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  presetWorkoutExercises: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    marginTop: spacing.xs / 2,
  },
  workoutsContainer: {
    marginTop: spacing.sm,
  },
  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  workoutCardActive: {
    backgroundColor: defaultColors.bgTertiary,
    borderWidth: 1,
    borderColor: defaultColors.accentPrimary + "40",
  },
  workoutInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  workoutName: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  workoutNameActive: {
    color: defaultColors.accentPrimary,
  },
  workoutExercises: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    marginTop: spacing.xs / 2,
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: defaultColors.accentPrimary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  useAsTemplateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: defaultColors.accentPrimary + "20",
    borderRadius: borderRadius.sm,
  },
  useAsTemplateText: {
    ...typography.caption,
    color: defaultColors.accentPrimary,
    fontWeight: "600",
  },
});
