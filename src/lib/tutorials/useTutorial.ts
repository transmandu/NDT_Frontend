'use client';

import { useCallback, useRef } from 'react';
import { driver, type DriveStep, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { resolvePageKey, getStepsForPage } from './index';
import type { TutorialMode, TutorialStep } from './types';

/** Convert our steps to Driver.js steps based on mode */
function toDriverSteps(steps: TutorialStep[], mode: TutorialMode): DriveStep[] {
  return steps
    .filter((s) => {
      // Only include steps whose target element exists in the DOM
      return document.querySelector(s.element) !== null;
    })
    .map((s) => ({
      element: s.element,
      popover: {
        title: mode === 'quick' ? s.quick.title : s.extended.title,
        description: mode === 'quick' ? s.quick.description : s.extended.description,
        side: s.side || 'bottom',
        align: s.align || 'start',
      },
    }));
}

/** Hook to manage Driver.js tutorials for the current page */
export function useTutorial(pathname: string) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const startTutorial = useCallback(
    (mode: TutorialMode) => {
      const pageKey = resolvePageKey(pathname);
      if (!pageKey) return;

      const rawSteps = getStepsForPage(pageKey);
      const driverSteps = toDriverSteps(rawSteps, mode);

      if (driverSteps.length === 0) return;

      // Destroy previous instance if any
      if (driverRef.current) {
        driverRef.current.destroy();
      }

      const config: Config = {
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        steps: driverSteps,
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Anterior',
        doneBtnText: '✓ Finalizar',
        progressText: '{{current}} de {{total}}',
        popoverClass: mode === 'extended' ? 'ndt-tour-extended' : 'ndt-tour-quick',
        stagePadding: 6,
        stageRadius: 8,
        overlayColor: 'rgba(0, 0, 0, 0.65)',
        animate: true,
      };

      const d = driver(config);
      driverRef.current = d;
      d.drive();
    },
    [pathname]
  );

  const hasTutorial = useCallback(() => {
    const pageKey = resolvePageKey(pathname);
    return pageKey !== null;
  }, [pathname]);

  return { startTutorial, hasTutorial };
}
