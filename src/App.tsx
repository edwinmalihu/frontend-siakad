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
import { SearchStudentsPage } from './pages/SearchStudentsPage'
import { SemestersPage } from './pages/SemestersPage'
import { StudentsPage } from './pages/StudentsPage'
import { StudentEnrollmentsPage } from './pages/StudentEnrollmentsPage'
import { StudentGraduationsPage } from './pages/StudentGraduationsPage'
import { StudentMutationsPage } from './pages/StudentMutationsPage'
import { SubjectsPage } from './pages/SubjectsPage'
import { AssessmentComponentsPage } from './pages/AssessmentComponentsPage'
import { StudentAssessmentsPage } from './pages/StudentAssessmentsPage'
import { StudentGradesPage } from './pages/StudentGradesPage'
import { TeachersPage } from './pages/TeachersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route element={<ProtectedRoute allowedRoleCodes={['academic']} />}>
            <Route path="/master/academic-years" element={<AcademicYearsPage />} />
            <Route path="/master/semesters" element={<SemestersPage />} />
            <Route path="/master/departments" element={<DepartmentsPage />} />
            <Route path="/master/grade-levels" element={<GradeLevelsPage />} />
            <Route path="/master/classes" element={<ClassesPage />} />
            <Route path="/master/rooms" element={<RoomsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoleCodes={['academic']} />}>
            <Route path="/academic/teachers" element={<TeachersPage />} />
            <Route
              path="/academic/homeroom-assignments"
              element={<HomeroomAssignmentsPage />}
            />
            <Route path="/academic/subjects" element={<SubjectsPage />} />
            <Route path="/academic/schedules" element={<SchedulesPage />} />
            <Route path="/academic/assessment-components" element={<AssessmentComponentsPage />} />
            <Route path="/academic/student-assessments" element={<StudentAssessmentsPage />} />
            <Route path="/academic/student-grades" element={<StudentGradesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoleCodes={['student_affairs']} />}>
            <Route path="/kesiswaan" element={<StudentsPage />} />
            <Route path="/student-affairs/students" element={<StudentsPage />} />
            <Route path="/student-affairs/enrollments" element={<StudentEnrollmentsPage />} />
            <Route path="/student-affairs/mutations" element={<StudentMutationsPage />} />
            <Route path="/student-affairs/graduations" element={<StudentGraduationsPage />} />
            <Route path="/student-affairs/attendances" element={<AttendancesPage />} />
            <Route path="/student-affairs/discipline" element={<DisciplinePage />} />
            <Route path="/student-affairs/extracurricular" element={<ExtracurricularPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoleCodes={['industry_relations', 'hubim']} />}>
            <Route path="/hubim" element={<Navigate to="/hubim/companies" replace />} />
            <Route path="/hubim/companies" element={<HubimCompaniesPage />} />
            <Route path="/hubim/internships" element={<HubimInternshipsPage />} />
            <Route path="/hubim/alumni" element={<HubimAlumniPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoleCodes={['shared', 'student_affairs', 'academic', 'industry_relations', 'hubim']} />}>
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/search-students" element={<SearchStudentsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
