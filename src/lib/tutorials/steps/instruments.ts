import type { TutorialStep } from '../types';

export const instrumentsSteps: TutorialStep[] = [
  {
    element: '#tour-inst-search',
    quick: {
      title: '🔍 Búsqueda y Filtros',
      description: 'Filtra instrumentos por nombre, código interno, marca o categoría.',
    },
    extended: {
      title: '🔍 Búsqueda — Localización Rápida',
      description: 'Puedes buscar cualquier instrumento registrado usando:\n\n• **Código interno**: Identificador único del laboratorio (ej: BAL-001)\n• **Nombre**: Tipo de instrumento (Balanza, Vernier, Manómetro...)\n• **Marca/Modelo**: Para filtrar por fabricante\n• **Categoría**: Agrupa instrumentos por tipo de magnitud\n\nEl código interno es el que aparecerá en el certificado de calibración.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-inst-table',
    quick: {
      title: '📋 Tabla de Instrumentos',
      description: 'Lista todos los equipos de medición registrados en el laboratorio con sus datos técnicos principales.',
    },
    extended: {
      title: '📋 Inventario de Equipos — ISO 17025 §6.4',
      description: 'Esta tabla es tu inventario metrológico. La norma ISO/IEC 17025:2017 exige que todo equipo que afecte la validez de los resultados debe estar:\n\n• **Identificado** unívocamente (código interno)\n• **Calibrado** con trazabilidad demostrada\n• **Caracterizado** con sus especificaciones técnicas (rango, resolución, EMP)\n\nCada fila representa un instrumento bajo control del Sistema de Gestión de Calidad.',
    },
    side: 'top',
  },
  {
    element: '#tour-inst-col-code',
    quick: {
      title: '🏷️ Código Interno',
      description: 'Identificador único del instrumento dentro del laboratorio (ej: BAL-001).',
    },
    extended: {
      title: '🏷️ Código Interno — Identificación Unívoca',
      description: 'El código interno es la referencia principal del equipo en tu laboratorio. Sigue el formato [TIPO]-[NNN]:\n\n• **BAL-001**: Balanza #001\n• **VER-003**: Vernier (calibre) #003\n• **MAN-002**: Manómetro #002\n\nEste código aparece en todos los documentos: certificados de calibración, registros de uso y auditorías. Es obligatorio según ISO 17025 §6.4.4.',
    },
    side: 'right',
  },
  {
    element: '#tour-inst-col-range',
    quick: {
      title: '📏 Rango',
      description: 'Intervalo de medición del instrumento (valor mínimo a máximo que puede medir).',
    },
    extended: {
      title: '📏 Rango de Medición',
      description: 'El rango define los límites operativos del instrumento:\n\n• **Ejemplo Balanza**: 0 – 6000 g (puede pesar desde 0 hasta 6 kg)\n• **Ejemplo Vernier**: 0 – 150 mm\n• **Ejemplo Manómetro**: 0 – 700 bar\n\nDurante la calibración, se seleccionan puntos dentro de este rango para verificar el comportamiento del instrumento. Nunca se debe medir fuera del rango declarado.',
    },
    side: 'left',
  },
  {
    element: '#tour-inst-col-resolution',
    quick: {
      title: '🔬 Resolución',
      description: 'La mínima diferencia que el instrumento puede detectar.',
    },
    extended: {
      title: '🔬 Resolución — Mínima Variación Detectable',
      description: 'La resolución es la cantidad más pequeña que el instrumento puede diferenciar:\n\n• **Balanza con resolución 0.01 g**: Puede distinguir entre 100.00 g y 100.01 g\n• **Vernier con resolución 0.02 mm**: Distingue diferencias de 0.02 mm\n\nLa resolución contribuye directamente a la incertidumbre de medición como componente tipo B: u_res = resolución / (2√3). A menor resolución, mayor precisión potencial del instrumento.',
    },
    side: 'left',
  },
  {
    element: '#tour-inst-col-emp',
    quick: {
      title: '🟢 Estado Operativo',
      description: 'Indica si el instrumento está activo, inactivo o en proceso de calibración.',
    },
    extended: {
      title: '🟢 Estado y Conformidad — ISO 17025 §6.4',
      description: 'El estado operativo del instrumento determina si puede ser usado en calibraciones:\n\n• **Operativo**: El instrumento está calibrado y disponible para uso\n• **Inactivo**: Fuera de servicio (reparación, baja definitiva)\n• **En Calibración**: Temporalmente fuera de uso mientras se procesa su calibración\n\nEl EMP de cada instrumento (Error Máximo Permitido) se registra al crear la ficha. Se usa en la regla de decisión: **|Error| + U ≤ EMP**. Si esta condición no se cumple, el estado debería cambiar a "En Calibración" o "Inactivo".',
    },
    side: 'left',
  },
  {
    element: '#tour-inst-add-btn',
    quick: {
      title: '➕ Nuevo Instrumento',
      description: 'Registra un nuevo equipo de medición en el sistema.',
    },
    extended: {
      title: '➕ Registrar Nuevo Instrumento',
      description: 'Al agregar un instrumento, debes completar:\n\n• **Datos de identificación**: nombre, código, marca, modelo, serial\n• **Especificaciones técnicas**: rango, resolución, EMP, unidad\n• **Categoría**: tipo de magnitud que mide\n\nTodos estos datos se usarán para generar certificados de calibración conformes con ISO/IEC 17025:2017. Asegúrate de copiar los datos exactamente de la ficha técnica del fabricante.',
    },
    side: 'left',
  },
];
