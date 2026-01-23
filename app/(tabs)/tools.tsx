import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calculator,
  Weight,
  Ruler,
  TrendingUp,
  ChevronRight,
  Plus,
  Trash2,
  Scale,
} from "lucide-react-native";
import {
  colors as defaultColors,
  spacing,
  typography,
  borderRadius,
} from "../../src/constants/theme";
import { useColors } from "../../src/contexts/ThemeContext";
import { useSettingsStore } from "../../src/stores/settingsStore";
import { useMeasurementStore } from "../../src/stores/measurementStore";
import {
  BottomSheet,
  Button,
  Card,
  ScrollPicker,
} from "../../src/components/ui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Standard plate weights in lbs
const PLATE_WEIGHTS_LBS = [45, 35, 25, 10, 5, 2.5];
// Standard plate weights in kg
const PLATE_WEIGHTS_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
// Standard bar weights
const BAR_WEIGHT_LBS = 45;
const BAR_WEIGHT_KG = 20;

// 1RM Formulas
const calculate1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps <= 0 || weight <= 0) return 0;
  // Brzycki formula (most accurate for reps < 10)
  return Math.round(weight * (36 / (37 - reps)));
};

// Calculate plates needed for each side
const calculatePlates = (
  targetWeight: number,
  barWeight: number,
  plateWeights: number[]
): { plate: number; count: number }[] => {
  let remainingWeight = (targetWeight - barWeight) / 2; // Weight per side
  const plates: { plate: number; count: number }[] = [];

  if (remainingWeight <= 0) return plates;

  for (const plate of plateWeights) {
    const count = Math.floor(remainingWeight / plate);
    if (count > 0) {
      plates.push({ plate, count });
      remainingWeight -= plate * count;
    }
  }

  return plates;
};

// Tool Card Component
function ToolCard({
  icon: Icon,
  title,
  description,
  color,
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.toolCard, { backgroundColor: colors.bgSecondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.toolIconContainer, { backgroundColor: `${color}20` }]}
      >
        <Icon size={24} color={color} />
      </View>
      <View style={styles.toolContent}>
        <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.toolDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// 1RM Calculator Component
function OneRMCalculator({
  visible,
  onClose,
  unit,
}: {
  visible: boolean;
  onClose: () => void;
  unit: "lbs" | "kg";
}) {
  const colors = useColors();
  const [weight, setWeight] = useState(135);
  const [reps, setReps] = useState(5);

  const oneRM = useMemo(() => calculate1RM(weight, reps), [weight, reps]);

  // Percentage table
  const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="1RM Calculator">
      <View style={styles.calculatorContent}>
        <Text style={styles.calculatorSubtitle}>
          Enter your lift details to estimate your one-rep max
        </Text>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <ScrollPicker
              value={weight}
              onValueChange={setWeight}
              min={0}
              max={1000}
              step={5}
              label="Weight"
              unit={unit}
            />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputGroup}>
            <ScrollPicker
              value={reps}
              onValueChange={setReps}
              min={1}
              max={20}
              step={1}
              label="Reps"
            />
          </View>
        </View>

        <View style={[styles.resultCard, { backgroundColor: colors.bgTertiary }]}>
          <Text style={styles.resultLabel}>Estimated 1RM</Text>
          <Text style={styles.resultValue}>
            {oneRM} {unit}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Percentage Chart</Text>
        <View style={[styles.percentageTable, { backgroundColor: colors.bgSecondary }]}>
          {percentages.map((pct) => (
            <View key={pct} style={[styles.percentageRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.percentageLabel, { color: colors.textSecondary }]}>{pct}%</Text>
              <Text style={[styles.percentageValue, { color: colors.textPrimary }]}>
                {Math.round(oneRM * (pct / 100))} {unit}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

// Plate Calculator Component
function PlateCalculator({
  visible,
  onClose,
  unit,
}: {
  visible: boolean;
  onClose: () => void;
  unit: "lbs" | "kg";
}) {
  const colors = useColors();
  const barWeight = unit === "lbs" ? BAR_WEIGHT_LBS : BAR_WEIGHT_KG;
  const plateWeights = unit === "lbs" ? PLATE_WEIGHTS_LBS : PLATE_WEIGHTS_KG;
  const [targetWeight, setTargetWeight] = useState(unit === "lbs" ? 135 : 60);

  const plates = useMemo(
    () => calculatePlates(targetWeight, barWeight, plateWeights),
    [targetWeight, barWeight, plateWeights]
  );

  const actualWeight = useMemo(() => {
    const platesWeight = plates.reduce(
      (sum, p) => sum + p.plate * p.count * 2,
      0
    );
    return barWeight + platesWeight;
  }, [plates, barWeight]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Plate Calculator">
      <View style={styles.calculatorContent}>
        <Text style={styles.calculatorSubtitle}>
          Calculate plates needed per side of the bar
        </Text>

        <View style={styles.singleInputContainer}>
          <ScrollPicker
            value={targetWeight}
            onValueChange={setTargetWeight}
            min={barWeight}
            max={1000}
            step={5}
            label="Target Weight"
            unit={unit}
          />
        </View>

        <View style={styles.barInfo}>
          <Text style={[styles.barInfoText, { color: colors.textMuted }]}>
            Bar weight: {barWeight} {unit}
          </Text>
        </View>

        <View style={[styles.resultCard, { backgroundColor: colors.bgTertiary }]}>
          <Text style={styles.resultLabel}>Plates Per Side</Text>
          {plates.length > 0 ? (
            <View style={styles.platesList}>
              {plates.map((p, index) => (
                <View key={index} style={styles.plateItem}>
                  <View
                    style={[
                      styles.plateVisual,
                      {
                        height: 20 + p.plate * (unit === "lbs" ? 0.8 : 1.5),
                        backgroundColor:
                          p.plate >= (unit === "lbs" ? 45 : 20)
                            ? colors.accentPrimary
                            : p.plate >= (unit === "lbs" ? 25 : 10)
                            ? colors.accentSecondary
                            : colors.accentInfo,
                      },
                    ]}
                  />
                  <Text style={[styles.plateText, { color: colors.textPrimary }]}>
                    {p.count} × {p.plate} {unit}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noPlatesText, { color: colors.textSecondary }]}>Just the bar!</Text>
          )}
        </View>

        {actualWeight !== targetWeight && (
          <View style={[styles.warningCard, { backgroundColor: colors.accentWarning + "20" }]}>
            <Text style={[styles.warningText, { color: colors.accentWarning }]}>
              Closest achievable: {actualWeight} {unit}
            </Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

// Bodyweight Percentage Calculator
function BodyweightCalculator({
  visible,
  onClose,
  unit,
}: {
  visible: boolean;
  onClose: () => void;
  unit: "lbs" | "kg";
}) {
  const colors = useColors();
  const [bodyweight, setBodyweight] = useState(unit === "lbs" ? 180 : 82);
  const [liftWeight, setLiftWeight] = useState(unit === "lbs" ? 225 : 100);

  const percentage = useMemo(() => {
    if (bodyweight <= 0) return 0;
    return Math.round((liftWeight / bodyweight) * 100);
  }, [bodyweight, liftWeight]);

  const strengthLevels = [
    { name: "Beginner", bench: 0.5, squat: 0.75, deadlift: 1.0 },
    { name: "Novice", bench: 0.75, squat: 1.0, deadlift: 1.25 },
    { name: "Intermediate", bench: 1.0, squat: 1.5, deadlift: 1.75 },
    { name: "Advanced", bench: 1.5, squat: 2.0, deadlift: 2.5 },
    { name: "Elite", bench: 2.0, squat: 2.5, deadlift: 3.0 },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Relative Strength">
      <View style={styles.calculatorContent}>
        <Text style={styles.calculatorSubtitle}>
          Calculate your lift as a percentage of bodyweight
        </Text>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <ScrollPicker
              value={bodyweight}
              onValueChange={setBodyweight}
              min={50}
              max={500}
              step={1}
              label="Bodyweight"
              unit={unit}
            />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputGroup}>
            <ScrollPicker
              value={liftWeight}
              onValueChange={setLiftWeight}
              min={0}
              max={1000}
              step={5}
              label="Lift Weight"
              unit={unit}
            />
          </View>
        </View>

        <View style={[styles.resultCard, { backgroundColor: colors.bgTertiary }]}>
          <Text style={styles.resultLabel}>Relative Strength</Text>
          <Text style={styles.resultValue}>{percentage}% BW</Text>
          <Text style={styles.resultSubtext}>
            {(liftWeight / bodyweight).toFixed(2)}× bodyweight
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Strength Standards (× BW)</Text>
        <View style={[styles.standardsTable, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.standardsHeader, { backgroundColor: colors.bgTertiary }]}>
            <Text style={[styles.standardsCell, styles.standardsHeaderText, { color: colors.textSecondary }]}>
              Level
            </Text>
            <Text style={[styles.standardsCell, styles.standardsHeaderText, { color: colors.textSecondary }]}>
              Bench
            </Text>
            <Text style={[styles.standardsCell, styles.standardsHeaderText, { color: colors.textSecondary }]}>
              Squat
            </Text>
            <Text style={[styles.standardsCell, styles.standardsHeaderText, { color: colors.textSecondary }]}>
              Dead
            </Text>
          </View>
          {strengthLevels.map((level) => (
            <View key={level.name} style={[styles.standardsRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.standardsCell, styles.standardsName, { color: colors.textPrimary }]}>
                {level.name}
              </Text>
              <Text style={[styles.standardsCell, { color: colors.textPrimary }]}>{level.bench}×</Text>
              <Text style={[styles.standardsCell, { color: colors.textPrimary }]}>{level.squat}×</Text>
              <Text style={[styles.standardsCell, { color: colors.textPrimary }]}>{level.deadlift}×</Text>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

// Body Measurements Tracker
function MeasurementsTracker({
  visible,
  onClose,
  unit,
}: {
  visible: boolean;
  onClose: () => void;
  unit: "lbs" | "kg";
}) {
  const colors = useColors();
  const { measurements, addMeasurement, deleteMeasurement } =
    useMeasurementStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<"lbs" | "kg">(unit);
  const [newMeasurement, setNewMeasurement] = useState({
    weight: "",
    chest: "",
    waist: "",
    hips: "",
    leftArm: "",
    rightArm: "",
    leftThigh: "",
    rightThigh: "",
    notes: "",
  });

  const latestMeasurements = useMemo(() => {
    return [...measurements]
      .sort(
        (a, b) =>
          new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
      )
      .slice(0, 10);
  }, [measurements]);

  const handleSave = () => {
    // Always save weight as lbs in the database
    let weightInLbs = newMeasurement.weight ? parseFloat(newMeasurement.weight) : null;
    if (weightInLbs && selectedUnit === "kg") {
      // Convert kg to lbs: 1 kg = 2.20462 lbs
      weightInLbs = weightInLbs * 2.20462;
    }

    addMeasurement({
      userId: null,
      weight: weightInLbs,
      chest: newMeasurement.chest ? parseFloat(newMeasurement.chest) : null,
      waist: newMeasurement.waist ? parseFloat(newMeasurement.waist) : null,
      hips: newMeasurement.hips ? parseFloat(newMeasurement.hips) : null,
      leftArm: newMeasurement.leftArm
        ? parseFloat(newMeasurement.leftArm)
        : null,
      rightArm: newMeasurement.rightArm
        ? parseFloat(newMeasurement.rightArm)
        : null,
      leftThigh: newMeasurement.leftThigh
        ? parseFloat(newMeasurement.leftThigh)
        : null,
      rightThigh: newMeasurement.rightThigh
        ? parseFloat(newMeasurement.rightThigh)
        : null,
      notes: newMeasurement.notes || null,
      measuredAt: new Date(),
    });
    setNewMeasurement({
      weight: "",
      chest: "",
      waist: "",
      hips: "",
      leftArm: "",
      rightArm: "",
      leftThigh: "",
      rightThigh: "",
      notes: "",
    });
    setShowAddForm(false);
  };

  // For display: convert lbs to selected unit
  const convertWeight = (weightInLbs: number | null) => {
    if (!weightInLbs) return null;
    if (selectedUnit === "kg") {
      // Convert lbs to kg: 1 lb = 0.453592 kg
      return (weightInLbs * 0.453592).toFixed(1);
    }
    return weightInLbs.toFixed(1);
  };

  const measurementUnit = selectedUnit === "lbs" ? "in" : "cm";

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Body Measurements">
      <View style={styles.calculatorContent}>
        {/* Unit Toggle */}
        <View style={[styles.unitToggleContainer, { backgroundColor: colors.bgSecondary }]}>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              selectedUnit === "lbs" && { backgroundColor: colors.accentPrimary },
            ]}
            onPress={() => setSelectedUnit("lbs")}
          >
            <Text
              style={[
                styles.unitToggleText,
                { color: colors.textSecondary },
                selectedUnit === "lbs" && { color: colors.textPrimary },
              ]}
            >
              lbs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              selectedUnit === "kg" && { backgroundColor: colors.accentPrimary },
            ]}
            onPress={() => setSelectedUnit("kg")}
          >
            <Text
              style={[
                styles.unitToggleText,
                { color: colors.textSecondary },
                selectedUnit === "kg" && { color: colors.textPrimary },
              ]}
            >
              kg
            </Text>
          </TouchableOpacity>
        </View>

        {!showAddForm ? (
          <>
            <TouchableOpacity
              style={[styles.addMeasurementButton, { backgroundColor: colors.accentPrimary }]}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.7}
            >
              <Plus size={20} color={colors.textPrimary} />
              <Text style={[styles.addMeasurementText, { color: colors.textPrimary }]}>Add New Measurement</Text>
            </TouchableOpacity>

            {latestMeasurements.length > 0 ? (
              <View style={styles.measurementsList}>
                {latestMeasurements.map((m) => (
                  <View key={m.id} style={[styles.measurementItem, { backgroundColor: colors.bgSecondary }]}>
                    <View style={styles.measurementHeader}>
                      <Text style={[styles.measurementDate, { color: colors.textPrimary }]}>
                        {new Date(m.measuredAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                      <TouchableOpacity
                        onPress={() => deleteMeasurement(m.id)}
                        style={styles.deleteButton}
                      >
                        <Trash2 size={16} color={colors.accentDanger} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.measurementGrid}>
                      {m.weight && (
                        <View style={styles.measurementValue}>
                          <Text style={[styles.measurementLabel, { color: colors.textMuted }]}>Weight</Text>
                          <Text style={[styles.measurementNumber, { color: colors.textPrimary }]}>
                            {convertWeight(m.weight)} {selectedUnit}
                          </Text>
                        </View>
                      )}
                      {m.chest && (
                        <View style={styles.measurementValue}>
                          <Text style={[styles.measurementLabel, { color: colors.textMuted }]}>Chest</Text>
                          <Text style={[styles.measurementNumber, { color: colors.textPrimary }]}>
                            {m.chest} {measurementUnit}
                          </Text>
                        </View>
                      )}
                      {m.waist && (
                        <View style={styles.measurementValue}>
                          <Text style={[styles.measurementLabel, { color: colors.textMuted }]}>Waist</Text>
                          <Text style={[styles.measurementNumber, { color: colors.textPrimary }]}>
                            {m.waist} {measurementUnit}
                          </Text>
                        </View>
                      )}
                      {m.hips && (
                        <View style={styles.measurementValue}>
                          <Text style={[styles.measurementLabel, { color: colors.textMuted }]}>Hips</Text>
                          <Text style={[styles.measurementNumber, { color: colors.textPrimary }]}>
                            {m.hips} {measurementUnit}
                          </Text>
                        </View>
                      )}
                      {(m.leftArm || m.rightArm) && (
                        <View style={styles.measurementValue}>
                          <Text style={[styles.measurementLabel, { color: colors.textMuted }]}>Arms</Text>
                          <Text style={[styles.measurementNumber, { color: colors.textPrimary }]}>
                            {m.leftArm || "-"}/{m.rightArm || "-"}{" "}
                            {measurementUnit}
                          </Text>
                        </View>
                      )}
                      {(m.leftThigh || m.rightThigh) && (
                        <View style={styles.measurementValue}>
                          <Text style={[styles.measurementLabel, { color: colors.textMuted }]}>Thighs</Text>
                          <Text style={[styles.measurementNumber, { color: colors.textPrimary }]}>
                            {m.leftThigh || "-"}/{m.rightThigh || "-"}{" "}
                            {measurementUnit}
                          </Text>
                        </View>
                      )}
                    </View>
                    {m.notes && (
                      <Text style={[styles.measurementNotes, { color: colors.textSecondary }]}>{m.notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Scale size={48} color={colors.textMuted} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No measurements yet</Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textMuted }]}>
                  Track your body measurements over time
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.addForm}>
            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Body Weight</Text>
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
                placeholder={`Weight (${selectedUnit})`}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newMeasurement.weight}
                onChangeText={(text) =>
                  setNewMeasurement((prev) => ({ ...prev, weight: text }))
                }
              />
            </View>

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>
              Body Measurements ({measurementUnit})
            </Text>
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.formInputHalf, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
                placeholder="Chest"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newMeasurement.chest}
                onChangeText={(text) =>
                  setNewMeasurement((prev) => ({ ...prev, chest: text }))
                }
              />
              <TextInput
                style={[styles.formInput, styles.formInputHalf, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
                placeholder="Waist"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newMeasurement.waist}
                onChangeText={(text) =>
                  setNewMeasurement((prev) => ({ ...prev, waist: text }))
                }
              />
            </View>
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.formInputHalf, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
                placeholder="Hips"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newMeasurement.hips}
                onChangeText={(text) =>
                  setNewMeasurement((prev) => ({ ...prev, hips: text }))
                }
              />
            </View>

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>
              Arms ({measurementUnit})
            </Text>
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.formInputHalf, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
                placeholder="Left Arm"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newMeasurement.leftArm}
                onChangeText={(text) =>
                  setNewMeasurement((prev) => ({ ...prev, leftArm: text }))
                }
              />
              <TextInput
                style={[styles.formInput, styles.formInputHalf, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
                placeholder="Right Arm"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newMeasurement.rightArm}
                onChangeText={(text) =>
                  setNewMeasurement((prev) => ({ ...prev, rightArm: text }))
                }
              />
            </View>

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>
              Thighs ({measurementUnit})
            </Text>
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.formInputHalf, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
                placeholder="Left Thigh"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newMeasurement.leftThigh}
                onChangeText={(text) =>
                  setNewMeasurement((prev) => ({ ...prev, leftThigh: text }))
                }
              />
              <TextInput
                style={[styles.formInput, styles.formInputHalf, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
                placeholder="Right Thigh"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newMeasurement.rightThigh}
                onChangeText={(text) =>
                  setNewMeasurement((prev) => ({ ...prev, rightThigh: text }))
                }
              />
            </View>

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline, { backgroundColor: colors.bgSecondary, color: colors.textPrimary }]}
              placeholder="Add notes (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={newMeasurement.notes}
              onChangeText={(text) =>
                setNewMeasurement((prev) => ({ ...prev, notes: text }))
              }
            />

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.bgTertiary }]}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.saveButtonContainer}>
                <Button title="Save" onPress={handleSave} size="lg" fullWidth />
              </View>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const themeColors = useColors(); // Dynamic theme colors
  const preferredUnit = useSettingsStore((state) => state.preferredUnit);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showOneRM, setShowOneRM] = useState(false);
  const [showBodyweight, setShowBodyweight] = useState(false);

  const tools = [
    {
      icon: Ruler,
      title: "Body Measurements",
      description: "Track your body measurements over time",
      color: defaultColors.prGold,
      onPress: () => setShowMeasurements(true),
    },
    {
      icon: Calculator,
      title: "1RM Calculator",
      description: "Estimate your one-rep max from any weight and rep count",
      color: defaultColors.accentPrimary,
      onPress: () => setShowOneRM(true),
    },
    {
      icon: TrendingUp,
      title: "Relative Strength",
      description: "Calculate lifts as a percentage of your bodyweight",
      color: defaultColors.accentInfo,
      onPress: () => setShowBodyweight(true),
    },
  ];

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: themeColors.bgPrimary }]} showsVerticalScrollIndicator={false}>

        <View style={styles.toolsGrid}>
          {tools.map((tool, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 100).springify()}
            >
              <ToolCard {...tool} />
            </Animated.View>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <MeasurementsTracker
        visible={showMeasurements}
        onClose={() => setShowMeasurements(false)}
        unit={preferredUnit}
      />
      <OneRMCalculator
        visible={showOneRM}
        onClose={() => setShowOneRM(false)}
        unit={preferredUnit}
      />
      <BodyweightCalculator
        visible={showBodyweight}
        onClose={() => setShowBodyweight(false)}
        unit={preferredUnit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultColors.bgPrimary,
    paddingHorizontal: spacing.lg,
  },
  header: {
    ...typography.heading1,
    color: defaultColors.textPrimary,
    marginTop: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: defaultColors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  toolsGrid: {
    gap: spacing.md,
  },
  toolCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  toolContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  toolTitle: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  toolDescription: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  bottomPadding: {
    height: 100,
  },
  calculatorContent: {
    paddingVertical: spacing.md,
  },
  unitToggleContainer: {
    flexDirection: "row",
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
    alignSelf: "center",
  },
  unitToggleButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    minWidth: 60,
    alignItems: "center",
  },
  unitToggleButtonActive: {
    backgroundColor: defaultColors.accentPrimary,
  },
  unitToggleText: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    fontWeight: "600",
  },
  unitToggleTextActive: {
    color: defaultColors.textPrimary,
  },
  calculatorSubtitle: {
    ...typography.body,
    color: defaultColors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  inputGroup: {
    flex: 1,
    alignItems: "center",
  },
  inputDivider: {
    width: 1,
    height: "100%",
    backgroundColor: defaultColors.border,
    marginHorizontal: spacing.md,
  },
  singleInputContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  resultCard: {
    backgroundColor: defaultColors.bgTertiary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  resultLabel: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultValue: {
    ...typography.heading1,
    color: defaultColors.accentPrimary,
    marginTop: spacing.xs,
  },
  resultSubtext: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  percentageTable: {
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  percentageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  percentageLabel: {
    ...typography.body,
    color: defaultColors.textSecondary,
  },
  percentageValue: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  barInfo: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  barInfoText: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
  },
  platesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  plateItem: {
    alignItems: "center",
  },
  plateVisual: {
    width: 40,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  plateText: {
    ...typography.caption,
    color: defaultColors.textPrimary,
  },
  noPlatesText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    marginTop: spacing.md,
  },
  warningCard: {
    backgroundColor: defaultColors.accentWarning + "20",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  warningText: {
    ...typography.bodySmall,
    color: defaultColors.accentWarning,
  },
  standardsTable: {
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  standardsHeader: {
    flexDirection: "row",
    backgroundColor: defaultColors.bgTertiary,
    paddingVertical: spacing.sm,
  },
  standardsHeaderText: {
    fontWeight: "600",
    color: defaultColors.textSecondary,
  },
  standardsRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  standardsCell: {
    flex: 1,
    textAlign: "center",
    ...typography.bodySmall,
    color: defaultColors.textPrimary,
  },
  standardsName: {
    fontWeight: "600",
  },
  addMeasurementButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: defaultColors.accentPrimary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  addMeasurementText: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  measurementsList: {
    gap: spacing.md,
  },
  measurementItem: {
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  measurementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  measurementDate: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  deleteButton: {
    padding: spacing.xs,
  },
  measurementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  measurementValue: {
    minWidth: "30%",
  },
  measurementLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
  },
  measurementNumber: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "500",
  },
  measurementNotes: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    fontWeight: "600",
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    marginTop: spacing.xs,
  },
  addForm: {
    gap: spacing.sm,
  },
  formSectionTitle: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  formInput: {
    flex: 1,
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: defaultColors.textPrimary,
    ...typography.body,
  },
  formInputHalf: {
    flex: 1,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  formButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    fontWeight: "600",
  },
  saveButtonContainer: {
    flex: 1,
  },
});
