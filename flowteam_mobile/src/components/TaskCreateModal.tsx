import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../lib/theme";
import { useCreateTask, useProjects } from "../lib/queries";
import type { CreateTaskPayload } from "../lib/types";
import { AppText } from "./AppText";
import { PriorityBadge } from "./PriorityBadge";

const PRIORITIES = ["urgent", "high", "normal", "low"] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  isDemoMode: boolean;
  defaultProjectId?: string;
};

export function TaskCreateModal({ visible, onClose, isDemoMode, defaultProjectId }: Props) {
  const { data: projects = [] } = useProjects(isDemoMode, null);
  const createTask = useCreateTask(isDemoMode);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"urgent" | "high" | "normal" | "low">("normal");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [dueDate, setDueDate] = useState("");

  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setProjectId(defaultProjectId ?? projects[0]?.id ?? "");
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 14,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, defaultProjectId, projects, slideAnim]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed || !projectId) return;

    const payload: CreateTaskPayload = {
      title: trimmed,
      description: description.trim() || undefined,
      project: projectId,
      priority,
      due_date: dueDate.trim() || null,
    };

    createTask.mutate(payload, {
      onSuccess: () => {
        setTitle("");
        setDescription("");
        setPriority("normal");
        setDueDate("");
        onClose();
      },
    });
  };

  const canSubmit = title.trim().length > 0 && projectId.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Title bar */}
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <View style={styles.titleIcon}>
                <Ionicons name="add-circle" size={18} color={colors.primary} />
              </View>
              <AppText variant="heading" style={styles.titleText}>New task</AppText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Title field */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>Task title *</AppText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor={colors.mutedLight}
                style={styles.titleInput}
                multiline
                maxLength={200}
                autoFocus
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>Description</AppText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add details, steps, or context…"
                placeholderTextColor={colors.mutedLight}
                style={styles.descInput}
                multiline
                maxLength={1000}
              />
            </View>

            {/* Priority */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>Priority</AppText>
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
                  >
                    <PriorityBadge priority={p} />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Project */}
            {projects.length > 0 ? (
              <View style={styles.fieldGroup}>
                <AppText variant="label" style={styles.fieldLabel}>Project *</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRow}>
                  {projects.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setProjectId(p.id)}
                      style={[
                        styles.projectChip,
                        projectId === p.id && styles.projectChipActive,
                        { borderColor: projectId === p.id ? (p.color ?? colors.primary) : colors.glassBorderDark },
                      ]}
                    >
                      <AppText style={[styles.projectChipText, projectId === p.id && { color: p.color ?? colors.primary }]}>
                        {p.name}
                      </AppText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Due date */}
            <View style={[styles.fieldGroup, { marginBottom: spacing.xl }]}>
              <AppText variant="label" style={styles.fieldLabel}>Due date</AppText>
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={colors.mutedLight}
                style={styles.smallInput}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </ScrollView>

          {/* Submit */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || createTask.isPending}
              style={({ pressed }) => [
                styles.submitBtn,
                (!canSubmit || createTask.isPending) && styles.submitBtnDisabled,
                pressed && canSubmit && styles.submitBtnPressed,
              ]}
            >
              {createTask.isPending ? (
                <ActivityIndicator color={colors.canvasDark} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={canSubmit ? colors.canvasDark : colors.mutedLight} />
                  <AppText style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                    Create task
                  </AppText>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayModal,
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xxxl,
    borderTopRightRadius: radius.xxxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.glassBorder,
    maxHeight: "90%",
    ...shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 24,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorderDark,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSubtle,
  },
  titleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    letterSpacing: 0,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.faint,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.muted,
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  titleInput: {
    ...typography.bodyBold,
    color: colors.ink,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    padding: spacing.md,
    minHeight: 56,
    maxHeight: 100,
  },
  descInput: {
    ...typography.body,
    color: colors.ink,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    padding: spacing.md,
    minHeight: 76,
    maxHeight: 140,
    textAlignVertical: "top",
  },
  smallInput: {
    ...typography.body,
    color: colors.ink,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    height: 46,
  },
  priorityRow: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  priorityBtn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  priorityBtnActive: {
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceRaised,
  },
  projectRow: {
    gap: spacing.xs,
    paddingBottom: 2,
  },
  projectChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.surfaceGlass,
  },
  projectChipActive: {
    backgroundColor: colors.primarySofter,
  },
  projectChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 34 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSubtle,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    ...shadow,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
  },
  submitBtnDisabled: {
    backgroundColor: colors.faint,
    shadowOpacity: 0,
  },
  submitBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    color: colors.canvasDark,
    fontSize: 16,
    fontWeight: "900",
  },
  submitTextDisabled: {
    color: colors.mutedLight,
  },
});
