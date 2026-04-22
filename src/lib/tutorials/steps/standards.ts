import type { TutorialStep } from '../types';

export const standardsSteps: TutorialStep[] = [
  {
    element: '#tour-std-search',
    quick: {
      title: '🔍 Búsqueda de Patrones',
      description: 'Filtra patrones por nombre, número de serie o número de certificado.',
    },
    extended: {
      title: '🔍 Búsqueda — Trazabilidad de Patrones',
      description: 'Los patrones de referencia son instrumentos calibrados con trazabilidad al Sistema Internacional de Unidades (SI). Puedes buscar por:\n\n• **Nombre**: Tipo de patrón (Bloque patrón, Pesa de referencia...)\n• **N° Serie**: Identificador del fabricante\n• **N° Certificado**: Referencia del certificado de calibración del patrón\n\nTodo patrón debe tener su certificado vigente para garantizar trazabilidad (ISO 17025 §6.5).',
    },
    side: 'bottom',
  },
  {
    element: '#tour-std-table',
    quick: {
      title: '📋 Tabla de Patrones',
      description: 'Lista todos los patrones de referencia con su estado de vigencia y datos de calibración.',
    },
    extended: {
      title: '📋 Patrones de Referencia — ISO 17025 §6.5',
      description: 'Los patrones son la "verdad de referencia" contra la cual se calibran los instrumentos. La norma exige:\n\n• **Trazabilidad metrológica**: Cada patrón debe estar calibrado por un laboratorio acreditado\n• **Certificado vigente**: Con fecha de vencimiento controlada\n• **Incertidumbre conocida**: El valor de U del patrón se usa en el cálculo de incertidumbre\n\nSi un patrón vence, todas las calibraciones realizadas con él después del vencimiento quedan cuestionadas.',
    },
    side: 'top',
  },
  {
    element: '#tour-std-col-cert',
    quick: {
      title: '📄 N° Certificado',
      description: 'Número del certificado de calibración emitido para este patrón.',
    },
    extended: {
      title: '📄 Certificado del Patrón — Cadena de Trazabilidad',
      description: 'El número de certificado vincula este patrón con su calibración oficial:\n\n• Fue emitido por un **laboratorio acreditado** (NMI o laboratorio de referencia)\n• Contiene la **incertidumbre del patrón** que usamos en nuestros cálculos\n• Demuestra la **cadena de trazabilidad** desde el SI hasta nuestro instrumento\n\nEste número aparecerá en todos los certificados que emitamos usando este patrón (ISO 17025 §7.8.4.c).',
    },
    side: 'left',
  },
  {
    element: '#tour-std-col-uncertainty',
    quick: {
      title: '📊 Incertidumbre (U)',
      description: 'Incertidumbre expandida del patrón, declarada en su certificado de calibración.',
    },
    extended: {
      title: '📊 Incertidumbre del Patrón — Componente u_B,pat',
      description: 'La incertidumbre U del patrón es la que declara su certificado de calibración con k=2 (95% confianza).\n\nEn nuestro cálculo de incertidumbre, la convertimos a incertidumbre estándar:\n\n**u_B,pat = U_patrón / k**\n\nDonde k es el factor de cobertura (usualmente 2).\n\nEsta contribución es una de las 3 componentes del presupuesto de incertidumbre:\n• u_A (repetibilidad)\n• u_B,pat (patrón) ← esta\n• u_B,res (resolución del instrumento)',
    },
    side: 'left',
  },
  {
    element: '#tour-std-col-kfactor',
    quick: {
      title: '🔑 Factor k',
      description: 'Factor de cobertura usado para calcular la incertidumbre expandida del patrón.',
    },
    extended: {
      title: '🔑 Factor k — Nivel de Confianza',
      description: 'El factor de cobertura k determina el nivel de confianza de la incertidumbre:\n\n• **k = 1** → ~68% de confianza\n• **k = 2** → ~95% de confianza (el más común)\n• **k = 3** → ~99.7% de confianza\n\nNormalmente los certificados de patrones declaran U con k=2. Si el proveedor usa otro valor de k, se debe registrar aquí para que el sistema calcule correctamente u_B,pat = U/k.',
    },
    side: 'left',
  },
  {
    element: '#tour-std-col-expiry',
    quick: {
      title: '📅 Vigencia',
      description: 'Fecha hasta la cual el certificado del patrón es válido.',
    },
    extended: {
      title: '📅 Vigencia — Control de Vencimiento',
      description: 'La fecha de vigencia indica hasta cuándo es confiable la calibración del patrón.\n\nEl sistema te alerta cuando un patrón está próximo a vencer:\n• 🟡 **Amarillo**: Vence en menos de 30 días\n• 🔴 **Rojo**: Vencido — NO debe usarse\n\nUsar un patrón vencido invalida las calibraciones realizadas y constituye una no conformidad según ISO 17025 §7.7.1.',
    },
    side: 'left',
  },
  {
    element: '#tour-std-add-btn',
    quick: {
      title: '➕ Nuevo Patrón',
      description: 'Registra un nuevo patrón de referencia con sus datos de trazabilidad.',
    },
    extended: {
      title: '➕ Registrar Patrón de Referencia',
      description: 'Al agregar un patrón, necesitas los datos de su certificado de calibración:\n\n• **Nombre**: Descripción del patrón (ej: "Bloque patrón 25 mm")\n• **Marca/Modelo/Serial**: Identificación del equipo\n• **N° Certificado**: Del laboratorio que lo calibró\n• **Incertidumbre U**: Valor declarado en el certificado\n• **Factor k**: Normalmente 2\n• **Unidad**: mm, g, bar, °C, etc.\n• **Fecha vigencia**: Hasta cuándo es válida la calibración\n\nEstos datos forman el "snapshot de trazabilidad" que se congela en cada certificado emitido.',
    },
    side: 'left',
  },
];
