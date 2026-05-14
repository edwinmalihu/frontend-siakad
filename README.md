# Frontend SIAKAD

Frontend ini dibangun dengan `React + TypeScript + Vite` dan dipisahkan dari repo backend agar alur kerja UI dan API tetap rapi.

## Yang Sudah Disiapkan

- admin shell dengan sidebar dan topbar
- dashboard awal yang mengikuti arah visual mockup Anda
- halaman login admin yang terhubung ke backend auth
- halaman CRUD reusable untuk:
  - `academic_years`
  - `semesters`
  - `departments`
  - `grade_levels`
  - `classes`
  - `rooms`
  - `teachers`
  - `homeroom_assignments`
  - `subjects`
  - `schedules`
- Vite proxy ke backend lokal, jadi selama development frontend bisa memanggil API tanpa masalah CORS

## Menjalankan

1. Masuk ke folder frontend

```bash
cd frontend
```

2. Install dependency

```bash
npm install
```

3. Copy env example

```bash
cp .env.example .env
```

4. Pastikan backend Go berjalan di `http://127.0.0.1:18080`

5. Login menggunakan akun development berikut:

```text
username: admin
password: Admin123!
```

6. Jalankan frontend

```bash
npm run dev
```

Frontend akan berjalan di `http://127.0.0.1:5173`.

## Struktur Singkat

```text
src/
├── config
│   ├── navigation.ts
│   └── resources.tsx
├── components
│   └── ProtectedRoute.tsx
├── contexts
│   └── AuthContext.tsx
├── layouts
│   └── AdminLayout.tsx
├── lib
│   ├── api.ts
│   └── auth-storage.ts
├── pages
│   ├── CrudResourcePage.tsx
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   └── PlaceholderPage.tsx
└── types
    ├── auth.ts
    └── resources.ts
```

## Catatan

- Halaman CRUD memakai pola konfigurasi, jadi resource baru biasanya cukup ditambahkan di `src/config/resources.tsx`.
- Token login disimpan di `localStorage` dan otomatis dipakai untuk request `Bearer` ke backend.
- Modul seperti `Kesiswaan`, `HUBIM`, `Pengumuman`, dan `Cari Siswa` sudah punya slot di layout, walau endpoint backend-nya belum selesai.
