/** Tutorial system types for Driver.js integration */

export type TutorialMode = 'quick' | 'extended';

export interface TutorialStepContent {
  title: string;
  description: string;
}

export interface TutorialStep {
  /** CSS selector for the target element (must have a matching id="tour-xxx") */
  element: string;
  /** Quick mode: functional overview */
  quick: TutorialStepContent;
  /** Extended mode: detailed metrological explanation */
  extended: TutorialStepContent;
  /** Which side to show the popover */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Alignment */
  align?: 'start' | 'center' | 'end';
}

export interface TutorialConfig {
  pageKey: string;
  steps: TutorialStep[];
}

/** All page keys that have tutorials */
export type TutorialPageKey =
  | 'dashboard'
  | 'instruments'
  | 'standards'
  | 'calibrationNew'
  | 'calibrationCenter'
  | 'auditLog';
