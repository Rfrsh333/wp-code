"use client";

import { STATUS_CONFIG, OUTREACH_STATUS_CONFIG, CHANNEL_CONFIG, INSTANTLY_STATUS_CONFIG } from "./constants";
import type { CRMStatus, OutreachStatus, OutreachChannel, InstantlyStatus } from "./types";

export function StatusBadge({ status }: { status: CRMStatus }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      {config.label}
    </span>
  );
}

export function OutreachBadge({ status }: { status: OutreachStatus }) {
  const config = OUTREACH_STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      {config.label}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: OutreachChannel | null }) {
  if (!channel) return null;
  const config = CHANNEL_CONFIG[channel];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      {config.label}
    </span>
  );
}

export function InstantlyBadge({ status }: { status: InstantlyStatus | null }) {
  if (!status) return null;
  const config = INSTANTLY_STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      {config.label}
    </span>
  );
}
