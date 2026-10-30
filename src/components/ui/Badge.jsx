// Etiqueta de color. Tonos: verde, naranja, azul, morado, rojo, gris, ambar, cian, indigo (ver lib/tonos.js)
export default function Badge({ tono = 'gris', children, title }) {
  return <span className={`badge badge--${tono}`} title={title}>{children}</span>
}
