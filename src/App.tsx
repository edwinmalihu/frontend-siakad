import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './layouts/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { AcademicYearsPage } from './pages/AcademicYearsPage'
import { AttendancesPage } from './pages/AttendancesPage'
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { ClassesPage } from './pages/ClassesPage'
import { DepartmentsPage } from './pages/DepartmentsPage'
import { DisciplinePage } from './pages/DisciplinePage'
import { ExtracurricularPage } from './pages/ExtracurricularPage'
import { GradeLevelsPage } from './pages/GradeLevelsPage'
import { HomeroomAssignmentsPage } from './pages/HomeroomAssignmentsPage'
import { HubimCompaniesPage } from './pages/HubimCompaniesPage'
import { HubimInternshipsPage } from './pages/HubimInternshipsPage'
import { HubimAlumniPage } from './pages/HubimAlumniPage'
import { LoginPage } from './pages/LoginPage'
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
          <Route path="/student-affairs/extracurricular" element={<ExtracurricularPage />} />
          <Route path="/hubim" element={<Navigate to="/hubim/companies" replace />} />
          <Route path="/hubim/companies" element={<HubimCompaniesPage />} />
          <Route path="/hubim/internships" element={<HubimInternshipsPage />} />
          <Route path="/hubim/alumni" element={<HubimAlumniPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route
            path="/search-students"
            element={
              <div className="page-stack">
                <section className="page-header">
                  <div>
                    <p className="page-header__eyebrow">Cari Siswa</p>
                    <h1 className="page-header__title">Global student search akan sangat kuat saat modul siswa sudah penuh.</h1>
                    <p className="page-header__description">
                      Nanti halaman ini bisa menjadi agregator biodata, kelas aktif, absensi, pelanggaran, nilai, dan status alumni.
                    </p>
                  </div>
                </section>
                <section className="placeholder-card">
                  <strong>Tempat ini sudah disiapkan di layout.</strong>
                  Begitu backend modul pencarian siap, kita tinggal sambungkan query lintas modul dengan pola yang sama seperti halaman admin lain.
                </section>
              </div>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
