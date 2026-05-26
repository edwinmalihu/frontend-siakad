export function AccessDeniedPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">Akses Ditolak</p>
          <h1 className="page-header__title">Anda tidak punya hak untuk membuka halaman ini.</h1>
          <p className="page-header__description">
            Coba gunakan akun dengan role yang sesuai, atau minta administrator menambahkan akses untuk unit kerja Anda.
          </p>
        </div>
      </section>

      <section className="placeholder-card">
        <strong>Role guard sudah aktif.</strong>
        Menu dan route sekarang mulai mengikuti role code dari session login, jadi area Kesiswaan, Akademik, dan HUBIM bisa dipisah lebih jelas.
      </section>
    </div>
  )
}
