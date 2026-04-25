import type { TutorialStep } from '../types';

export const calibrationCenterSteps: TutorialStep[] = [
  {
    element: '#tour-center-tabs',
    quick: {
      title: '📑 Pestañas de Estado',
      description: 'Filtra las sesiones de calibración por estado: Pendientes, Aprobadas o Rechazadas.',
    },
    extended: {
      title: '📑 Estados de la Sesión — Flujo ISO 17025',
      description: 'Cada sesión de calibración pasa por un flujo de estados:\n\n• **Pendientes (🟡)**: Esperan revisión del auditor. El técnico completó las mediciones y el sistema calculó los resultados.\n• **Aprobadas (🟢)**: El auditor verificó los resultados y generó el certificado oficial.\n• **Rechazadas (🔴)**: El auditor encontró problemas y devolvió la sesión con observaciones.\n\nEste flujo de doble verificación (técnico → auditor) es exigido por ISO 17025 §7.8.1 para asegurar la validez de los resultados.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-center-table',
    quick: {
      title: '📋 Tabla de Sesiones',
      description: 'Lista las sesiones con su código, instrumento, técnico, fecha y estado.',
    },
    extended: {
      title: '📋 Sesiones de Calibración',
      description: 'Cada fila representa una sesión completa de calibración:\n\n• **Código**: Identificador único de la sesión (CS-XXX)\n• **Instrumento**: Equipo que fue calibrado\n• **Técnico**: Persona que realizó las mediciones\n• **Fecha**: Cuándo se realizó la calibración\n• **Estado**: En qué punto del flujo se encuentra\n\nHaz clic en "Revisar" para abrir el panel de auditoría con todos los detalles de la sesión.',
    },
    side: 'top',
  },
  {
    element: '#tour-center-review',
    quick: {
      title: '🔍 Panel de Revisión',
      description: 'Muestra los datos completos de la sesión seleccionada para que el auditor los revise.',
    },
    extended: {
      title: '🔍 Revisión — Verificación del Auditor',
      description: 'En el panel de revisión, el auditor verifica:\n\n1. **Datos generales**: Instrumento, patrón, procedimiento aplicado\n2. **Condiciones ambientales**: Que estén dentro de los rangos aceptables\n3. **Resultados de cálculo**: Error, incertidumbre y conformidad\n4. **Presupuesto de incertidumbre**: Desglose de todas las contribuciones\n5. **Coherencia general**: Que los datos sean razonables y consistentes\n\nEl auditor puede aprobar (generando certificado) o rechazar (especificando el motivo).',
    },
    side: 'left',
  },
  {
    element: '#tour-center-actions',
    quick: {
      title: '✅ Acciones de Auditoría',
      description: 'Botones para aprobar o rechazar la sesión de calibración.',
    },
    extended: {
      title: '✅ Decisión — Aprobar o Rechazar',
      description: 'Dos acciones posibles:\n\n• **Aprobar**: Confirma que los resultados son válidos. El sistema genera automáticamente el certificado de calibración en PDF con todos los datos inmutables (snapshot).\n\n• **Rechazar**: Devuelve la sesión al técnico. Se debe indicar el motivo del rechazo. La sesión queda marcada y puede ser corregida.\n\nCada acción queda registrada en el log de auditoría con usuario, fecha y hora exacta (ISO 17025 §7.11).',
    },
    side: 'top',
  },
  {
    element: '#tour-center-certs',
    quick: {
      title: '📜 Certificados Emitidos',
      description: 'Sección para descargar los certificados de calibración generados.',
    },
    extended: {
      title: '📜 Certificados — Documento Oficial',
      description: 'Los certificados emitidos son documentos **inmutables** que contienen:\n\n• Identificación completa del instrumento y patrones\n• Resultados de calibración con incertidumbre\n• Declaración de conformidad\n• Firmas del director y coordinador\n• Código QR para verificación\n\nCada certificado tiene un hash SHA-256 que garantiza su integridad. No pueden ser modificados una vez generados.',
    },
    side: 'top',
  },
];
