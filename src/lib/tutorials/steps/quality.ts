import type { TutorialStep } from '../types';

export const qualityNcSteps: TutorialStep[] = [
  {
    element: '#tour-nc-search',
    quick: {
      title: '🔍 Búsqueda',
      description: 'Filtra No Conformidades por código o título.',
    },
    extended: {
      title: '🔍 Búsqueda de No Conformidades',
      description: 'Busca por el código autogenerado (NC-AAAA-NNN) o por el título reportado. Combínalo con los filtros de columna (estado, riesgo) para acotar la lista.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-nc-table',
    quick: {
      title: '📋 No Conformidades',
      description: 'Toda desviación reportada contra un requisito del Sistema de Gestión de Calidad, con su estado de investigación.',
    },
    extended: {
      title: '📋 No Conformidades — ISO/IEC 17025 §7.10',
      description: 'Cada fila es una NC en algún punto de su ciclo de vida:\n\n**Abierta → [En Investigación] → Plan de Acción → En Implementación → En Seguimiento → Cerrada**\n\nDesde Abierta se puede pasar directo a Plan de Acción si la causa ya se conoce, o primero a En Investigación si hace falta analizarla. Cualquier rol puede reportar una NC. Solo Supervisor/Auditor pueden avanzar el estado, y solo un Auditor puede cerrarla. Si la NC nace sobre una sesión de calibración aún no aprobada, la sesión queda bloqueada hasta que se reanude o se cierre la investigación (§7.10.1.a/b/f).',
    },
    side: 'top',
  },
  {
    element: '#tour-nc-col-status',
    quick: {
      title: '🏷️ Estado',
      description: 'En qué etapa del flujo de investigación se encuentra la NC.',
    },
    extended: {
      title: '🏷️ Estado del Workflow',
      description: 'El color indica la etapa. Presta especial atención a la etiqueta roja "Afecta certificado emitido": significa que la NC se detectó sobre un resultado que ya fue entregado al cliente (§7.10.1.c), y requiere decidir la disposición del certificado antes de poder cerrarla.',
    },
    side: 'left',
  },
  {
    element: '#tour-nc-add-btn',
    quick: {
      title: '➕ Reportar NC',
      description: 'Cualquier usuario puede reportar una No Conformidad.',
    },
    extended: {
      title: '➕ Reportar una No Conformidad',
      description: 'Describe qué ocurrió, cuándo se detectó y, si aplica, contra qué origen (sesión de calibración, instrumento, patrón o documento). Las Acciones Correctivas se crean después, desde el detalle de la NC ya reportada.',
    },
    side: 'left',
  },
];

export const qualityAcSteps: TutorialStep[] = [
  {
    element: '#tour-ac-table',
    quick: {
      title: '📋 Acciones Correctivas',
      description: 'Planes de acción para eliminar la causa raíz de una No Conformidad y evitar que se repita.',
    },
    extended: {
      title: '📋 Acciones Correctivas — ISO/IEC 17025 §8.7',
      description: 'Cada AC está vinculada a una NC y pasa por su propio flujo: **Plan de Acción → En Implementación → En Verificación → Eficaz / No Eficaz**.\n\nAntes de pasar a "En Implementación" es obligatorio completar el análisis de causa raíz (5 Porqués o Ishikawa). Solo un Auditor puede verificar la eficacia final.\n\nLas AC se crean desde el detalle de la No Conformidad correspondiente, no desde esta lista.',
    },
    side: 'top',
  },
  {
    element: '#tour-ac-col-status',
    quick: {
      title: '🏷️ Estado',
      description: 'Progreso de la Acción Correctiva dentro de su propio flujo.',
    },
    extended: {
      title: '🏷️ Estado de la AC',
      description: '"No Eficaz" significa que la verificación posterior encontró que el problema persiste — se recomienda abrir un nuevo ciclo de análisis de causa raíz.',
    },
    side: 'left',
  },
];
