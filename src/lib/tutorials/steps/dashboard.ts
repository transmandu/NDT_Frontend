import type { TutorialStep } from '../types';

export const dashboardSteps: TutorialStep[] = [
  {
    element: '#tour-dashboard-welcome',
    quick: {
      title: '📊 Panel Principal',
      description: 'Aquí verás un resumen del estado operativo de tu laboratorio: sesiones pendientes, certificados emitidos y alertas.',
    },
    extended: {
      title: '📊 Panel Principal — Dashboard Operativo',
      description: 'El Dashboard es el centro de control de tu laboratorio de metrología. Según la norma ISO/IEC 17025:2017 (§7.7), debes mantener registros actualizados de todas las actividades de calibración. Este panel te muestra en tiempo real:\n\n• Sesiones de calibración pendientes de aprobación\n• Certificados emitidos recientemente\n• Instrumentos con fecha de recalibración próxima a vencer\n• Alertas de trazabilidad de patrones',
    },
    side: 'bottom',
  },
  {
    element: '#tour-dashboard-kpis',
    quick: {
      title: '🔢 Indicadores Clave (KPIs)',
      description: 'Tarjetas con métricas principales: total de instrumentos, sesiones pendientes, certificados emitidos y alertas activas.',
    },
    extended: {
      title: '🔢 KPIs — ¿Por qué son importantes?',
      description: 'Los indicadores clave de rendimiento (KPI) te permiten evaluar la eficiencia del laboratorio de un vistazo:\n\n• **Instrumentos activos**: Total de equipos registrados bajo control metrológico\n• **Pendientes de revisión**: Calibraciones completadas que requieren aprobación del auditor\n• **Certificados emitidos**: Documentos oficiales generados este mes\n• **Alertas**: Instrumentos o patrones que requieren atención inmediata (vencimiento, recalibración)\n\nEstos datos apoyan la mejora continua exigida por ISO 17025 §8.6.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-dashboard-recent',
    quick: {
      title: '📋 Actividad Reciente',
      description: 'Últimas sesiones de calibración realizadas con su estado actual.',
    },
    extended: {
      title: '📋 Actividad Reciente — Trazabilidad',
      description: 'Esta tabla muestra las últimas sesiones de calibración con su estado:\n\n• **Borrador**: El técnico aún está ingresando datos\n• **Pendiente**: Enviada a revisión, esperando aprobación del auditor\n• **Aprobada**: Revisada y lista para emitir certificado\n• **Rechazada**: El auditor encontró inconsistencias y devolvió la sesión\n\nCada cambio de estado queda registrado en el log de auditoría (ISO 17025 §7.11).',
    },
    side: 'top',
  },
];
