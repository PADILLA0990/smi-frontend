// Tarjeta blanca con cabecera opcional (título, subtítulo y acciones)
export default function Card({ titulo, icono: Icono, subtitulo, acciones, children, className = '', ...resto }) {
  const conCabecera = titulo || acciones
  return (
    <section className={`card ${className}`} {...resto}>
      {conCabecera && (
        <div className="card__cabecera">
          <div>
            {titulo && <h2 className="card__titulo">{Icono && <Icono size={20} aria-hidden="true" />}{titulo}</h2>}
            {subtitulo && <p className="card__subtitulo">{subtitulo}</p>}
          </div>
          {acciones}
        </div>
      )}
      {children}
    </section>
  )
}
