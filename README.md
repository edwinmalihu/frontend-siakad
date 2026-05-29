# SIAKAD Frontend

Frontend admin panel untuk SIAKAD dibangun dengan React 19, TypeScript, Vite 8, dan React Router 7.

## Arsitektur

```
src/
├── main.tsx                → Root render: StrictMode, AuthProvider, BrowserRouter
├── App.tsx                 → Route definitions dengan role-based protection
├── index.css               → Design system (glassmorphism, CSS variables)
├── components/
│   ├── ImportExportPanel.tsx   → Import/export Excel dengan template download
│   ├── ImportResultModal.tsx   → Tampilan hasil import (success/skip/error)
│   └── ProtectedRoute.tsx      → Auth + role-based route guard
├── config/
│   ├── navigation.ts           → Sidebar navigation + dashboard cards
│   └── resources.tsx           → Resource CRUD configurations (18 resources)
├── contexts/
│   ├── AuthContext.tsx          → AuthProvider: login, logout, session bootstrap
│   └── useAuth.ts              → useAuth hook
├── layouts/
│   └── AdminLayout.tsx         → App shell: sidebar + topbar + content
├── lib/
│   ├── api.ts                  → Axios HTTP client, CRUD helpers
│   ├── auth-storage.ts         → localStorage token/user persistence
│   └── access-control.ts       → Role-based access checking
├── pages/                      → 37 halaman
│   ├── LoginPage.tsx           → Halaman login
│   ├── DashboardPage.tsx       → Dashboard utama
│   ├── CrudResourcePage.tsx    → Generic reusable CRUD page
│   ├── StudentsPage.tsx        → Data siswa
│   ├── TeachersPage.tsx        → Data guru
│   ├── AuditLogsPage.tsx       → Log audit
│   └── ... (37 total)
└── types/
    ├── auth.ts                 → AuthUser, LoginPayload types
    └── resources.ts            → ResourceConfig, NavigationItem types
```

## Dependensi

| Package | Version | Fungsi |
|---------|---------|--------|
| `react` | ^19.2.6 | UI library |
| `react-dom` | ^19.2.6 | React DOM renderer |
| `react-router-dom` | ^7.15.1 | Client-side routing |
| `axios` | ^1.16.1 | HTTP client |
| `lucide-react` | ^1.16.0 | Icon library |
| `typescript` | ^6.0.2 | Type checking |
| `vite` | ^8.0.12 | Build tool |

## Konfigurasi

Buat file `.env.local` di direktori `frontend/`:

```env
VITE_API_PROXY_TARGET=http://127.0.0.1:18080
VITE_APP_NAME=SIAKAD
```

- `VITE_API_PROXY_TARGET` — URL backend API (untuk Vite dev server proxy)
- `VITE_APP_NAME` — Nama aplikasi yang ditampilkan di UI

## Menjalankan

### Development

```bash
cd frontend
npm install
npm run dev
```

Server berjalan di `http://localhost:5173`. Vite dev server otomatis proxy `/api/*` ke backend.

### Build untuk Production

```bash
cd frontend
npm run build
```

Output dist/ di folder `frontend/dist/`.

### Docker

```bash
cd frontend
docker build -t siakad-frontend .
docker run -p 5173:80 siakad-frontend
```

## Routing & Role-Based Access

| Role | Akses Module |
|------|-------------|
| `admin` | Semua module + audit logs + user management |
| `academic` | Master data + Academic (guru, mapel, jadwal, nilai) |
| `student_affairs` | Kesiswaan (siswa, enrollment, kehadiran, disiplin) |
| `industry_relations` | HUBIM (perusahaan, magang, alumni) |
| `hubim` | HUBIM (sama dengan industry_relations) |
| `shared` | Pengumuman, pencarian siswa |

## Halaman Utama

| Halaman | Fungsi |
|---------|--------|
| Dashboard | Ringkasan data per module |
| Students | CRUD siswa + import/export Excel |
| Teachers | CRUD guru + import/export Excel |
| Subjects | CRUD mata pelajaran |
| Schedules | CRUD jadwal pelajaran |
| Student Grades | CRUD nilai siswa |
| Audit Logs | Monitoring aktivitas sistem |
| Roles/Permissions | Manajemen RBAC |

## Design System

- **Glassmorphism** — backdrop-filter blur
- **CSS Variables** — teal/sky/lime/coral/amber palette
- **Fonts** — IBM Plex Sans Condensed + Manrope
- **Responsive** — Breakpoints: 1160px, 900px, 640px
- **Mobile** — Sidebar toggle untuk layar kecil

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | Admin123! | Administrator |
