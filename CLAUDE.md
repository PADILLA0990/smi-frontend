# SMI-Frontend (SMI-ControlBAB)

Interfaz del inventario de **no perecederos** del Banco de Alimentos de Bogotá. El progreso y los supuestos se documentan en `../SMI-Backend/docs/`.

## Stack fijo
React 19 + Vite + react-router 7 + lucide-react. Despliegue automático en Vercel desde `main`. No migrar a Next.js.

## Comandos
- `npm run dev`: puerto 5173. El proxy de Vite envía `/api` a `VITE_PROXY_API` (por defecto http://localhost:3000). En producción, `vercel.json` reenvía `/api` a Render.
- `npm run lint`, `npm run build`, `npm test` (node --test).

## Convenciones
- **Estilos:** van en `src/index.css`, con variables de tema y clases (`.card`, `.btn--primario`, `.badge--verde`…). Hay un solo tema (azul marino con tarjetas blancas) y contraste WCAG AA. No usar estilos de la plantilla de Vite.
- **Componentes:** usar los de `src/components/ui/`: PageHeader, Card, Campo, DataTable, Badge, ConfirmModal, Skeleton, EmptyState, ErrorState y SelectBuscable.
- **Diálogos:** nunca `alert`, `confirm` ni `prompt`. Usar `useConfirmar()` y `useAvisar()` de `src/lib/dialogos.js`.
- **API:** siempre con `pedirJSON` de `src/api.js`. Da mensajes de error en español, envía el token, renueva la sesión ante un 401, reintenta las consultas (GET) si el servidor está dormido y muestra el aviso de conexión.
- **Sesión y permisos:** usar `useSesion()` y `usePuede()` de `src/lib/auth.js`.
  - El token vive solo en memoria (`src/lib/sesion.js`). Nunca guardarlo en localStorage.
  - Ocultar en la interfaz lo que el rol no puede hacer. Quien decide siempre es el backend.
  - Cada ruta nueva lleva su permiso en `RUTAS` de `App.jsx`.
- **Catálogos:** `useLista(ruta)` y `useOpciones()` de `src/lib/catalogos.js`. Los formularios usan selects del catálogo (activos), nunca texto libre para categoría, ubicación, motivo u organización.
- **Carga de datos:** `useCallback(() => pedirJSON(...).then(setX).catch(...))` y luego `useEffect(() => { cargar() }, [cargar])`. Así lo exige la regla de lint `set-state-in-effect`.
- **Listas grandes (inventario, historial):** `useConsultaPaginada(ruta, parametros)` de `src/lib/paginado.js` con `DataTable` en modo `servidor` (la API filtra, ordena y pagina). Si se agregan columnas a una tabla con columnas guardadas, cambiar su `idTabla` (p. ej. `inventario-v2`) para que nadie las tenga ocultas.
- **Documentos (ingresos y salidas):** las líneas se calculan y validan con `src/lib/documentos.js`. Los formularios están en `src/pages/movimientos/` y el comprobante imprimible en `src/pages/Comprobante.jsx` (`/documentos/:id`). Lo que no se imprime lleva la clase `.no-imprimir`.
- **Solicitudes SBO:** `src/pages/Solicitudes.jsx` reúne `src/pages/solicitudes/` (FormSolicitud, DetalleSolicitud, ListaSolicitudes). Los estados, las acciones y los textos calculados están en `src/lib/solicitudes.js`. La remisión imprimible está en `src/pages/Remision.jsx` (`/solicitudes/:codigo/remision`). `/solicitudes?codigo=` abre el detalle.
- **Dashboard:** `src/pages/Dashboard.jsx` lee todo de `GET /api/dashboard`. Las alertas enlazan a listas filtradas por URL: el Inventario lee `?q`, `?sinUbicar=1` y `?bajoMinimo=1`, y Solicitudes lee `?codigo`, `?estado`, `?atrasada=1` y `?porVencer=1`.
- **Mapa de Bodega:** `src/pages/InventarioMapa.jsx` lee `GET /api/mapa`. `?ubicacion=` elige el hueco y `?q=` busca. Las estanterías se administran en `src/pages/configuracion/PestanaEstanterias.jsx` (Configuración → Estanterías). "Ingresar aquí" abre `/movimientos?pestana=ingreso&ubicacion=`. Sin capacidad ni porcentajes.
- **Codificación:** `src/pages/configuracion/PestanaCodificacion.jsx` administra el árbol. En `ModalProductoNuevo.jsx` una categoría con letra pide subcategoría y nivel 3, y el código sale de `/api/codificacion/siguiente` (o de `codigoHermano` para otra condición). `PATRON_CODIGO` está en `src/lib/documentos.js`. Un producto codificado no cambia de categoría ni condición en el Inventario.
- **Novedades y trazabilidad (Fase E):** `src/pages/Novedades.jsx` (filtros por URL `?tipo`, `?sbo`, exportación CSV con `aCSV` de `src/lib/novedades.js`) y `src/pages/Trazabilidad.jsx` (`?codigo=`). En el detalle de la SBO, `src/pages/solicitudes/ModalNovedad.jsx` registra novedad, sustitución o devolución por ítem.
- **Indicadores (Fase F):** `src/pages/Indicadores.jsx` (carga diferida con `lazy` porque trae Recharts). URL `?id&anio&mes`. Colores de las series: la paleta `SERIES` validada, en orden fijo; cada gráfico lleva tabla de datos.
- **Conciliación (Fase G):** `src/pages/Conciliacion.jsx` (`?conteo=` abre el detalle). Contar: `movimientos:registrar`; aprobar, anular y ver la consistencia: `conciliacion:aprobar`.
- **Formatos:** fechas, horas y números siempre con `src/lib/formato.js` (es-CO, America/Bogota, miles con punto).
- **Colores:** los de acciones y estados de SBO salen de `src/lib/tonos.js`.
- **Título de pestaña:** se define en `RUTAS` de `App.jsx`.

## No tocar
- `src/hooks/useScanner.js` y `scanDetector.js`: guardados y desconectados. No integrarlos.
