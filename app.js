/**
 * Modelo de datos mínimo para proyectos de reciclaje.
 * - Estados consistentes y legibles para SR (lectores de pantalla).
 * - Cada tarea requiere equipo de al menos 4 personas.
 * - Al validar el inicio, comienza una ventana de tiempo definida para terminar.
 */

export const TASK_STATES = Object.freeze({
  PENDING: 'pendiente',
  IN_PROGRESS: 'en progreso',
  DONE: 'completada',
});

export const projects = [
  {
    id: 'carton',
    name: 'Cartón y papel',
    focusArea: 'Centro de acopio',
    tasks: [
      {
        id: 'carton-recoger',
        title: 'Recoger',
        state: TASK_STATES.PENDING,
        responsible: 'María López',
        team: ['María López', 'Jesús Ramírez', 'Alicia Torres', 'David Cruz'],
        validatedAt: null,
        timeLimitHoursAfterValidation: 8,
        dueDate: '2024-11-01',
      },
      {
        id: 'carton-organizar',
        title: 'Organizar',
        state: TASK_STATES.PENDING,
        responsible: 'Carlos Méndez',
        team: ['Carlos Méndez', 'Juana Pérez', 'Rubén García', 'Paulina Ortega'],
        validatedAt: null,
        timeLimitHoursAfterValidation: 6,
        dueDate: '2024-11-02',
      },
      {
        id: 'carton-cortar',
        title: 'Cortar',
        state: TASK_STATES.IN_PROGRESS,
        responsible: 'Juana Pérez',
        team: ['Juana Pérez', 'Andrea Silva', 'Marco Luna', 'Sara Díaz'],
        validatedAt: '2024-10-18T09:00:00Z',
        timeLimitHoursAfterValidation: 5,
        dueDate: '2024-10-18',
      },
      {
        id: 'carton-pegar',
        title: 'Pegar',
        state: TASK_STATES.PENDING,
        responsible: 'Alicia Torres',
        team: ['Alicia Torres', 'Ernesto Aguilar', 'Brenda Flores', 'Óscar Neri'],
        validatedAt: null,
        timeLimitHoursAfterValidation: 4,
        dueDate: '2024-11-03',
      },
    ],
  },
  {
    id: 'pet',
    name: 'PET',
    focusArea: 'Aulas B y patios laterales',
    tasks: [
      {
        id: 'pet-recoger',
        title: 'Recoger',
        state: TASK_STATES.PENDING,
        responsible: 'Laura Sánchez',
        team: ['Laura Sánchez', 'Hugo Martínez', 'Ana Beltrán', 'Rafael Gómez'],
        validatedAt: null,
        timeLimitHoursAfterValidation: 8,
        dueDate: '2024-10-28',
      },
      {
        id: 'pet-lavar',
        title: 'Lavar',
        state: TASK_STATES.IN_PROGRESS,
        responsible: 'Hugo Martínez',
        team: ['Hugo Martínez', 'Itzel Ríos', 'Kevin Ávila', 'Daniela Vázquez'],
        validatedAt: '2024-10-17T15:00:00Z',
        timeLimitHoursAfterValidation: 6,
        dueDate: '2024-10-18',
      },
      {
        id: 'pet-organizar',
        title: 'Organizar',
        state: TASK_STATES.PENDING,
        responsible: 'Ana Beltrán',
        team: ['Ana Beltrán', 'Mario Pineda', 'Sofía Rangel', 'Luis Herrera'],
        validatedAt: null,
        timeLimitHoursAfterValidation: 5,
        dueDate: '2024-10-30',
      },
      {
        id: 'pet-compactar',
        title: 'Compactar',
        state: TASK_STATES.DONE,
        responsible: 'Kevin Ávila',
        team: ['Kevin Ávila', 'Itzel Ríos', 'Hugo Martínez', 'Daniela Vázquez'],
        validatedAt: '2024-10-15T10:00:00Z',
        timeLimitHoursAfterValidation: 7,
        dueDate: '2024-10-16',
      },
    ],
  },
  {
    id: 'composta',
    name: 'Composta',
    focusArea: 'Patios verdes y laboratorio',
    tasks: [
      {
        id: 'composta-recolectar',
        title: 'Recolectar',
        state: TASK_STATES.PENDING,
        responsible: 'Rosa Hernández',
        team: ['Rosa Hernández', 'Miguel Paredes', 'Elena Cruz', 'José Maldonado'],
        validatedAt: null,
        timeLimitHoursAfterValidation: 10,
        dueDate: '2024-11-05',
      },
      {
        id: 'composta-mezclar',
        title: 'Mezclar',
        state: TASK_STATES.PENDING,
        responsible: 'Elena Cruz',
        team: ['Elena Cruz', 'Liliana Ochoa', 'Fernando Vega', 'Patricia Ruiz'],
        validatedAt: null,
        timeLimitHoursAfterValidation: 8,
        dueDate: '2024-11-06',
      },
      {
        id: 'composta-remover',
        title: 'Remover',
        state: TASK_STATES.IN_PROGRESS,
        responsible: 'Miguel Paredes',
        team: ['Miguel Paredes', 'Ximena Soto', 'César León', 'Diana Mora'],
        validatedAt: '2024-10-17T12:30:00Z',
        timeLimitHoursAfterValidation: 6,
        dueDate: '2024-10-18',
      },
      {
        id: 'composta-hidratar',
        title: 'Hidratar',
        state: TASK_STATES.PENDING,
        responsible: 'Patricia Ruiz',
        team: ['Patricia Ruiz', 'José Maldonado', 'Araceli Vázquez', 'Carmen Figueroa'],
        validatedAt: null,
        timeLimitHoursAfterValidation: 5,
        dueDate: '2024-11-04',
      },
      {
        id: 'composta-empaquetar',
        title: 'Empaquetar',
        state: TASK_STATES.DONE,
        responsible: 'Liliana Ochoa',
        team: ['Liliana Ochoa', 'Fernando Vega', 'Patricia Ruiz', 'Araceli Vázquez'],
        validatedAt: '2024-10-10T08:00:00Z',
        timeLimitHoursAfterValidation: 4,
        dueDate: '2024-10-11',
      },
    ],
  },
];

export const validationWindowMessage =
  'Una vez validado el inicio de la tarea, comienza el conteo de tiempo disponible para terminarla.';

/**
 * Utilidad de referencia futura: obtiene tareas filtradas por estado.
 * Mantiene inmutabilidad retornando nuevas colecciones.
 */
export function filterTasksByState(state) {
  if (!Object.values(TASK_STATES).includes(state)) return [];
  return projects
    .map((project) => ({
      ...project,
      tasks: project.tasks.filter((task) => task.state === state),
    }))
    .filter((project) => project.tasks.length > 0);
}
