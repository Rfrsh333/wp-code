const SIDEBAR_FAVORITES_KEY = "toptalent.admin.sidebar.favorites";
const SIDEBAR_GROUPS_KEY = "toptalent.admin.sidebar.groups";
const SIDEBAR_COLLAPSED_KEY = "toptalent.admin.sidebar.collapsed";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readFavoriteIds() {
  if (!canUseStorage()) {
    return [] as string[];
  }

  try {
    const value = window.localStorage.getItem(SIDEBAR_FAVORITES_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeFavoriteIds(value: string[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SIDEBAR_FAVORITES_KEY, JSON.stringify(value));
}

export function readCollapsedGroups() {
  if (!canUseStorage()) {
    return {} as Record<string, boolean>;
  }

  try {
    const value = window.localStorage.getItem(SIDEBAR_GROUPS_KEY);
    return value ? (JSON.parse(value) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function writeCollapsedGroups(value: Record<string, boolean>) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(value));
}

export function readSidebarCollapsed() {
  if (!canUseStorage()) {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(value: boolean) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "true" : "false");
}
