"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Video,
  FolderKanban,
  Users,
  Settings,
  BarChart3,
  Save,
  RotateCcw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FeaturePermissions {
  can_view: boolean;
  can_edit: boolean;
  can_manage: boolean;
}

export type PermissionsJson = Record<string, FeaturePermissions>;

interface FeatureSection {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  levels: Array<"can_view" | "can_edit" | "can_manage">;
  levelLabels: Record<string, string>;
  levelDescriptions: Record<string, string>;
}

// ─── Feature definitions ─────────────────────────────────────────────────────

const FEATURES: FeatureSection[] = [
  {
    key: "messaging",
    label: "Messaging",
    description: "Access to channels and direct messages",
    icon: MessageSquare,
    iconColor: "text-blue-500",
    levels: ["can_view", "can_edit", "can_manage"],
    levelLabels: { can_view: "Read", can_edit: "Send Messages", can_manage: "Manage Channels" },
    levelDescriptions: {
      can_view: "Can read messages in all team channels",
      can_edit: "Can send messages and react",
      can_manage: "Can create, archive, and configure channels",
    },
  },
  {
    key: "meetings",
    label: "Meetings",
    description: "Video calls, scheduling, and recordings",
    icon: Video,
    iconColor: "text-purple-500",
    levels: ["can_view", "can_edit", "can_manage"],
    levelLabels: { can_view: "View", can_edit: "Schedule & Join", can_manage: "Manage All Meetings" },
    levelDescriptions: {
      can_view: "Can see the meetings calendar",
      can_edit: "Can schedule and join meetings",
      can_manage: "Can edit, cancel, or record any meeting",
    },
  },
  {
    key: "projects",
    label: "Projects & Tasks",
    description: "Kanban boards, sprints, and task management",
    icon: FolderKanban,
    iconColor: "text-amber-500",
    levels: ["can_view", "can_edit", "can_manage"],
    levelLabels: { can_view: "View", can_edit: "Create & Edit Tasks", can_manage: "Manage Projects" },
    levelDescriptions: {
      can_view: "Can view all project boards and tasks",
      can_edit: "Can create, update, and close tasks",
      can_manage: "Can create projects, columns, sprints, and milestones",
    },
  },
  {
    key: "members",
    label: "Team Members",
    description: "Member list, invites, and role visibility",
    icon: Users,
    iconColor: "text-green-500",
    levels: ["can_view", "can_edit", "can_manage"],
    levelLabels: { can_view: "View Members", can_edit: "Invite Members", can_manage: "Manage Roles" },
    levelDescriptions: {
      can_view: "Can see the team member list",
      can_edit: "Can send invites to new members",
      can_manage: "Can change roles and remove members",
    },
  },
  {
    key: "analytics",
    label: "Analytics & Reports",
    description: "Team performance data and activity logs",
    icon: BarChart3,
    iconColor: "text-cyan-500",
    levels: ["can_view", "can_manage"],
    levelLabels: { can_view: "View Reports", can_manage: "Export & Configure" },
    levelDescriptions: {
      can_view: "Can view team analytics dashboards",
      can_manage: "Can export data and configure report settings",
    },
  },
  {
    key: "settings",
    label: "Team Settings",
    description: "Team profile, integrations, and billing",
    icon: Settings,
    iconColor: "text-rose-500",
    levels: ["can_view", "can_manage"],
    levelLabels: { can_view: "View Settings", can_manage: "Edit Settings" },
    levelDescriptions: {
      can_view: "Can view team settings (read-only)",
      can_manage: "Can modify team name, avatar, and integrations",
    },
  },
];

// ─── Role defaults ────────────────────────────────────────────────────────────
// Used to show what the member already gets from their role, before any overrides.

const ROLE_DEFAULTS: Record<string, PermissionsJson> = {
  ceo: {
    messaging:  { can_view: true,  can_edit: true,  can_manage: true  },
    meetings:   { can_view: true,  can_edit: true,  can_manage: true  },
    projects:   { can_view: true,  can_edit: true,  can_manage: true  },
    members:    { can_view: true,  can_edit: true,  can_manage: true  },
    analytics:  { can_view: true,  can_edit: false, can_manage: true  },
    settings:   { can_view: true,  can_edit: false, can_manage: true  },
  },
  admin: {
    messaging:  { can_view: true,  can_edit: true,  can_manage: true  },
    meetings:   { can_view: true,  can_edit: true,  can_manage: true  },
    projects:   { can_view: true,  can_edit: true,  can_manage: true  },
    members:    { can_view: true,  can_edit: true,  can_manage: true  },
    analytics:  { can_view: true,  can_edit: false, can_manage: true  },
    settings:   { can_view: true,  can_edit: false, can_manage: true  },
  },
  manager: {
    messaging:  { can_view: true,  can_edit: true,  can_manage: false },
    meetings:   { can_view: true,  can_edit: true,  can_manage: false },
    projects:   { can_view: true,  can_edit: true,  can_manage: true  },
    members:    { can_view: true,  can_edit: true,  can_manage: false },
    analytics:  { can_view: true,  can_edit: false, can_manage: false },
    settings:   { can_view: true,  can_edit: false, can_manage: false },
  },
  member: {
    messaging:  { can_view: true,  can_edit: true,  can_manage: false },
    meetings:   { can_view: true,  can_edit: true,  can_manage: false },
    projects:   { can_view: true,  can_edit: true,  can_manage: false },
    members:    { can_view: true,  can_edit: false, can_manage: false },
    analytics:  { can_view: false, can_edit: false, can_manage: false },
    settings:   { can_view: false, can_edit: false, can_manage: false },
  },
  viewer: {
    messaging:  { can_view: true,  can_edit: false, can_manage: false },
    meetings:   { can_view: true,  can_edit: false, can_manage: false },
    projects:   { can_view: true,  can_edit: false, can_manage: false },
    members:    { can_view: true,  can_edit: false, can_manage: false },
    analytics:  { can_view: false, can_edit: false, can_manage: false },
    settings:   { can_view: false, can_edit: false, can_manage: false },
  },
};

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO", admin: "Admin", manager: "Manager", member: "Employee", viewer: "Viewer",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInitialPerms(member: TeamMember): PermissionsJson {
  if (member.permissions_json && Object.keys(member.permissions_json).length > 0) {
    return member.permissions_json as unknown as PermissionsJson;
  }
  return ROLE_DEFAULTS[member.role] ?? ROLE_DEFAULTS.member;
}

// Enforce toggle dependency: enabling a higher level auto-enables lower ones;
// disabling a lower level auto-disables higher ones.
function applyToggleLogic(
  current: FeaturePermissions,
  level: "can_view" | "can_edit" | "can_manage",
  checked: boolean,
  feature: FeatureSection,
): FeaturePermissions {
  const next = { ...current };
  next[level] = checked;

  const hasEdit   = feature.levels.includes("can_edit");
  const hasManage = feature.levels.includes("can_manage");

  if (checked) {
    // Enabling edit → also enable view
    if (level === "can_edit") next.can_view = true;
    // Enabling manage → also enable view (and edit if present)
    if (level === "can_manage") {
      next.can_view = true;
      if (hasEdit) next.can_edit = true;
    }
  } else {
    // Disabling view → also disable edit + manage
    if (level === "can_view") {
      if (hasEdit) next.can_edit = false;
      if (hasManage) next.can_manage = false;
    }
    // Disabling edit → also disable manage
    if (level === "can_edit" && hasManage) next.can_manage = false;
  }

  return next;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MemberPermissionsSheetProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  onSave: (memberId: string, permissions: PermissionsJson) => Promise<void>;
}

export function MemberPermissionsSheet({
  member,
  open,
  onOpenChange,
  canEdit,
  onSave,
}: MemberPermissionsSheetProps) {
  const [perms, setPerms] = useState<PermissionsJson>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (member) {
      setPerms(buildInitialPerms(member));
      setDirty(false);
    }
  }, [member]);

  if (!member) return null;

  const roleDefaults = ROLE_DEFAULTS[member.role] ?? ROLE_DEFAULTS.member;
  const hasOverrides = member.permissions_json && Object.keys(member.permissions_json).length > 0;

  function handleToggle(
    featureKey: string,
    level: "can_view" | "can_edit" | "can_manage",
    checked: boolean,
    feature: FeatureSection,
  ) {
    setPerms((prev) => {
      const current = prev[featureKey] ?? roleDefaults[featureKey] ?? { can_view: false, can_edit: false, can_manage: false };
      return {
        ...prev,
        [featureKey]: applyToggleLogic(current, level, checked, feature),
      };
    });
    setDirty(true);
  }

  function handleReset() {
    setPerms(roleDefaults);
    setDirty(true);
  }

  async function handleSave() {
    if (!member) return;
    setSaving(true);
    try {
      await onSave(member.user.id, perms);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={member.user.avatar_url || ""} />
              <AvatarFallback className="text-sm font-medium">
                {(member.user.full_name?.[0] ?? "?").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base leading-tight truncate">
                {member.user.full_name}
              </SheetTitle>
              <SheetDescription className="text-xs truncate mt-0.5">
                {member.user.email}
              </SheetDescription>
            </div>
            <Badge
              variant={member.role === "ceo" ? "destructive" : member.role === "admin" ? "default" : "secondary"}
              className={cn(
                "shrink-0",
                member.role === "manager" && "bg-amber-500 text-white hover:bg-amber-600",
              )}
            >
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2 mt-3 rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {hasOverrides
                ? "This member has custom permissions overriding their role defaults."
                : "Showing role defaults. Toggle switches to create custom overrides."}
            </span>
          </div>
        </SheetHeader>

        {/* Scrollable feature list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {FEATURES.map((feature, fi) => {
            const Icon = feature.icon;
            const featurePerms = perms[feature.key] ?? roleDefaults[feature.key] ?? { can_view: false, can_edit: false, can_manage: false };
            const roleFeaturePerms = roleDefaults[feature.key] ?? { can_view: false, can_edit: false, can_manage: false };

            return (
              <div key={feature.key}>
                {fi > 0 && <Separator className="my-3" />}
                <div className="space-y-3">
                  {/* Feature header */}
                  <div className="flex items-center gap-2.5">
                    <div className={cn("rounded-md p-1.5 bg-muted", feature.iconColor)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{feature.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                    </div>
                  </div>

                  {/* Permission toggles */}
                  <div className="space-y-2 pl-9">
                    {feature.levels.map((level) => {
                      const isOn = featurePerms[level] ?? false;
                      const isRoleDefault = roleFeaturePerms[level] ?? false;
                      const overridden = isOn !== isRoleDefault;

                      return (
                        <div key={level} className="flex items-center justify-between gap-3 min-h-[36px]">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-foreground">
                                {feature.levelLabels[level]}
                              </span>
                              {overridden && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">
                                  custom
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                              {feature.levelDescriptions[level]}
                            </p>
                          </div>
                          <Switch
                            checked={isOn}
                            onCheckedChange={(checked) =>
                              handleToggle(feature.key, level, checked, feature)
                            }
                            disabled={!canEdit}
                            className="shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        {canEdit && (
          <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between gap-3 bg-background">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to role defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save permissions"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
