import {
  BookOpenCheck,
  Building2,
  ShieldAlert,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  School2,
  Search,
  Settings2,
  Users2,
} from 'lucide-react'
import type { ModuleCard, NavigationSection } from '../types/resources'

export const navigationSections: NavigationSection[] = [
  {
    label: 'Inti',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      {
        label: 'Kesiswaan',
        path: '/kesiswaan',
        icon: Users2,
        children: [
          { label: 'Students', path: '/student-affairs/students', icon: Users2 },
          { label: 'Enrollments', path: '/student-affairs/enrollments', icon: School2 },
          { label: 'Mutations', path: '/student-affairs/mutations', icon: Users2 },
          { label: 'Graduations', path: '/student-affairs/graduations', icon: GraduationCap },
          { label: 'Attendances', path: '/student-affairs/attendances', icon: BookOpenCheck },
          { label: 'Discipline', path: '/student-affairs/discipline', icon: ShieldAlert },
        ],
      },
      { label: 'HUBIM', path: '/hubim', icon: Building2 },
      { label: 'Pengumuman', path: '/announcements', icon: Megaphone },
      { label: 'Cari Siswa', path: '/search-students', icon: Search },
    ],
  },
  {
    label: 'Master',
    items: [
      { label: 'Academic Years', path: '/master/academic-years', icon: School2 },
      { label: 'Semesters', path: '/master/semesters', icon: School2 },
      { label: 'Departments', path: '/master/departments', icon: Settings2 },
      { label: 'Grade Levels', path: '/master/grade-levels', icon: Settings2 },
      { label: 'Classes', path: '/master/classes', icon: Settings2 },
      { label: 'Rooms', path: '/master/rooms', icon: Settings2 },
    ],
  },
  {
    label: 'Academic',
    items: [
      { label: 'Teachers', path: '/academic/teachers', icon: GraduationCap },
      {
        label: 'Homeroom Assignments',
        path: '/academic/homeroom-assignments',
        icon: GraduationCap,
      },
      { label: 'Subjects', path: '/academic/subjects', icon: BookOpenCheck },
      { label: 'Schedules', path: '/academic/schedules', icon: BookOpenCheck },
    ],
  },
]

export const dashboardCards: ModuleCard[] = [
  {
    title: 'Kurikulum',
    subtitle: 'Jembatan cepat ke teachers, subjects, schedules, dan wali kelas.',
    path: '/academic/teachers',
    accent: 'linear-gradient(135deg, #1ac4d6, #4ba8ff)',
    icon: BookOpenCheck,
    chips: ['Teachers', 'Subjects', 'Schedules'],
  },
  {
    title: 'Kesiswaan',
    subtitle: 'Gerbang cepat ke data siswa inti yang nanti menopang enrollment, absensi, dan disiplin.',
    path: '/kesiswaan',
    accent: 'linear-gradient(135deg, #4ba8ff, #87c6ff)',
    icon: Users2,
    chips: ['Siswa', 'Absensi', 'Disiplin'],
  },
  {
    title: 'HUBIM',
    subtitle: 'Tempat untuk perusahaan, prakerin, dan alumni saat modulnya aktif.',
    path: '/hubim',
    accent: 'linear-gradient(135deg, #60c14c, #99da5f)',
    icon: Building2,
    chips: ['Perusahaan', 'Prakerin', 'Alumni'],
  },
  {
    title: 'Pengaturan',
    subtitle: 'Master data inti seperti tahun ajaran, jurusan, tingkat, kelas, dan ruang.',
    path: '/master/academic-years',
    accent: 'linear-gradient(135deg, #ff6b5b, #ff986d)',
    icon: Settings2,
    chips: ['Master Data', 'Academic Years', 'Classes'],
  },
  {
    title: 'Pengumuman',
    subtitle: 'Slot untuk pengumuman lintas unit dan komunikasi terarah.',
    path: '/announcements',
    accent: 'linear-gradient(135deg, #ff986d, #ffb648)',
    icon: Megaphone,
    chips: ['Broadcast', 'Role Targeting'],
  },
  {
    title: 'Cari Siswa',
    subtitle: 'Kelak akan menjadi agregator biodata, kelas, nilai, dan riwayat siswa.',
    path: '/search-students',
    accent: 'linear-gradient(135deg, #4ba8ff, #8dd0ff)',
    icon: Search,
    chips: ['Global Search', 'Cross Module'],
  },
]
