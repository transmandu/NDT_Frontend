import { dashboardSteps } from './steps/dashboard';
import { instrumentsSteps } from './steps/instruments';
import { standardsSteps } from './steps/standards';
import { calibrationNewSteps } from './steps/calibrationNew';
import { calibrationCenterSteps } from './steps/calibrationCenter';
import { auditLogSteps } from './steps/auditLog';
import type { TutorialStep, TutorialPageKey } from './types';

/** Map route paths to their tutorial steps */
const stepsByPage: Record<TutorialPageKey, TutorialStep[]> = {
  dashboard: dashboardSteps,
  instruments: instrumentsSteps,
  standards: standardsSteps,
  calibrationNew: calibrationNewSteps,
  calibrationCenter: calibrationCenterSteps,
  auditLog: auditLogSteps,
};

/** Resolve the current pathname to a tutorial page key */
export function resolvePageKey(pathname: string): TutorialPageKey | null {
  if (pathname.startsWith('/calibration/new')) return 'calibrationNew';
  if (pathname.startsWith('/calibration'))     return 'calibrationCenter';
  if (pathname.startsWith('/instruments'))     return 'instruments';
  if (pathname.startsWith('/standards'))       return 'standards';
  if (pathname.startsWith('/audit-log'))       return 'auditLog';
  if (pathname.startsWith('/dashboard'))       return 'dashboard';
  return null;
}

/** Get steps for a page key */
export function getStepsForPage(key: TutorialPageKey): TutorialStep[] {
  return stepsByPage[key] || [];
}
