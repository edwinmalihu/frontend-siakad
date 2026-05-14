type PlaceholderPageProps = {
  eyebrow: string
  title: string
  description: string
}

export function PlaceholderPage({ eyebrow, title, description }: PlaceholderPageProps) {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">{eyebrow}</p>
          <h1 className="page-header__title">{title}</h1>
          <p className="page-header__description">{description}</p>
        </div>
      </section>

      <section className="placeholder-card">
        <strong>Tempat ini sudah disiapkan di layout.</strong>
        Begitu backend modul terkait siap, kita tinggal tambahkan page config dan resource
        route dengan pola yang sama seperti halaman admin yang sudah hidup sekarang.
      </section>
    </div>
  )
}
