// Bloques grises animados mientras cargan los datos
export function Skeleton({ ancho = '100%', alto = 14 }) {
  return <span className="skeleton" style={{ width: ancho, height: alto }} aria-hidden="true" />
}

export function SkeletonTabla({ filas = 5, columnas = 5 }) {
  return (
    <div role="status" aria-label="Cargando datos">
      {Array.from({ length: filas }, (_, f) => (
        <div key={f} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--linea)' }}>
          {Array.from({ length: columnas }, (_, c) => <Skeleton key={c} ancho={`${100 / columnas}%`} />)}
        </div>
      ))}
    </div>
  )
}
