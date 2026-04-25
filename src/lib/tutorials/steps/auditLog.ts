import type { TutorialStep } from '../types';

export const auditLogSteps: TutorialStep[] = [
  {
    element: '#tour-audit-table',
    quick: {
      title: '📋 Log de Auditoría',
      description: 'Registro cronológico de todas las acciones realizadas en el sistema.',
    },
    extended: {
      title: '📋 Log de Auditoría — ISO 17025 §7.11',
      description: 'El log de auditoría es un registro inmutable de trazabilidad que cumple con ISO/IEC 17025:2017 §7.11:\n\n• **Quién**: Usuario que realizó la acción\n• **Qué**: Tipo de acción (crear, modificar, aprobar, rechazar, emitir)\n• **Cuándo**: Fecha y hora exacta con zona horaria\n• **Sobre qué**: Entidad afectada (sesión, instrumento, patrón, certificado)\n\nEste registro es esencial para auditorías externas de acreditación. Ningún registro puede ser eliminado o modificado.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-audit-filters',
    quick: {
      title: '🔍 Filtros',
      description: 'Filtra el log por tipo de acción, usuario o rango de fechas.',
    },
    extended: {
      title: '🔍 Filtros de Auditoría',
      description: 'Herramientas para consultar el historial:\n\n• **Por acción**: Filtrar solo creaciones, aprobaciones, rechazos, etc.\n• **Por usuario**: Ver todas las acciones de un técnico o auditor específico\n• **Por fecha**: Acotar a un período de tiempo\n\nÚtil durante auditorías de acreditación cuando el evaluador solicita el historial de una calibración específica o las acciones de un período determinado.',
    },
    side: 'bottom',
  },
];
