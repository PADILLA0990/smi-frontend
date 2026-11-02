# SMI-ControlBAB · Frontend

Interfaz del inventario de **no perecederos** del Banco de Alimentos de Bogotá: inventario y codificación, ingresos y salidas por documento, solicitudes SBO, novedades y trazabilidad, Mapa de Bodega, indicadores y conciliación.

- Backend y documentación compartida: repositorio `SMI-Backend` (`docs/API.md`, `docs/PROGRESO.md`, `docs/SUPUESTOS.md`, `docs/GUIA-PRUEBAS.md`).
- Convenciones de código: [`CLAUDE.md`](CLAUDE.md).

## Stack

React 19 · Vite · react-router 7 · lucide-react · Recharts (solo en Indicadores, con carga diferida). Despliegue automático en Vercel desde `main`.

## Uso local

```bash
npm install
npm run dev        # http://localhost:5173; /api va a VITE_PROXY_API (por defecto http://localhost:3000)
```

Para trabajar contra el esquema de pruebas, levante el backend con `npm run dev:pruebas` (puerto 3001) y use `VITE_PROXY_API=http://localhost:3001 npm run dev`.

## Comandos

| Comando | Uso |
|---|---|
| `npm run lint` | ESLint |
| `npm test` | Pruebas unitarias de `src/lib` (node --test) |
| `npm run build` | Compilación de producción en `dist/` |

## Despliegue

Push a `main`. `vercel.json` reenvía `/api` a Render, así que la cookie de sesión es del mismo dominio. Si el cambio depende de una migración o de rutas nuevas del backend, primero se despliega el backend y se confirma en `GET /version`.

La sesión vive solo en memoria (el token nunca va a localStorage); los permisos se ocultan en la interfaz pero siempre los decide el backend.
