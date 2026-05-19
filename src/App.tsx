import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './layouts/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { AcademicYearsPage } from './pages/AcademicYearsPage'
import { AttendancesPage } from './pages/AttendancesPage'
import { ClassesPage } from './pages/ClassesPage'
import { DepartmentsPage } from './pages/DepartmentsPage'
import { DisciplinePage } from './pages/DisciplinePage'
import { GradeLevelsPage } from './pages/GradeLevelsPage'
import { HomeroomAssignmentsPage } from './pages/HomeroomAssignmentsPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RoomsPage } from './pages/RoomsPage'
import { SchedulesPage } from './pages/SchedulesPage'
import { SemestersPage } from './pages/SemestersPage'
import { StudentsPage } from './pages/StudentsPage'
import { StudentEnrollmentsPage } from './pages/StudentEnrollmentsPage'
import { StudentGraduationsPage } from './pages/StudentGraduationsPage'
import { StudentMutationsPage } from './pages/StudentMutationsPage'
import { SubjectsPage } from './pages/SubjectsPage'
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
          <Route path="/master/departments" element={<DepartmentsPage />} />
          <Route path="/master/grade-levels" element={<GradeLevelsPage />} />
          <Route path="/master/classes" element={<ClassesPage />} />
          <Route path="/master/rooms" element={<RoomsPage />} />

          <Route path="/academic/teachers" element={<TeachersPage />} />
          <Route
            path="/academic/homeroom-assignments"
            element={<HomeroomAssignmentsPage />}
          />
          <Route path="/academic/subjects" element={<SubjectsPage />} />
          <Route path="/academic/schedules" element={<SchedulesPage />} />

          <Route path="/kesiswaan" element={<StudentsPage />} />
          <Route path="/student-affairs/students" element={<StudentsPage />} />
          <Route path="/student-affairs/enrollments" element={<StudentEnrollmentsPage />} />
          <Route path="/student-affairs/mutations" element={<StudentMutationsPage />} />
          <Route path="/student-affairs/graduations" element={<StudentGraduationsPage />} />
          <Route path="/student-affairs/attendances" element={<AttendancesPage />} />
          <Route path="/student-affairs/discipline" element={<DisciplinePage />} />
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
