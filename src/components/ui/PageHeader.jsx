// Encabezado de página: ícono, título, subtítulo y acciones a la derecha
export default function PageHeader({ icono: Icono, titulo, subtitulo, acciones }) {
  return (
    <header className="page-header">
      <div className="page-header__titulo">
        {Icono && <div className="page-header__icono" aria-hidden="true"><Icono size={22} /></div>}
        <div>
          <h1>{titulo}</h1>
          {subtitulo && <p className="page-header__subtitulo">{subtitulo}</p>}
        </div>
      </div>
      {acciones && <div className="page-header__acciones">{acciones}</div>}
    </header>
  )
}
