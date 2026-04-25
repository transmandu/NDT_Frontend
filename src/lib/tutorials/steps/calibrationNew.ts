import type { TutorialStep } from '../types';

export const calibrationNewSteps: TutorialStep[] = [
  {
    element: '#tour-cal-step1',
    quick: {
      title: '1️⃣ Configuración Inicial',
      description: 'Selecciona el instrumento a calibrar, el patrón de referencia y las condiciones ambientales.',
    },
    extended: {
      title: '1️⃣ Paso 1 — Configuración del Ensayo',
      description: 'Antes de calibrar, debes establecer:\n\n• **Instrumento**: El equipo que vas a calibrar\n• **Patrón**: La referencia contra la cual comparar\n• **Condiciones ambientales**: Temperatura, humedad y presión del laboratorio\n\nEstas condiciones afectan directamente las mediciones y deben registrarse según ISO 17025 §7.7.1. El sistema carga automáticamente el procedimiento de calibración (schema) según la categoría del instrumento.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-cal-instrument',
    quick: {
      title: '🔧 Selección de Instrumento',
      description: 'Elige el instrumento que vas a calibrar de la lista de equipos registrados.',
    },
    extended: {
      title: '🔧 Instrumento a Calibrar',
      description: 'Selecciona el equipo que someterás a calibración. Al seleccionarlo, el sistema:\n\n1. Carga sus especificaciones técnicas (rango, resolución, EMP)\n2. Busca el procedimiento de calibración correspondiente a su categoría\n3. Genera las tablas de medición dinámicas según el schema del procedimiento\n\nSolo aparecen instrumentos con estado "activo". Si no ves un instrumento, primero debes registrarlo en la sección de Instrumentos.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-cal-standard',
    quick: {
      title: '📐 Selección de Patrón',
      description: 'Elige el patrón de referencia certificado que usarás para la calibración.',
    },
    extended: {
      title: '📐 Patrón de Referencia — Trazabilidad',
      description: 'El patrón es el "valor verdadero" contra el cual comparas las lecturas del instrumento. Debes seleccionar uno que:\n\n• Tenga **certificado vigente** (no vencido)\n• Sea de la **misma magnitud** que el instrumento (mm, g, bar...)\n• Tenga **incertidumbre conocida** para el cálculo GUM\n\nLa incertidumbre del patrón (u_B,pat) es una de las contribuciones principales al presupuesto de incertidumbre del resultado.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-cal-ambient',
    quick: {
      title: '🌡️ Condiciones Ambientales',
      description: 'Registra temperatura, humedad y presión atmosférica del laboratorio durante la calibración.',
    },
    extended: {
      title: '🌡️ Condiciones Ambientales — ISO 17025 §7.7.1',
      description: 'Las condiciones ambientales afectan las mediciones y deben cumplir los rangos del procedimiento:\n\n• **Temperatura**: Típicamente 20°C ± 2°C en laboratorios metrológicos. Las variaciones causan dilatación/contracción en instrumentos dimensionales.\n• **Humedad relativa**: Debe estar entre 40-60% para evitar condensación y oxidación\n• **Presión atmosférica**: Relevante para manómetros y balanzas (empuje de Arquímedes)\n\nEl sistema captura estos valores del clima en tiempo real como referencia, pero el técnico debe medirlos con los instrumentos ambientales del laboratorio.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-cal-dates',
    quick: {
      title: '📅 Fechas de Calibración',
      description: 'Fecha en que se realizó la calibración y fecha sugerida para la próxima.',
    },
    extended: {
      title: '📅 Fechas — Intervalo de Calibración',
      description: 'Dos fechas fundamentales:\n\n• **Fecha de calibración**: Día exacto en que se realizaron las mediciones\n• **Próxima calibración**: Fecha sugerida para recalibrar. El intervalo depende de:\n  - Frecuencia de uso del instrumento\n  - Estabilidad histórica (drift)\n  - Requisitos del cliente\n  - Condiciones de uso y almacenamiento\n\nAmbas fechas se imprimen en el certificado oficial. El sistema alertará cuando se acerque la fecha de recalibración.',
    },
    side: 'bottom',
  },
  {
    element: '#tour-cal-observations',
    quick: {
      title: '📝 Observaciones',
      description: 'Campo libre para que el técnico registre comentarios sobre la calibración.',
    },
    extended: {
      title: '📝 Observaciones del Técnico — ISO 7.8.2.j',
      description: 'Aquí puedes documentar cualquier situación relevante durante la calibración:\n\n• Anomalías observadas en el instrumento\n• Condiciones especiales de la medición\n• Ajustes realizados antes de calibrar\n• Estado visual del equipo (golpes, desgaste)\n• Cualquier desviación del procedimiento estándar\n\nEstas observaciones aparecerán en la Sección 8 del certificado de calibración y son parte del registro de trazabilidad ISO 17025.',
    },
    side: 'top',
  },
  {
    element: '#tour-cal-step2',
    quick: {
      title: '2️⃣ Tablas de Medición',
      description: 'Aquí ingresas las lecturas de calibración comparando el patrón con el instrumento.',
    },
    extended: {
      title: '2️⃣ Paso 2 — Registro de Mediciones',
      description: 'Las tablas de medición son generadas automáticamente según el procedimiento de calibración del instrumento. Para cada punto de calibración:\n\n1. **Coloca el patrón** en el valor nominal indicado (ej: 25.000 mm)\n2. **Lee el instrumento** bajo calibración (ej: 25.015 mm)\n3. **Repite** la medición N veces (según el procedimiento, típicamente 3-5 veces)\n\nEl sistema calculará automáticamente:\n• **Error (E)** = Lectura instrumento - Valor patrón\n• **Incertidumbre combinada (u_c)** usando GUM\n• **Incertidumbre expandida (U)** = k × u_c\n• **Conformidad**: |E| + U ≤ EMP',
    },
    side: 'top',
  },
  {
    element: '#tour-cal-submit',
    quick: {
      title: '📤 Enviar a Revisión',
      description: 'Envía las mediciones al sistema para cálculo automático y revisión del auditor.',
    },
    extended: {
      title: '📤 Enviar — Flujo de Aprobación',
      description: 'Al enviar, el sistema ejecuta la Strategy de cálculo del procedimiento:\n\n1. **Calcula** todos los errores, correcciones e incertidumbres\n2. **Evalúa** conformidad contra el EMP del instrumento\n3. **Congela** un snapshot de los patrones utilizados\n4. **Envía** la sesión al auditor para revisión\n\nEl auditor revisará los resultados en el Centro de Aprobación y decidirá si aprueba (generando el certificado) o rechaza (devolviendo al técnico con observaciones).',
    },
    side: 'top',
  },
];
