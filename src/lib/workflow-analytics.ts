/**
 * Workflow Analytics & Friction Logging
 *
 * Discover where workflows are slow or frustrating.
 * Measure real operational efficiency.
 *
 * Metrics tracked:
 * - Clicks per workflow
 * - Time to complete
 * - Abandoned flows
 * - Failed actions
 * - Repeated actions
 */

import { trackEvent, trackWorkflow } from './telemetry';

interface WorkflowStep {
  name: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ActiveWorkflow {
  id: string;
  name: string;
  startTime: number;
  steps: WorkflowStep[];
  clicks: number;
  metadata?: Record<string, any>;
}

class WorkflowAnalytics {
  private activeWorkflows: Map<string, ActiveWorkflow> = new Map();
  private completedWorkflows: ActiveWorkflow[] = [];

  /**
   * Start tracking a workflow
   */
  startWorkflow(name: string, metadata?: Record<string, any>): string {
    const id = this.generateId();
    const workflow: ActiveWorkflow = {
      id,
      name,
      startTime: Date.now(),
      steps: [],
      clicks: 0,
      metadata,
    };

    this.activeWorkflows.set(id, workflow);

    trackWorkflow(name, 'start', metadata);

    return id;
  }

  /**
   * Add a step to workflow
   */
  addStep(workflowId: string, stepName: string, metadata?: Record<string, any>): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    workflow.steps.push({
      name: stepName,
      timestamp: Date.now(),
      metadata,
    });

    workflow.clicks++;
  }

  /**
   * Complete a workflow
   */
  completeWorkflow(workflowId: string, result?: Record<string, any>): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    const duration = Date.now() - workflow.startTime;

    trackWorkflow(workflow.name, 'complete', {
      duration,
      steps: workflow.steps.length,
      clicks: workflow.clicks,
      ...workflow.metadata,
      ...result,
    });

    // Store for analysis
    this.completedWorkflows.push(workflow);
    this.activeWorkflows.delete(workflowId);

    // Log in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[Workflow Completed]', {
        name: workflow.name,
        duration: `${duration}ms`,
        steps: workflow.steps.length,
        clicks: workflow.clicks,
      });
    }
  }

  /**
   * Cancel/abandon a workflow
   */
  cancelWorkflow(workflowId: string, reason?: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    const duration = Date.now() - workflow.startTime;

    trackWorkflow(workflow.name, 'abandon', {
      duration,
      steps: workflow.steps.length,
      clicks: workflow.clicks,
      reason,
      ...workflow.metadata,
    });

    this.activeWorkflows.delete(workflowId);

    // Log in dev
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Workflow Abandoned]', {
        name: workflow.name,
        reason,
        duration: `${duration}ms`,
      });
    }
  }

  /**
   * Get workflow statistics
   */
  getStatistics(workflowName?: string): WorkflowStatistics {
    const relevant = workflowName
      ? this.completedWorkflows.filter((w) => w.name === workflowName)
      : this.completedWorkflows;

    if (relevant.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        avgClicks: 0,
        avgSteps: 0,
      };
    }

    const totalDuration = relevant.reduce((sum, w) => sum + (Date.now() - w.startTime), 0);
    const totalClicks = relevant.reduce((sum, w) => sum + w.clicks, 0);
    const totalSteps = relevant.reduce((sum, w) => sum + w.steps.length, 0);

    return {
      count: relevant.length,
      avgDuration: totalDuration / relevant.length,
      avgClicks: totalClicks / relevant.length,
      avgSteps: totalSteps / relevant.length,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface WorkflowStatistics {
  count: number;
  avgDuration: number;
  avgClicks: number;
  avgSteps: number;
}

// Singleton
const workflowAnalytics = new WorkflowAnalytics();

/**
 * Start a workflow
 */
export function startWorkflow(name: string, metadata?: Record<string, any>): string {
  return workflowAnalytics.startWorkflow(name, metadata);
}

/**
 * Add workflow step
 */
export function addWorkflowStep(workflowId: string, stepName: string, metadata?: Record<string, any>): void {
  workflowAnalytics.addStep(workflowId, stepName, metadata);
}

/**
 * Complete workflow
 */
export function completeWorkflow(workflowId: string, result?: Record<string, any>): void {
  workflowAnalytics.completeWorkflow(workflowId, result);
}

/**
 * Cancel workflow
 */
export function cancelWorkflow(workflowId: string, reason?: string): void {
  workflowAnalytics.cancelWorkflow(workflowId, reason);
}

/**
 * Get workflow stats
 */
export function getWorkflowStatistics(workflowName?: string): WorkflowStatistics {
  return workflowAnalytics.getStatistics(workflowName);
}

/**
 * React hook for workflow tracking
 */
export function useWorkflowTracking(workflowName: string, metadata?: Record<string, any>) {
  const workflowIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    workflowIdRef.current = startWorkflow(workflowName, metadata);

    return () => {
      if (workflowIdRef.current) {
        cancelWorkflow(workflowIdRef.current, 'component_unmounted');
      }
    };
  }, [workflowName]);

  const addStep = React.useCallback(
    (stepName: string, stepMetadata?: Record<string, any>) => {
      if (workflowIdRef.current) {
        addWorkflowStep(workflowIdRef.current, stepName, stepMetadata);
      }
    },
    []
  );

  const complete = React.useCallback(
    (result?: Record<string, any>) => {
      if (workflowIdRef.current) {
        completeWorkflow(workflowIdRef.current, result);
        workflowIdRef.current = null;
      }
    },
    []
  );

  const cancel = React.useCallback(
    (reason?: string) => {
      if (workflowIdRef.current) {
        cancelWorkflow(workflowIdRef.current, reason);
        workflowIdRef.current = null;
      }
    },
    []
  );

  return { addStep, complete, cancel };
}

/**
 * Common workflow names
 */
export const Workflows = {
  CANDIDATE_REVIEW: 'candidate_review',
  DOCUMENT_APPROVAL: 'document_approval',
  REQUEST_FOLLOW_UP: 'request_follow_up',
  PLANNING_UPDATE: 'planning_update',
  BULK_APPROVAL: 'bulk_approval',
  CANDIDATE_CONTACT: 'candidate_contact',
} as const;

// Add React import for hook
import * as React from 'react';
