import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './layouts/AdminLayout'
import { resourceConfigs } from './config/resources'
import { DashboardPage } from './pages/DashboardPage'
import { CrudResourcePage } from './pages/CrudResourcePage'
import { AcademicYearsPage } from './pages/AcademicYearsPage'
import { ClassesPage } from './pages/ClassesPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SemestersPage } from './pages/SemestersPage'
import { TeachersPage } from './pages/TeachersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/master/academic-years" element={<AcademicYearsPage />} />
          <Route path="/master/semesters" element={<SemestersPage />} />
          <Route
            path="/master/departments"
            element={<CrudResourcePage config={resourceConfigs.departments} />}
          />
          <Route
            path="/master/grade-levels"
            element={<CrudResourcePage config={resourceConfigs.gradeLevels} />}
          />
          <Route path="/master/classes" element={<ClassesPage />} />
          <Route
            path="/master/rooms"
            element={<CrudResourcePage config={resourceConfigs.rooms} />}
          />

          <Route path="/academic/teachers" element={<TeachersPage />} />
          <Route
            path="/academic/homeroom-assignments"
            element={<CrudResourcePage config={resourceConfigs.homeroomAssignments} />}
          />
          <Route
            path="/academic/subjects"
            element={<CrudResourcePage config={resourceConfigs.subjects} />}
          />
          <Route
            path="/academic/schedules"
            element={<CrudResourcePage config={resourceConfigs.schedules} />}
          />

          <Route
            path="/kesiswaan"
            element={
              <PlaceholderPage
                eyebrow="Kesiswaan"
                title="Modul kesiswaan siap disambungkan berikutnya."
                description="Backend student affairs belum kita aktifkan sepenuhnya, tetapi shell frontend dan pola CRUD yang sama sudah siap dipakai saat endpoint-nya selesai."
              />
            }
          />
          <Route
            path="/hubim"
            element={
              <PlaceholderPage
                eyebrow="HUBIM"
                title="Area HUBIM sudah punya tempat di layout."
                description="Begitu endpoint industri, prakerin, dan alumni selesai, kita tinggal menambahkan resource config baru tanpa mengubah shell utama."
              />
            }
          />
          <Route
            path="/announcements"
            element={
              <PlaceholderPage
                eyebrow="Pengumuman"
                title="Ruang pengumuman sudah disiapkan."
                description="Halaman ini bisa nanti dipakai untuk broadcast umum, pengumuman per unit, dan target role tertentu."
              />
            }
          />
          <Route
            path="/search-students"
            element={
              <PlaceholderPage
                eyebrow="Cari Siswa"
                title="Global student search akan sangat kuat saat modul siswa sudah penuh."
                description="Nanti halaman ini bisa menjadi agregator biodata, kelas aktif, absensi, pelanggaran, nilai, dan status alumni."
              />
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
