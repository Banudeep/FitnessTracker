import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Pressable,
} from "react-native";
import {
  X,
  Search,
  Plus,
  Check,
  Dumbbell,
  Trash2,
  Edit2,
} from "lucide-react-native";
import { colors as defaultColors, spacing, typography, borderRadius } from "../constants/theme";
import { useColors } from "../contexts/ThemeContext";
import {
  getAllExercises,
  createExercise,
  deleteExercise,
  updateExercise,
} from "../services/database";
import { uploadCustomExercise, syncCustomExerciseDeletion } from "../services/syncService";
import type { Exercise, ExerciseCategory, EquipmentType } from "../types";
import { Button, BottomSheet, ConfirmModal, InfoModal } from "./ui";

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  selectedExerciseIds?: string[];
  multiSelect?: boolean;
  onSelectMultiple?: (exercises: Exercise[]) => void;
}

const CATEGORIES: { label: string; value: ExerciseCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Chest", value: "chest" },
  { label: "Back", value: "back" },
  { label: "Shoulders", value: "shoulders" },
  { label: "Biceps", value: "biceps" },
  { label: "Triceps", value: "triceps" },
  { label: "Quads", value: "quads" },
  { label: "Hamstrings", value: "hamstrings" },
  { label: "Glutes", value: "glutes" },
  { label: "Core", value: "core" },
];

export const ExercisePicker: React.FC<ExercisePickerProps> = ({
  visible,
  onClose,
  onSelectExercise,
  selectedExerciseIds = [],
  multiSelect = false,
  onSelectMultiple,
}) => {
  const colors = useColors();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ExerciseCategory | "all"
  >("all");
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] =
    useState<ExerciseCategory>("chest");
  const [newExerciseEquipment, setNewExerciseEquipment] =
    useState<EquipmentType>("dumbbell");
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(
    null
  );
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [editExerciseName, setEditExerciseName] = useState("");
  const [editExerciseCategory, setEditExerciseCategory] =
    useState<ExerciseCategory>("chest");
  const [editExerciseEquipment, setEditExerciseEquipment] =
    useState<EquipmentType>("dumbbell");
  const [editExerciseDescription, setEditExerciseDescription] = useState("");

  useEffect(() => {
    if (visible) {
      loadExercises();
      setLocalSelected(selectedExerciseIds);
    }
  }, [visible]);

  const loadExercises = async () => {
    const data = await getAllExercises();
    setExercises(data);
  };

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || exercise.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exercises, searchQuery, selectedCategory]);

  const handleExercisePress = (exercise: Exercise) => {
    if (multiSelect) {
      setLocalSelected((prev) =>
        prev.includes(exercise.id)
          ? prev.filter((id) => id !== exercise.id)
          : [...prev, exercise.id]
      );
    } else {
      onSelectExercise(exercise);
      onClose();
    }
  };

  const handleDone = () => {
    if (multiSelect && onSelectMultiple) {
      const selected = exercises.filter((e) => localSelected.includes(e.id));
      onSelectMultiple(selected);
    }
    onClose();
  };

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) return;

    try {
      const newExercise = await createExercise({
        name: newExerciseName.trim(),
        category: newExerciseCategory,
        equipment: newExerciseEquipment,
        description:
          newExerciseDescription.trim() || `${newExerciseName.trim()} exercise`,
        imageUrl: null,
        isCustom: true,
        userId: null,
      });

      // Sync to cloud (fire and forget)
      uploadCustomExercise(newExercise).catch((err) => {
        console.error("[Sync] Failed to upload new exercise:", err);
      });

      // Reload exercises
      await loadExercises();

      // Reset form
      setNewExerciseName("");
      setNewExerciseCategory("chest");
      setNewExerciseEquipment("dumbbell");
      setNewExerciseDescription("");
      setShowCreateModal(false);

      // Auto-select the new exercise
      if (multiSelect) {
        setLocalSelected((prev) => [...prev, newExercise.id]);
      } else {
        onSelectExercise(newExercise);
        onClose();
      }
    } catch (error: any) {
      console.error("Error creating exercise:", error);
      const errorMsg =
        error.message ||
        "Failed to create exercise. An exercise with this name may already exist.";
      setErrorMessage(errorMsg);
      // Close the create modal first, then show error
      setShowCreateModal(false);
      // Use setTimeout to ensure the create modal closes before showing error modal
      setTimeout(() => {
        setErrorModalVisible(true);
      }, 300);
    }
  };

  const handleDeleteExercise = (exercise: Exercise, event: any) => {
    if (event) {
      event.stopPropagation(); // Prevent selecting the exercise when clicking delete
    }
    console.log("[ExercisePicker] Delete button clicked for:", exercise.name);
    setExerciseToDelete(exercise);
    setDeleteModalVisible(true);
  };

  const handleEditExercise = (exercise: Exercise, event: any) => {
    if (event) {
      event.stopPropagation(); // Prevent selecting the exercise when clicking edit
    }
    console.log("[ExercisePicker] Edit button clicked for:", exercise.name);
    setExerciseToEdit(exercise);
    setEditExerciseName(exercise.name);
    setEditExerciseCategory(exercise.category);
    setEditExerciseEquipment(exercise.equipment);
    setEditExerciseDescription(exercise.description || "");
    setShowCreateModal(true); // Reuse the create modal for editing
  };

  const handleUpdateExercise = async () => {
    if (!exerciseToEdit || !editExerciseName.trim()) return;

    try {
      const updatedExercise = await updateExercise(exerciseToEdit.id, {
        name: editExerciseName.trim(),
        category: editExerciseCategory,
        equipment: editExerciseEquipment,
        description:
          editExerciseDescription.trim() ||
          `${editExerciseName.trim()} exercise`,
        imageUrl: exerciseToEdit.imageUrl,
        isCustom: true,
        userId: exerciseToEdit.userId,
      });

      // Sync to cloud (fire and forget)
      uploadCustomExercise(updatedExercise).catch((err) => {
        console.error("[Sync] Failed to upload updated exercise:", err);
      });

      // Reload exercises
      await loadExercises();

      // Reset form
      setEditExerciseName("");
      setEditExerciseCategory("chest");
      setEditExerciseEquipment("dumbbell");
      setEditExerciseDescription("");
      setExerciseToEdit(null);
      setShowCreateModal(false);
    } catch (error: any) {
      console.error("Error updating exercise:", error);
      const errorMsg =
        error.message ||
        "Failed to update exercise. An exercise with this name may already exist.";
      setErrorMessage(errorMsg);
      setShowCreateModal(false);
      setTimeout(() => {
        setErrorModalVisible(true);
      }, 300);
    }
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;

    try {
      await deleteExercise(exerciseToDelete.id);
      
      // Sync deletion to cloud (fire and forget)
      syncCustomExerciseDeletion(exerciseToDelete.id).catch((err) => {
        console.error("[Sync] Failed to sync exercise deletion:", err);
      });
      
      await loadExercises();

      // Remove from selection if it was selected
      if (multiSelect) {
        setLocalSelected((prev) =>
          prev.filter((id) => id !== exerciseToDelete.id)
        );
      }

      setDeleteModalVisible(false);
      setExerciseToDelete(null);
    } catch (error: any) {
      console.error("Error deleting exercise:", error);
      setErrorMessage(error.message || "Failed to delete exercise.");
      setErrorModalVisible(true);
      setDeleteModalVisible(false);
    }
  };

  const isSelected = (exerciseId: string) => {
    return multiSelect
      ? localSelected.includes(exerciseId)
      : selectedExerciseIds.includes(exerciseId);
  };

  const renderExercise = ({ item }: { item: Exercise }) => {
    const selected = isSelected(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.exerciseItem,
          { backgroundColor: colors.bgSecondary },
          selected && { backgroundColor: colors.bgTertiary, borderColor: colors.accentPrimary + "40", borderWidth: 1 }
        ]}
        onPress={() => handleExercisePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.exerciseIcon, { backgroundColor: colors.bgTertiary }]}>
          <Dumbbell
            size={20}
            color={selected ? colors.accentPrimary : colors.textMuted}
          />
        </View>
        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseNameRow}>
            <Text
              style={[
                styles.exerciseName,
                { color: colors.textPrimary },
                selected && { color: colors.accentPrimary },
              ]}
            >
              {item.name}
            </Text>
            {item.isCustom && (
              <View style={[styles.customBadge, { backgroundColor: colors.accentPrimary }]}>
                <Text style={[styles.customBadgeText, { color: "#FFFFFF" }]}>Custom</Text>
              </View>
            )}
          </View>
          <Text style={styles.exerciseMeta}>
            {item.category} • {item.equipment}
          </Text>
        </View>
        <View style={styles.exerciseActions}>
          {item.isCustom && (
            <>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.bgTertiary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditExercise(item, e);
                }}
                activeOpacity={0.7}
              >
                <Edit2 size={18} color={colors.accentPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.bgTertiary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteExercise(item, e);
                }}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color={colors.accentDanger} />
              </TouchableOpacity>
            </>
          )}
          {selected && (
            <View style={styles.checkIcon}>
              <Check size={20} color={colors.accentPrimary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {multiSelect ? "Select Exercises" : "Add Exercise"}
          </Text>
          {multiSelect ? (
            <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>
                Done{" "}
                {localSelected.length > 0 ? `(${localSelected.length})` : ""}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.bgSecondary }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryPill,
                { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                selectedCategory === item.value && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
              ]}
              onPress={() => setSelectedCategory(item.value)}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: colors.textSecondary },
                  selectedCategory === item.value && { color: colors.bgPrimary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Create Custom Exercise Button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.bgTertiary, borderColor: colors.accentPrimary + "50" }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Plus size={20} color={colors.accentPrimary} />
          <Text style={[styles.createButtonText, { color: colors.accentPrimary }]}>Create Custom Exercise</Text>
        </TouchableOpacity>

        {/* Exercise List */}
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          renderItem={renderExercise}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.bgSecondary }]}>
              <Dumbbell size={48} color={colors.textMuted} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No exercises found</Text>
            </View>
          }
        />
      </View>

      {/* Create/Edit Custom Exercise Modal */}
      <BottomSheet
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewExerciseName("");
          setNewExerciseDescription("");
          setEditExerciseName("");
          setEditExerciseDescription("");
          setExerciseToEdit(null);
        }}
        title={
          exerciseToEdit ? "Edit Custom Exercise" : "Create Custom Exercise"
        }
      >
        <View style={styles.createModalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Exercise Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderColor: colors.border }]}
              value={exerciseToEdit ? editExerciseName : newExerciseName}
              onChangeText={
                exerciseToEdit ? setEditExerciseName : setNewExerciseName
              }
              placeholder="e.g., Custom Cable Fly"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category *</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.filter((c) => c.value !== "all").map((cat) => {
                const currentCategory = exerciseToEdit
                  ? editExerciseCategory
                  : newExerciseCategory;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: colors.bgTertiary, borderColor: colors.border },
                      currentCategory === cat.value && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
                    ]}
                    onPress={() => {
                      if (exerciseToEdit) {
                        setEditExerciseCategory(cat.value as ExerciseCategory);
                      } else {
                        setNewExerciseCategory(cat.value as ExerciseCategory);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        { color: colors.textSecondary },
                        currentCategory === cat.value && { color: colors.bgPrimary },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Equipment *</Text>
            <View style={styles.equipmentRow}>
              {[
                "dumbbell",
                "barbell",
                "cable",
                "machine",
                "bodyweight",
                "other",
              ].map((eq) => {
                const currentEquipment = exerciseToEdit
                  ? editExerciseEquipment
                  : newExerciseEquipment;
                return (
                  <TouchableOpacity
                    key={eq}
                    style={[
                      styles.equipmentButton,
                      { backgroundColor: colors.bgTertiary, borderColor: colors.border },
                      currentEquipment === eq && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
                    ]}
                    onPress={() => {
                      if (exerciseToEdit) {
                        setEditExerciseEquipment(eq as EquipmentType);
                      } else {
                        setNewExerciseEquipment(eq as EquipmentType);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.equipmentButtonText,
                        { color: colors.textSecondary },
                        currentEquipment === eq && { color: colors.bgPrimary },
                      ]}
                    >
                      {eq.charAt(0).toUpperCase() + eq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderColor: colors.border }]}
              value={
                exerciseToEdit
                  ? editExerciseDescription
                  : newExerciseDescription
              }
              onChangeText={
                exerciseToEdit
                  ? setEditExerciseDescription
                  : setNewExerciseDescription
              }
              placeholder="Describe the exercise..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.createModalButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}
              onPress={() => {
                setShowCreateModal(false);
                setNewExerciseName("");
                setNewExerciseDescription("");
                setEditExerciseName("");
                setEditExerciseDescription("");
                setExerciseToEdit(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Button
              title={exerciseToEdit ? "Update Exercise" : "Create Exercise"}
              onPress={
                exerciseToEdit ? handleUpdateExercise : handleCreateExercise
              }
              size="lg"
              fullWidth
              disabled={
                exerciseToEdit
                  ? !editExerciseName.trim()
                  : !newExerciseName.trim()
              }
            />
          </View>
        </View>
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        onClose={() => {
          console.log("[ExercisePicker] Delete modal closed");
          setDeleteModalVisible(false);
          setExerciseToDelete(null);
        }}
        onConfirm={async () => {
          console.log("[ExercisePicker] Delete confirmed");
          await confirmDeleteExercise();
        }}
        title="Delete Custom Exercise"
        message={`Are you sure you want to delete "${exerciseToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive={true}
      />

      {/* Error Modal */}
      <InfoModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        title="Error"
        message={errorMessage}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  createButtonContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: defaultColors.bgTertiary,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: defaultColors.accentPrimary + "50",
    borderStyle: "dashed",
  },
  createButtonText: {
    ...typography.body,
    color: defaultColors.accentPrimary,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  createModalContent: {
    paddingVertical: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    fontWeight: "600",
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    ...typography.body,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: defaultColors.textPrimary,
    borderWidth: 1,
    borderColor: defaultColors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: defaultColors.bgTertiary,
    borderWidth: 1,
    borderColor: defaultColors.border,
  },
  categoryButtonActive: {
    backgroundColor: defaultColors.accentPrimary,
    borderColor: defaultColors.accentPrimary,
  },
  categoryButtonText: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  equipmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  equipmentButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: defaultColors.bgTertiary,
    borderWidth: 1,
    borderColor: defaultColors.border,
  },
  equipmentButtonActive: {
    backgroundColor: defaultColors.accentPrimary,
    borderColor: defaultColors.accentPrimary,
  },
  equipmentButtonText: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    fontWeight: "500",
  },
  equipmentButtonTextActive: {
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  createModalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: defaultColors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: borderRadius.lg,
    minHeight: 48,
    borderWidth: 1,
    borderColor: defaultColors.border,
  },
  cancelButtonText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    fontWeight: "600",
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
    flex: 1,
  },
  customBadge: {
    backgroundColor: defaultColors.accentPrimary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  customBadgeText: {
    ...typography.caption,
    color: defaultColors.textPrimary,
    fontWeight: "600",
    fontSize: 10,
  },
  container: {
    flex: 1,
    backgroundColor: defaultColors.bgPrimary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  closeButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
  },
  doneButton: {
    padding: spacing.sm,
  },
  doneButtonText: {
    ...typography.body,
    color: defaultColors.accentPrimary,
    fontWeight: "600",
  },
  placeholder: {
    width: 60,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: defaultColors.bgSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: defaultColors.textPrimary,
    paddingVertical: spacing.md,
  },
  categoriesContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
  },
  categoriesList: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    maxHeight: 60,
    flexGrow: 0,
    flexShrink: 0,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xl,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryPillActive: {
    backgroundColor: defaultColors.accentPrimary,
  },
  categoryText: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
  },
  categoryTextActive: {
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 150,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  exerciseItemSelected: {
    borderWidth: 1,
    borderColor: defaultColors.accentPrimary,
    backgroundColor: `${defaultColors.accentPrimary}10`,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: defaultColors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.lg,
    maxWidth: "55%",
  },
  exerciseName: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "500",
  },
  exerciseNameSelected: {
    color: defaultColors.accentPrimary,
  },
  exerciseMeta: {
    ...typography.caption,
    color: defaultColors.textMuted,
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexShrink: 0,
    marginLeft: "auto",
  },
  editButton: {
    padding: spacing.md,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: borderRadius.md,
  },
  deleteButton: {
    padding: spacing.md,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: borderRadius.md,
  },
  checkIcon: {
    marginLeft: spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    ...typography.body,
    color: defaultColors.textMuted,
    marginTop: spacing.md,
  },
});
