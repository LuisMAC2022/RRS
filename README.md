# Interfaz gamificada de gestión de proyectos (HTML5 Canvas)

Resumen compacto de tareas atómicas para construir la interfaz 2D accesible y eficiente que muestra el mapa simplificado de la FES Acatlán y gestiona proyectos (cartón/papel, PET, composta).

## Principios base
- HTML5 semántico con un solo `main`, `header`, `nav`, `aside` y `footer` claros.
- Accesibilidad WCAG 2.1 AA: skip link, foco visible, navegación por teclado, textos alternativos.
- Rendimiento: mínimo JS, redibujar canvas solo al cambiar el estado, assets ligeros.

## Backlog atómico
1. **Estructura inicial**
   - Crear `index.html` con `h1`, skip link y layout semántico (`header`, `nav`, `main`, `aside`, `footer`).
   - Definir `styles.css` básico con layout responsive y foco visible.
   - Enlazar `app.js` con `defer` y sin dependencias externas.
2. **Modelo de datos mínimo**
   - Declarar estructura en `app.js` para proyectos: cartón/papel, PET y composta con 3–5 tareas cada uno.
   - Añadir estados de tarea (`pendiente`, `en progreso`, `completada`) y asignar responsables/fechas.
3. **Render del mapa en canvas**
   - Dibujar fondo simplificado de la FES (zonas clave) usando shapes ligeros.
   - Crear hotspots por área (biblioteca, aulas, patios, centro de acopio) con paths cacheados.
4. **Interacción básica**
   - Habilitar selección de áreas con ratón y teclado; resaltar selección en canvas.
   - Mostrar en `aside` la lista de tareas filtradas por proyecto y área.
   - Proveer botones o selects accesibles para cambiar estado de tarea.
5. **Navegación y accesibilidad ampliada**
   - Implementar atajos de teclado para cambiar proyecto y recorrer áreas.
   - Añadir anuncios `aria-live` para cambios de estado y progreso.
   - Garantizar etiquetas y descripciones claras (aria-label solo cuando sea necesario).
6. **Persistencia ligera y feedback**
   - Guardar estado en `localStorage` (opt-in) y restaurar al cargar.
   - Registrar eventos recientes en el `footer` con actualización discreta.
7. **Progreso y gamificación**
   - Calcular barras/contadores de progreso por proyecto y global.
   - Diseñar esquema de puntos/insignias al completar tareas y hitos.
8. **Optimización y QA**
   - Reducir redibujos: solo en cambios de estado o interacciones.
   - Validar accesibilidad (teclado, foco, contrastes) y rendimiento básico (peso y FCP).
   - Preparar modo tabla/export para datos de tareas (fase posterior).
