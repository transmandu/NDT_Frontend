'use client';

import { useParams, useRouter } from 'next/navigation';
import CalibrationReview from '@/components/calibration/CalibrationReview';

/**
 * /calibration/[id] — Direct URL access to a calibration session.
 * Uses the shared CalibrationReview component which provides the full
 * audit view: GUM calculation breakdown, results table, approve/reject.
 */
export default function CalibrationDetailPage() {
  const { id } = useParams();
  const router  = useRouter();

  return (
    <CalibrationReview
      id={Number(id)}
      onBack={() => router.push('/calibration')}
    />
  );
}
