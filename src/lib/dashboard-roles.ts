/**
 * Dashboard Role Configuration
 *
 * Future-proof architecture for role-based dashboard views.
 * Currently uses default 'owner' view, ready for role expansion.
 */

export type UserRole = 'owner' | 'recruitment' | 'finance' | 'operations';

export interface DashboardSection {
  id: string;
  enabled: boolean;
  priority: number;
}

export interface DashboardConfig {
  role: UserRole;
  kpis: string[];
  sections: DashboardSection[];
  features: {
    quickActions: boolean;
    bulkActions: boolean;
    analytics: boolean;
    commandPalette: boolean;
  };
}

/**
 * Dashboard configurations per role
 */
const dashboardConfigs: Record<UserRole, DashboardConfig> = {
  owner: {
    role: 'owner',
    kpis: ['revenue', 'requests', 'diensten', 'conversion'],
    sections: [
      { id: 'kpis', enabled: true, priority: 1 },
      { id: 'insights', enabled: true, priority: 2 },
      { id: 'operations', enabled: true, priority: 3 },
      { id: 'activity', enabled: true, priority: 4 },
      { id: 'analytics', enabled: true, priority: 5 },
    ],
    features: {
      quickActions: true,
      bulkActions: true,
      analytics: true,
      commandPalette: true,
    },
  },

  recruitment: {
    role: 'recruitment',
    kpis: ['requests', 'conversion', 'diensten'],
    sections: [
      { id: 'insights', enabled: true, priority: 1 },
      { id: 'kpis', enabled: true, priority: 2 },
      { id: 'operations', enabled: true, priority: 3 },
      { id: 'activity', enabled: true, priority: 4 },
      { id: 'analytics', enabled: false, priority: 5 },
    ],
    features: {
      quickActions: true,
      bulkActions: true,
      analytics: false,
      commandPalette: true,
    },
  },

  finance: {
    role: 'finance',
    kpis: ['revenue'],
    sections: [
      { id: 'kpis', enabled: true, priority: 1 },
      { id: 'analytics', enabled: true, priority: 2 },
      { id: 'activity', enabled: true, priority: 3 },
      { id: 'insights', enabled: false, priority: 4 },
      { id: 'operations', enabled: false, priority: 5 },
    ],
    features: {
      quickActions: false,
      bulkActions: true,
      analytics: true,
      commandPalette: true,
    },
  },

  operations: {
    role: 'operations',
    kpis: ['diensten', 'requests', 'conversion'],
    sections: [
      { id: 'insights', enabled: true, priority: 1 },
      { id: 'operations', enabled: true, priority: 2 },
      { id: 'kpis', enabled: true, priority: 3 },
      { id: 'activity', enabled: true, priority: 4 },
      { id: 'analytics', enabled: false, priority: 5 },
    ],
    features: {
      quickActions: true,
      bulkActions: true,
      analytics: false,
      commandPalette: true,
    },
  },
};

/**
 * Get dashboard configuration for a role
 * Falls back to 'owner' if role is undefined or invalid
 */
export function getDashboardConfig(role?: UserRole): DashboardConfig {
  if (!role || !(role in dashboardConfigs)) {
    return dashboardConfigs.owner;
  }
  return dashboardConfigs[role];
}

/**
 * Check if a feature is enabled for current role
 */
export function hasFeature(
  role: UserRole | undefined,
  feature: keyof DashboardConfig['features']
): boolean {
  const config = getDashboardConfig(role);
  return config.features[feature];
}

/**
 * Check if a section is enabled for current role
 */
export function isSectionEnabled(
  role: UserRole | undefined,
  sectionId: string
): boolean {
  const config = getDashboardConfig(role);
  const section = config.sections.find((s) => s.id === sectionId);
  return section?.enabled ?? false;
}

/**
 * Get sorted sections by priority
 */
export function getSortedSections(role: UserRole | undefined): DashboardSection[] {
  const config = getDashboardConfig(role);
  return [...config.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Hook for future use when real user roles are available
 * Currently returns 'owner' as default
 */
export function useUserRole(): UserRole {
  // TODO: Replace with real role from auth/user context
  // For now, default to owner
  return 'owner';
}
