# SMI-Frontend (SMI-ControlBAB)

Interfaz del inventario de **no perecederos** del Banco de Alimentos de Bogotá. El progreso y los supuestos se documentan en `../SMI-Backend/docs/`.

## Stack fijo
React 19 + Vite + react-router 7 + lucide-react. Despliegue automático en Vercel desde `main`. No migrar a Next.js.

## Comandos
- `npm run dev`: puerto 5173. Usa el backend de producción salvo que se defina `VITE_API_URL`.
- `npm run lint`, `npm run build`, `npm test` (node --test).

## Convenciones
- **Estilos:** van en `src/index.css`, con variables de tema y clases (`.card`, `.btn--primario`, `.badge--verde`…). Hay un solo tema (azul marino con tarjetas blancas) y contraste WCAG AA. No usar estilos de la plantilla de Vite.
- **Componentes:** usar los de `src/components/ui/`: PageHeader, Card, Campo, DataTable, Badge, ConfirmModal, Skeleton, EmptyState, ErrorState y SelectBuscable.
- **Diálogos:** nunca `alert`, `confirm` ni `prompt`. Usar `useConfirmar()` y `useAvisar()` de `src/lib/dialogos.js`.
- **API:** siempre con `pedirJSON` de `src/api.js`, que da mensajes de error en español, reintenta las consultas (GET) si el servidor está dormido y muestra el aviso de conexión.
- **Carga de datos:** `useCallback(() => pedirJSON(...).then(setX).catch(...))` y luego `useEffect(() => { cargar() }, [cargar])`. Así lo exige la regla de lint `set-state-in-effect`.
- **Formatos:** fechas, horas y números siempre con `src/lib/formato.js` (es-CO, America/Bogota, miles con punto).
- **Colores:** los de acciones y estados de SBO salen de `src/lib/tonos.js`.
- **Título de pestaña:** se define en `RUTAS` de `App.jsx`.

## No tocar
- `src/pages/InventarioMapa.jsx`: lo hace otro equipo.
- `src/hooks/useScanner.js` y `scanDetector.js`: guardados y desconectados. No integrarlos.
