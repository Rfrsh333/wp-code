/**
 * Telemetry & Product Analytics
 *
 * Lightweight event tracking to understand real dashboard usage.
 * Future-proof architecture for analytics integration.
 *
 * Design principles:
 * - Zero performance impact
 * - No heavy dependencies
 * - Privacy-aware
 * - Easy to integrate backend analytics later
 */

export interface TelemetryEvent {
  name: string;
  timestamp: number;
  payload?: Record<string, any>;
  sessionId?: string;
  userId?: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  consoleLogging: boolean;
  endpoint?: string;
  batchSize?: number;
  flushInterval?: number;
}

class TelemetryService {
  private config: TelemetryConfig;
  private queue: TelemetryEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.config = {
      enabled: true,
      consoleLogging: process.env.NODE_ENV === 'development',
      batchSize: 10,
      flushInterval: 30000, // 30s
    };

    // Auto-flush periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.config.flushInterval);
    }
  }

  /**
   * Track an event
   */
  track(name: string, payload?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const event: TelemetryEvent = {
      name,
      timestamp: Date.now(),
      payload,
      sessionId: this.sessionId,
      // userId: getCurrentUserId(), // TODO: Add when auth available
    };

    // Console logging in dev
    if (this.config.consoleLogging) {
      console.log('[Telemetry]', name, payload);
    }

    // Add to queue
    this.queue.push(event);

    // Auto-flush if batch size reached
    if (this.queue.length >= (this.config.batchSize || 10)) {
      this.flush();
    }
  }

  /**
   * Flush queued events to backend
   */
  private flush(): void {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    // TODO: Send to backend analytics endpoint
    // For now, just log in dev
    if (this.config.consoleLogging) {
      console.log('[Telemetry] Flushing', events.length, 'events');
    }

    // Example backend integration:
    // if (this.config.endpoint) {
    //   fetch(this.config.endpoint, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ events }),
    //   }).catch(err => console.warn('Telemetry flush failed:', err));
    // }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update config
   */
  configure(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
const telemetry = new TelemetryService();

/**
 * Track an event
 */
export function trackEvent(name: string, payload?: Record<string, any>): void {
  telemetry.track(name, payload);
}

/**
 * Configure telemetry
 */
export function configureTelemetry(config: Partial<TelemetryConfig>): void {
  telemetry.configure(config);
}

/**
 * Common event names (enum for consistency)
 */
export const TelemetryEvents = {
  // Command palette
  COMMAND_PALETTE_OPENED: 'command_palette_opened',
  COMMAND_EXECUTED: 'command_executed',

  // Quick actions
  QUICK_ACTION_USED: 'quick_action_used',

  // Insights
  INSIGHT_VIEWED: 'insight_viewed',
  INSIGHT_CLICKED: 'insight_clicked',
  INSIGHT_CTA_CLICKED: 'insight_cta_clicked',

  // Slide-over
  SLIDE_OVER_OPENED: 'slide_over_opened',
  SLIDE_OVER_CLOSED: 'slide_over_closed',

  // Activity
  ACTIVITY_ITEM_CLICKED: 'activity_item_clicked',
  ACTIVITY_FILTER_CHANGED: 'activity_filter_changed',

  // Navigation
  TAB_CHANGED: 'tab_changed',
  SECTION_VIEWED: 'section_viewed',

  // Analytics
  ANALYTICS_VIEWED: 'analytics_viewed',
  ANALYTICS_RANGE_CHANGED: 'analytics_range_changed',

  // Bulk actions
  BULK_SELECTION_STARTED: 'bulk_selection_started',
  BULK_ACTION_STARTED: 'bulk_action_started',
  BULK_ACTION_COMPLETED: 'bulk_action_completed',
  BULK_ACTION_EXECUTED: 'bulk_action_executed',
  BULK_SELECTION_ACTIVE: 'bulk_selection_active',

  // Workflows
  WORKFLOW_STARTED: 'workflow_started',
  WORKFLOW_COMPLETED: 'workflow_completed',
  WORKFLOW_ABANDONED: 'workflow_abandoned',

  // Inline updates
  STATUS_UPDATED_INLINE: 'status_updated_inline',

  // Keyboard shortcuts
  SHORTCUT_USED: 'shortcut_used',

  // Mobile
  MOBILE_ACTION_USED: 'mobile_action_used',

  // Performance
  PAGE_LOAD_TIME: 'page_load_time',
  API_REQUEST_TIME: 'api_request_time',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
} as const;

/**
 * Track workflow
 */
export function trackWorkflow(
  name: string,
  action: 'start' | 'complete' | 'abandon',
  metadata?: Record<string, any>
): void {
  const eventName = {
    start: TelemetryEvents.WORKFLOW_STARTED,
    complete: TelemetryEvents.WORKFLOW_COMPLETED,
    abandon: TelemetryEvents.WORKFLOW_ABANDONED,
  }[action];

  trackEvent(eventName, {
    workflow: name,
    ...metadata,
  });
}

/**
 * Track performance metric
 */
export function trackPerformance(metric: string, duration: number, metadata?: Record<string, any>): void {
  trackEvent('performance_metric', {
    metric,
    duration,
    ...metadata,
  });
}

/**
 * Track error
 */
export function trackError(error: Error | string, context?: Record<string, any>): void {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  trackEvent(TelemetryEvents.ERROR_OCCURRED, {
    error: errorMessage,
    stack: errorStack,
    ...context,
  });
}
