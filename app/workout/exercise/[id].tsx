import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Check,
  Trophy,
  Play,
  Pause,
  Trash2,
  Edit2,
  Dumbbell,
  History,
  BarChart3,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { useWorkoutStore } from "../../../src/stores/workoutStore";
import { useProgressStore } from "../../../src/stores/progressStore";
import { useSettingsStore } from "../../../src/stores/settingsStore";
import {
  Button,
  Card,
  ScrollPicker,
  TimeScrollPicker,
  BottomSheet,
} from "../../../src/components/ui";
import {
  colors as defaultColors,
  spacing,
  typography,
  borderRadius,
} from "../../../src/constants/theme";
import { useColors } from "../../../src/contexts/ThemeContext";
import {
  getLastWorkoutForTemplate,
  getRecentExerciseHistory,
  getExerciseAnalytics,
} from "../../../src/services/database";
import { WeightProgressionChart } from "../../../src/components/exercise";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TIMER_SIZE = 180;
const TIMER_STROKE_WIDTH = 12;

type TabType = "log" | "history" | "stats";

// Animated Circle for rest timer
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ExerciseScreen() {
  const { id: exerciseId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const logSet = useWorkoutStore((state) => state.logSet);
  const updateSet = useWorkoutStore((state) => state.updateSet);
  const deleteSet = useWorkoutStore((state) => state.deleteSet);
  const completeExercise = useWorkoutStore((state) => state.completeExercise);
  const getPRForExercise = useProgressStore((state) => state.getPRForExercise);
  const preferredUnit = useSettingsStore((state) => state.preferredUnit);
  const defaultRestTime = useSettingsStore((state) => state.defaultRestTime);

  const [activeTab, setActiveTab] = useState<TabType>("log");
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(defaultRestTime);
  const [restTimeSet, setRestTimeSet] = useState(defaultRestTime);
  const [prefillSets, setPrefillSets] = useState<
    { weight: number; reps: number }[]
  >([]);
  const [editSetVisible, setEditSetVisible] = useState(false);
  const [editingSet, setEditingSet] = useState<{
    id: string;
    weight: number;
    reps: number;
  } | null>(null);
  const [editWeight, setEditWeight] = useState(0);
  const [editReps, setEditReps] = useState(0);
  const [recentHistory, setRecentHistory] = useState<
    { weight: number; reps: number; date: Date }[]
  >([]);
  const [analytics, setAnalytics] = useState<{
    totalWorkouts: number;
    averageWeight: number;
    maxWeight: number;
    averageReps: number;
    totalVolume: number;
    weightProgression: Array<{
      date: Date;
      weight: number;
      reps: number;
      volume: number;
    }>;
  }>({
    totalWorkouts: 0,
    averageWeight: 0,
    maxWeight: 0,
    averageReps: 0,
    totalVolume: 0,
    weightProgression: [],
  });

  // Timer animation
  const timerProgress = useRef(new Animated.Value(1)).current;

  const exerciseLog = activeWorkout?.session.exerciseLogs.find(
    (log) => log.exerciseId === exerciseId
  );
  const pr = exerciseId ? getPRForExercise(exerciseId) : undefined;

  // Calculate Estimated 1RM using Epley formula: weight × (1 + reps/30)
  const estimated1RM = useMemo(() => {
    if (!pr || pr.weight === 0) return null;
    // Use the PR weight and reps for the most accurate estimate
    const oneRM = pr.weight * (1 + pr.reps / 30);
    return Math.round(oneRM);
  }, [pr]);

  // Calculate 1RM from recent history if no PR
  const estimated1RMFromHistory = useMemo(() => {
    if (recentHistory.length === 0) return null;
    // Find the set with the highest estimated 1RM
    let maxEstimate = 0;
    recentHistory.forEach((entry) => {
      const estimate = entry.weight * (1 + entry.reps / 30);
      if (estimate > maxEstimate) maxEstimate = estimate;
    });
    return Math.round(maxEstimate);
  }, [recentHistory]);

  // Load prefill data and recent history
  useEffect(() => {
    const loadPrefill = async () => {
      if (exerciseId && exerciseLog) {
        // Load analytics for this exercise (works across all templates)
        const exerciseAnalytics = await getExerciseAnalytics(exerciseId);

        setAnalytics(exerciseAnalytics);

        // Load recent history for this exercise
        const history = await getRecentExerciseHistory(exerciseId, 10);
        setRecentHistory(history);

        // Load prefill from last workout of current template
        let foundPrefill = false;
        if (activeWorkout?.template.id) {
          const lastSession = await getLastWorkoutForTemplate(
            activeWorkout.template.id
          );
          if (lastSession) {
            const lastLog = lastSession.exerciseLogs.find(
              (l) => l.exerciseId === exerciseId
            );
            if (lastLog && lastLog.sets.length > 0) {
              setPrefillSets(
                lastLog.sets.map((s) => ({ weight: s.weight, reps: s.reps }))
              );
              // Pre-fill with first set values
              setWeight(lastLog.sets[0].weight);
              setReps(lastLog.sets[0].reps);
              foundPrefill = true;
            }
          }
        }

        // Fallback to cross-template history if no template-specific data
        if (!foundPrefill && history.length > 0) {
          const lastHistory = history[0]; // Most recent from any workout
          setPrefillSets([
            { weight: lastHistory.weight, reps: lastHistory.reps },
          ]);
          setWeight(lastHistory.weight);
          setReps(lastHistory.reps);
        }
      }
    };
    loadPrefill();
  }, [activeWorkout?.template.id, exerciseId, exerciseLog]);

  // Pre-fill for next set based on current set number
  useEffect(() => {
    const currentSetIndex = exerciseLog?.sets.length ?? 0;

    // If we have prefill data for this set number, use it
    if (prefillSets.length > currentSetIndex) {
      setWeight(prefillSets[currentSetIndex].weight);
      setReps(prefillSets[currentSetIndex].reps);
    } else if (exerciseLog && exerciseLog.sets.length > 0) {
      // Otherwise use the last logged set values
      const lastSet = exerciseLog.sets[exerciseLog.sets.length - 1];
      setWeight(lastSet.weight);
      setReps(lastSet.reps);
    } else if (prefillSets.length > 0) {
      // Fall back to first prefill set
      setWeight(prefillSets[0].weight);
      setReps(prefillSets[0].reps);
    } else {
      // No data - reset to 0
      setWeight(0);
      setReps(0);
    }
  }, [exerciseLog?.sets.length, prefillSets]);

  // Rest timer with animation
  useEffect(() => {
    if (!restTimerActive) return;

    // Animate the circular progress
    timerProgress.setValue(restTimeRemaining / restTimeSet);

    const interval = setInterval(() => {
      setRestTimeRemaining((prev) => {
        if (prev <= 1) {
          setRestTimerActive(false);
          timerProgress.setValue(1);
          // TODO: Play sound/vibrate
          return restTimeSet;
        }
        const newValue = prev - 1;
        timerProgress.setValue(newValue / restTimeSet);
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimerActive, restTimeSet]);

  const handleLogSet = () => {
    if (!exerciseLog || weight <= 0 || reps <= 0) return;

    logSet(exerciseLog.id, weight, reps);

    // Add to recent history if not already present (avoid duplicates)
    const newEntry = { weight, reps, date: new Date() };
    setRecentHistory((prev) => {
      // Check if this exact weight/reps combo already exists
      const exists = prev.some(
        (item) => item.weight === weight && item.reps === reps
      );
      if (exists) return prev;

      // Add to beginning and keep only last 10
      return [newEntry, ...prev].slice(0, 10);
    });
  };

  const handleStartRest = () => {
    setRestTimeSet(restTimeRemaining);
    timerProgress.setValue(1);
    setRestTimerActive(true);
  };

  const handleStopRest = () => {
    setRestTimerActive(false);
    timerProgress.setValue(1);
    setRestTimeRemaining(restTimeSet);
  };

  const handleDone = () => {
    if (exerciseId) {
      completeExercise(exerciseId);
    }
    router.back();
  };

  const handleEditSet = (set: { id: string; weight: number; reps: number }) => {
    setEditingSet(set);
    setEditWeight(set.weight);
    setEditReps(set.reps);
    setEditSetVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editingSet || !exerciseLog || editWeight <= 0 || editReps <= 0) return;

    updateSet(exerciseLog.id, editingSet.id, editWeight, editReps);
    setEditSetVisible(false);
    setEditingSet(null);
  };

  const handleCancelEdit = () => {
    setEditSetVisible(false);
    setEditingSet(null);
  };

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!exerciseLog) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Exercise not found</Text>
      </View>
    );
  }

  const currentSetNumber = exerciseLog.sets.length + 1;
  const circumference = (TIMER_SIZE - TIMER_STROKE_WIDTH) * Math.PI;

  const renderTabContent = () => {
    switch (activeTab) {
      case "log":
        return (
          <>
            {/* Current Set Input - Large & Prominent */}
            <Card style={styles.inputCard}>
              <View style={styles.setHeader}>
                <Text style={[styles.setLabel, { color: colors.accentPrimary }]}>Set {currentSetNumber}</Text>
                {exerciseLog.sets.length > 0 && (
                  <Text style={[styles.completedSets, { color: colors.textSecondary, backgroundColor: colors.bgTertiary }]}>
                    {exerciseLog.sets.length} completed
                  </Text>
                )}
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <ScrollPicker
                    value={weight}
                    onValueChange={setWeight}
                    min={0}
                    max={500}
                    step={5}
                    label={`Weight (${preferredUnit.toUpperCase()})`}
                    unit={preferredUnit}
                  />
                </View>
                <View style={styles.inputDivider} />
                <View style={styles.inputGroup}>
                  <ScrollPicker
                    value={reps}
                    onValueChange={setReps}
                    min={1}
                    max={50}
                    step={1}
                    label="Reps"
                  />
                </View>
                <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />
              </View>

              <Button
                title="Log Set"
                onPress={handleLogSet}
                size="lg"
                fullWidth
                disabled={weight <= 0 || reps <= 0}
                style={styles.logButton}
              />
            </Card>

            {/* Previous Sets */}
            {exerciseLog.sets.length > 0 && (
              <View style={styles.previousSets}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Logged Sets</Text>
                {exerciseLog.sets.map((set, index) => (
                  <View key={set.id} style={[styles.setRow, { backgroundColor: colors.bgSecondary }]}>
                    <View style={[styles.setNumberBadge, { backgroundColor: colors.accentPrimary + "30" }]}>
                      <Text style={[styles.setNumberText, { color: colors.accentPrimary }]}>{index + 1}</Text>
                    </View>
                    <View style={styles.setInfo}>
                      <Text style={[styles.setValue, { color: colors.textPrimary }]}>
                        {set.weight} {preferredUnit}
                      </Text>
                      <Text style={[styles.setReps, { color: colors.textSecondary }]}>× {set.reps} reps</Text>
                    </View>
                    <View style={styles.setActions}>
                      <TouchableOpacity
                        onPress={() => handleEditSet(set)}
                        style={[styles.actionButton, { backgroundColor: colors.bgTertiary }]}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteSet(exerciseLog.id, set.id)}
                        style={[styles.actionButton, { backgroundColor: colors.bgTertiary }]}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={18} color={colors.accentDanger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Visual Rest Timer */}
            <Card style={styles.restCard}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rest Timer</Text>

              {restTimerActive ? (
                <View style={styles.activeTimerWrapper}>
                  <View style={styles.circularTimerContainer}>
                    <Svg
                      width={TIMER_SIZE}
                      height={TIMER_SIZE}
                      style={styles.circularSvg}
                    >
                      {/* Background circle */}
                      <Circle
                        cx={TIMER_SIZE / 2}
                        cy={TIMER_SIZE / 2}
                        r={(TIMER_SIZE - TIMER_STROKE_WIDTH) / 2}
                        stroke={colors.bgTertiary}
                        strokeWidth={TIMER_STROKE_WIDTH}
                        fill="transparent"
                      />
                      {/* Progress circle */}
                      <AnimatedCircle
                        cx={TIMER_SIZE / 2}
                        cy={TIMER_SIZE / 2}
                        r={(TIMER_SIZE - TIMER_STROKE_WIDTH) / 2}
                        stroke={colors.accentPrimary}
                        strokeWidth={TIMER_STROKE_WIDTH}
                        fill="transparent"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={timerProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [circumference, 0],
                        })}
                        transform={`rotate(-90 ${TIMER_SIZE / 2} ${
                          TIMER_SIZE / 2
                        })`}
                      />
                    </Svg>
                    <View style={styles.timerTextContainer}>
                      <Text style={[styles.timerText, { color: colors.accentPrimary }]}>
                        {formatRestTime(restTimeRemaining)}
                      </Text>
                      <Text style={[styles.timerSubtext, { color: colors.textSecondary }]}>remaining</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.stopButton, { backgroundColor: colors.accentWarning + "30" }]}
                    onPress={handleStopRest}
                    activeOpacity={0.7}
                  >
                    <Pause size={22} color={colors.textPrimary} />
                    <Text style={[styles.stopButtonText, { color: colors.textPrimary }]}>Stop</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.timerSetup}>
                  <TimeScrollPicker
                    value={restTimeRemaining}
                    onValueChange={setRestTimeRemaining}
                    minMinutes={0}
                    maxMinutes={5}
                  />
                  <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: colors.accentPrimary }]}
                    onPress={handleStartRest}
                    activeOpacity={0.7}
                  >
                    <Play size={22} color="#FFFFFF" />
                    <Text style={[styles.startButtonText, { color: "#FFFFFF" }]}>Start Rest</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>

            {/* PR Badge */}
            {pr && (
              <Card style={[styles.prCard, { backgroundColor: colors.prGold + "10", borderColor: colors.prGold + "30" }]}>
                <View style={styles.prContent}>
                  <Trophy size={28} color={colors.prGold} />
                  <View style={styles.prInfo}>
                    <Text style={[styles.prLabel, { color: colors.prGold }]}>Personal Record</Text>
                    <Text style={[styles.prValue, { color: colors.textPrimary }]}>
                      {pr.weight} {preferredUnit} × {pr.reps}
                    </Text>
                  </View>
                  <Text style={[styles.prDate, { color: colors.textSecondary }]}>
                    {new Date(pr.achievedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </Card>
            )}
          </>
        );

      case "history":
        return (
          <>
            {/* Last Workout Reference */}
            {prefillSets.length > 0 && (
              <Card style={styles.historyCard}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Last Workout</Text>
                <View style={styles.lastWorkoutSets}>
                  {prefillSets.map((set, index) => (
                    <View key={index} style={styles.historySetRow}>
                      <View style={[styles.historySetBadge, { backgroundColor: colors.bgTertiary }]}>
                        <Text style={[styles.historySetNumber, { color: colors.textSecondary }]}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.historySetText, { color: colors.textPrimary }]}>
                        {set.weight} {preferredUnit} × {set.reps} reps
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Recent History */}
            <Card style={styles.historyCard}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Performance</Text>
              {recentHistory.length > 0 ? (
                <View style={styles.historyList}>
                  {recentHistory.map((entry, index) => (
                    <View key={index} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.historyItemLeft}>
                        <Text style={[styles.historyWeight, { color: colors.textPrimary }]}>
                          {entry.weight} {preferredUnit}
                        </Text>
                        <Text style={[styles.historyReps, { color: colors.textSecondary }]}>× {entry.reps}</Text>
                      </View>
                      <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No history yet. Complete sets to see your progress.
                </Text>
              )}
            </Card>
          </>
        );

      case "stats":
        return (
          <Card style={styles.statsCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Exercise Analytics</Text>

            {analytics.totalWorkouts > 0 ? (
              <>
                {/* Estimated 1RM Card */}
                {(estimated1RM || estimated1RMFromHistory) && (
                  <View style={[styles.estimated1RMCard, { backgroundColor: colors.accentPrimary + "15", borderColor: colors.accentPrimary + "30" }]}>
                    <View style={styles.oneRMBadge}>
                      <Trophy size={16} color={colors.prGold} />
                    </View>
                    <View style={styles.estimated1RMContent}>
                      <Text style={[styles.estimated1RMLabel, { color: colors.accentPrimary }]}>Estimated 1RM</Text>
                      <Text style={[styles.estimated1RMValue, { color: colors.textPrimary }]}>
                        {estimated1RM || estimated1RMFromHistory}{" "}
                        {preferredUnit}
                      </Text>
                      <Text style={[styles.estimated1RMSubtext, { color: colors.textSecondary }]}>
                        Based on{" "}
                        {pr ? `PR: ${pr.weight}×${pr.reps}` : "recent lifts"}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={[styles.statItem, { backgroundColor: colors.bgTertiary }]}>
                    <Text style={[styles.statValue, { color: colors.accentPrimary }]}>
                      {analytics.totalWorkouts}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: colors.bgTertiary }]}>
                    <Text style={[styles.statValue, { color: colors.accentPrimary }]}>
                      {analytics.averageWeight.toFixed(0)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg {preferredUnit}</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: colors.bgTertiary }]}>
                    <Text style={[styles.statValue, { color: colors.accentPrimary }]}>{analytics.maxWeight}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Max {preferredUnit}</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: colors.bgTertiary }]}>
                    <Text style={[styles.statValue, { color: colors.accentPrimary }]}>
                      {analytics.averageReps.toFixed(0)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Reps</Text>
                  </View>
                </View>

                {/* Weight Progression Chart */}
                {analytics.weightProgression.length > 0 && (
                  <View style={styles.chartSection}>
                    <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Weight Progression</Text>
                    <View style={[styles.chartContainer, { backgroundColor: colors.bgSecondary }]}>
                      <WeightProgressionChart
                        data={analytics.weightProgression}
                        unit={preferredUnit}
                      />
                    </View>

                    {/* Last entry summary */}
                    {analytics.weightProgression.length > 0 && (
                      <View style={[styles.lastEntryCard, { backgroundColor: colors.bgTertiary }]}>
                        <Text style={[styles.lastEntryLabel, { color: colors.textMuted }]}>
                          Previous Session
                        </Text>
                        <View style={styles.lastEntryData}>
                          <Text style={[styles.lastEntryWeight, { color: colors.textPrimary }]}>
                            {
                              analytics.weightProgression[
                                analytics.weightProgression.length - 1
                              ].weight
                            }{" "}
                            {preferredUnit}
                          </Text>
                          <Text style={[styles.lastEntryReps, { color: colors.textSecondary }]}>
                            ×{" "}
                            {
                              analytics.weightProgression[
                                analytics.weightProgression.length - 1
                              ].reps
                            }{" "}
                            reps
                          </Text>
                        </View>
                        <Text style={[styles.lastEntryVolume, { color: colors.textMuted }]}>
                          {analytics.weightProgression[
                            analytics.weightProgression.length - 1
                          ].volume.toFixed(0)}{" "}
                          {preferredUnit} total volume
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No workout history yet. Complete workouts to see your progress
                here.
              </Text>
            )}
          </Card>
        );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: exerciseLog.exerciseName,
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* Tab Navigation */}
        <View style={[styles.tabBar, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "log" && styles.tabActive]}
            onPress={() => setActiveTab("log")}
            activeOpacity={0.7}
          >
            <Dumbbell
              size={20}
              color={
                activeTab === "log" ? colors.accentPrimary : colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "log" && styles.tabTextActive,
              ]}
            >
              Log
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "history" && styles.tabActive]}
            onPress={() => setActiveTab("history")}
            activeOpacity={0.7}
          >
            <History
              size={20}
              color={
                activeTab === "history"
                  ? colors.accentPrimary
                  : colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.tabTextActive,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "stats" && styles.tabActive]}
            onPress={() => setActiveTab("stats")}
            activeOpacity={0.7}
          >
            <BarChart3
              size={20}
              color={
                activeTab === "stats" ? colors.accentPrimary : colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "stats" && styles.tabTextActive,
              ]}
            >
              Stats
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderTabContent()}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Edit Set Modal */}
        <BottomSheet
          visible={editSetVisible}
          onClose={handleCancelEdit}
          title="Edit Set"
        >
          <View style={styles.editSetContent}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <ScrollPicker
                  value={editWeight}
                  onValueChange={setEditWeight}
                  min={0}
                  max={500}
                  step={5}
                  label={`Weight (${preferredUnit.toUpperCase()})`}
                  unit={preferredUnit}
                />
              </View>
              <View style={styles.inputDivider} />
              <View style={styles.inputGroup}>
                <ScrollPicker
                  value={editReps}
                  onValueChange={setEditReps}
                  min={1}
                  max={50}
                  step={1}
                  label="Reps"
                />
              </View>
            </View>

            <View style={styles.editSetButtons}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelEditButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title="Save"
                onPress={handleSaveEdit}
                size="lg"
                fullWidth
                disabled={editWeight <= 0 || editReps <= 0}
                style={styles.saveEditButton}
              />
            </View>
          </View>
        </BottomSheet>

        {/* Footer Buttons */}
        <View style={[styles.footer, { backgroundColor: colors.bgPrimary, borderTopColor: colors.border }]}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.bgSecondary }]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>Back</Text>
            </TouchableOpacity>
            <View style={styles.doneButtonContainer}>
              <Button
                title="Done with Exercise"
                onPress={handleDone}
                size="lg"
                fullWidth
                disabled={exerciseLog.sets.length === 0}
              />
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultColors.bgPrimary,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: defaultColors.bgSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: defaultColors.accentPrimary + "20",
  },
  tabText: {
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    fontWeight: "500",
  },
  tabTextActive: {
    color: defaultColors.accentPrimary,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: 140,
  },
  sectionTitle: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
    marginBottom: spacing.md,
  },
  inputCard: {
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  setHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  setLabel: {
    ...typography.heading3,
    color: defaultColors.accentPrimary,
  },
  completedSets: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    backgroundColor: defaultColors.bgTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  inputGroup: {
    flex: 1,
    alignItems: "center",
  },
  inputDivider: {
    width: 1,
    height: "100%",
    backgroundColor: defaultColors.border,
    marginHorizontal: spacing.lg,
  },
  logButton: {
    marginTop: spacing.sm,
  },
  previousSets: {
    marginBottom: spacing.xl,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: defaultColors.bgSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  setNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: defaultColors.accentPrimary + "30",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  setNumberText: {
    ...typography.bodySmall,
    color: defaultColors.accentPrimary,
    fontWeight: "700",
  },
  setInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  setValue: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  setReps: {
    ...typography.body,
    color: defaultColors.textSecondary,
  },
  setActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: defaultColors.bgTertiary,
  },
  restCard: {
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  activeTimerWrapper: {
    alignItems: "center",
  },
  circularTimerContainer: {
    position: "relative",
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  circularSvg: {
    position: "absolute",
  },
  timerTextContainer: {
    alignItems: "center",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "700",
    color: defaultColors.accentPrimary,
    fontVariant: ["tabular-nums"],
  },
  timerSubtext: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    marginTop: spacing.xs,
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: defaultColors.accentWarning + "30",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  stopButtonText: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  timerSetup: {
    alignItems: "center",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: defaultColors.accentPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  startButtonText: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  prCard: {
    marginBottom: spacing.lg,
    backgroundColor: defaultColors.prGold + "10",
    borderWidth: 1,
    borderColor: defaultColors.prGold + "30",
    padding: spacing.lg,
  },
  prContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  prInfo: {
    flex: 1,
  },
  prLabel: {
    ...typography.caption,
    color: defaultColors.prGold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  prValue: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
    marginTop: spacing.xs,
  },
  prDate: {
    ...typography.caption,
    color: defaultColors.textSecondary,
  },
  estimated1RMCard: {
    marginBottom: spacing.lg,
    backgroundColor: defaultColors.accentPrimary + "15",
    borderWidth: 1,
    borderColor: defaultColors.accentPrimary + "30",
    padding: spacing.lg,
  },
  oneRMBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: defaultColors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  estimated1RMContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  estimated1RMInfo: {
    flex: 1,
  },
  estimated1RMLabel: {
    ...typography.caption,
    color: defaultColors.accentPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  estimated1RMValue: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
    marginTop: spacing.xs,
  },
  estimated1RMSubtext: {
    ...typography.caption,
    color: defaultColors.textSecondary,
  },
  historyCard: {
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  lastWorkoutSets: {
    gap: spacing.sm,
  },
  historySetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  historySetBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: defaultColors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  historySetNumber: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    fontWeight: "600",
  },
  historySetText: {
    ...typography.body,
    color: defaultColors.textPrimary,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  historyItemLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  historyWeight: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  historyReps: {
    ...typography.body,
    color: defaultColors.textSecondary,
  },
  historyDate: {
    ...typography.caption,
    color: defaultColors.textMuted,
  },
  emptyText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  statsCard: {
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: defaultColors.bgTertiary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  statValue: {
    ...typography.heading2,
    color: defaultColors.accentPrimary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chartSection: {
    marginTop: spacing.md,
  },
  chartTitle: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  chartContainer: {
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  lastEntryCard: {
    backgroundColor: defaultColors.bgTertiary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  lastEntryLabel: {
    ...typography.caption,
    color: defaultColors.textMuted,
    marginBottom: spacing.sm,
  },
  lastEntryData: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  lastEntryWeight: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
  },
  lastEntryReps: {
    ...typography.body,
    color: defaultColors.textSecondary,
  },
  lastEntryVolume: {
    ...typography.caption,
    color: defaultColors.textMuted,
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
  footerButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    fontWeight: "600",
  },
  doneButtonContainer: {
    flex: 1,
  },
  editSetContent: {
    padding: spacing.lg,
  },
  editSetButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelEditButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: defaultColors.bgTertiary,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelEditButtonText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    fontWeight: "600",
  },
  saveEditButton: {
    flex: 1,
  },
  errorText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    textAlign: "center",
    marginTop: 100,
  },
});
