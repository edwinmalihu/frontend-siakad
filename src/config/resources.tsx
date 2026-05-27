import {
  BookOpenCheck,
  CalendarRange,
  ClipboardCheck,
  DoorOpen,
  FolderKanban,
  GraduationCap,
  Layers3,
  LayoutList,
  MapPinned,
  Shield,
  Users2,
} from 'lucide-react'
import type { ResourceConfig, ResourceRecord } from '../types/resources'

function statusBadge(value: unknown) {
  const normalized = String(value).toLowerCase()
  if (normalized === 'active' || normalized === 'true') {
    return <span className="inline-status inline-status--active">Active</span>
  }

  if (normalized === 'male') {
    return <span className="inline-status inline-status--male">Male</span>
  }

  if (normalized === 'female') {
    return <span className="inline-status inline-status--female">Female</span>
  }

  if (normalized === 'yes') {
    return <span className="inline-status inline-status--yes">Ya</span>
  }

  return <span className="inline-status inline-status--inactive">{String(value)}</span>
}

function softBadge(value: string) {
  return <span className="inline-status inline-status--soft">{value}</span>
}

function classOptionLabel(item: ResourceRecord) {
  return `${item.name} · ${item.department_code} ${item.grade_level_code} · ${item.academic_year_name}`
}

export const resourceConfigs: Record<string, ResourceConfig> = {
  academicYears: {
    key: 'academic-years',
    route: '/master/academic-years',
    title: 'Academic Years',
    eyebrow: 'Master Data',
    description: 'Kelola periode tahun ajaran aktif dan historis yang dipakai lintas modul akademik.',
    endpoint: '/master/academic-years',
    searchPlaceholder: 'Cari nama tahun ajaran…',
    icon: CalendarRange,
    accent: 'linear-gradient(135deg, #1ac4d6, #4ba8ff)',
    initialValues: {
      name: '',
      start_date: '',
      end_date: '',
      is_active: false,
    },
    columns: [
      { key: 'name', header: 'Year', render: (item) => <div className="cell-title">{String(item.name ?? '-')}</div> },
      { key: 'start_date', header: 'Start Date' },
      { key: 'end_date', header: 'End Date' },
      {
        key: 'is_active',
        header: 'Status',
        render: (item) =>
          item.is_active ? statusBadge('active') : <span className="inline-status inline-status--inactive">Inactive</span>,
      },
    ],
    fields: [
      { name: 'name', label: 'Academic Year Name', type: 'text', required: true, placeholder: '2026/2027' },
      { name: 'start_date', label: 'Start Date', type: 'date', required: true },
      { name: 'end_date', label: 'End Date', type: 'date', required: true },
      { name: 'is_active', label: 'Set as active academic year', type: 'checkbox' },
    ],
  },
  semesters: {
    key: 'semesters',
    route: '/master/semesters',
    title: 'Semesters',
    eyebrow: 'Master Data',
    description: 'Simpan semester per tahun ajaran dan tandai semester aktif yang sedang berjalan.',
    endpoint: '/master/semesters',
    searchPlaceholder: 'Cari semester atau kode…',
    icon: CalendarRange,
    accent: 'linear-gradient(135deg, #4ba8ff, #1ac4d6)',
    initialValues: {
      academic_year_id: '',
      name: '',
      code: '',
      is_active: false,
    },
    columns: [
      { key: 'code', header: 'Code', render: (item) => softBadge(String(item.code ?? '-')) },
      { key: 'name', header: 'Semester' },
      { key: 'academic_year', header: 'Academic Year' },
      {
        key: 'is_active',
        header: 'Status',
        render: (item) =>
          item.is_active ? statusBadge('active') : <span className="inline-status inline-status--inactive">Inactive</span>,
      },
    ],
    fields: [
      {
        name: 'academic_year_id',
        label: 'Academic Year',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/academic-years',
        getOptionLabel: (item) => String(item.name ?? '-'),
        valueType: 'number',
      },
      { name: 'name', label: 'Semester Name', type: 'text', required: true, placeholder: 'Semester Ganjil' },
      { name: 'code', label: 'Semester Code', type: 'text', required: true, placeholder: 'GANJIL' },
      { name: 'is_active', label: 'Set as active semester', type: 'checkbox' },
    ],
  },
  departments: {
    key: 'departments',
    route: '/master/departments',
    title: 'Departments',
    eyebrow: 'Master Data',
    description: 'Atur jurusan atau kompetensi keahlian sebagai basis relasi untuk classes dan subjects.',
    endpoint: '/master/departments',
    searchPlaceholder: 'Cari kode atau nama jurusan…',
    icon: FolderKanban,
    accent: 'linear-gradient(135deg, #60c14c, #8ed85d)',
    initialValues: {
      code: '',
      name: '',
      program_name: '',
      field_name: '',
      description: '',
    },
    columns: [
      { key: 'code', header: 'Code', render: (item) => softBadge(String(item.code ?? '-')) },
      { key: 'name', header: 'Department' },
      { key: 'program_name', header: 'Program' },
      { key: 'field_name', header: 'Field' },
    ],
    fields: [
      { name: 'code', label: 'Department Code', type: 'text', required: true, placeholder: 'RPL' },
      { name: 'name', label: 'Department Name', type: 'text', required: true, placeholder: 'Rekayasa Perangkat Lunak' },
      { name: 'program_name', label: 'Program Name', type: 'text', placeholder: 'Teknik Informatika' },
      { name: 'field_name', label: 'Field Name', type: 'text', placeholder: 'Software Engineering' },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        fullWidth: true,
        placeholder: 'Catatan singkat tentang jurusan ini',
      },
    ],
  },
  gradeLevels: {
    key: 'grade-levels',
    route: '/master/grade-levels',
    title: 'Grade Levels',
    eyebrow: 'Master Data',
    description: 'Susun tingkat belajar seperti X, XI, XII agar class dan subject punya struktur yang konsisten.',
    endpoint: '/master/grade-levels',
    searchPlaceholder: 'Cari kode atau nama tingkat…',
    icon: Layers3,
    accent: 'linear-gradient(135deg, #ffb648, #ff986d)',
    initialValues: {
      code: '',
      name: '',
      sort_order: '',
    },
    columns: [
      { key: 'code', header: 'Code', render: (item) => softBadge(String(item.code ?? '-')) },
      { key: 'name', header: 'Level Name' },
      { key: 'sort_order', header: 'Sort Order' },
    ],
    fields: [
      { name: 'code', label: 'Level Code', type: 'text', required: true, placeholder: 'X' },
      { name: 'name', label: 'Level Name', type: 'text', required: true, placeholder: 'Kelas 10' },
      { name: 'sort_order', label: 'Sort Order', type: 'number', required: true, min: 0, valueType: 'number' },
    ],
  },
  classes: {
    key: 'classes',
    route: '/master/classes',
    title: 'Classes',
    eyebrow: 'Master Data',
    description: 'Bangun struktur kelas aktif per tahun ajaran, jurusan, dan tingkat untuk kebutuhan akademik harian.',
    endpoint: '/master/classes',
    searchPlaceholder: 'Cari kelas atau relasi master…',
    icon: LayoutList,
    accent: 'linear-gradient(135deg, #1ac4d6, #60c14c)',
    initialValues: {
      academic_year_id: '',
      department_id: '',
      grade_level_id: '',
      name: '',
      is_active: true,
    },
    columns: [
      { key: 'name', header: 'Class', render: (item) => <div className="cell-title">{String(item.name ?? '-')}</div> },
      { key: 'academic_year_name', header: 'Academic Year' },
      { key: 'department_name', header: 'Department' },
      { key: 'grade_level_name', header: 'Grade Level' },
      {
        key: 'is_active',
        header: 'Status',
        render: (item) =>
          item.is_active ? statusBadge('active') : <span className="inline-status inline-status--inactive">Inactive</span>,
      },
    ],
    fields: [
      {
        name: 'academic_year_id',
        label: 'Academic Year',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/academic-years',
        getOptionLabel: (item) => String(item.name ?? '-'),
        valueType: 'number',
      },
      {
        name: 'department_id',
        label: 'Department',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/departments',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'grade_level_id',
        label: 'Grade Level',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/grade-levels',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      { name: 'name', label: 'Class Name', type: 'text', required: true, placeholder: 'A' },
      { name: 'is_active', label: 'Class is active', type: 'checkbox', fullWidth: true },
    ],
  },
  rooms: {
    key: 'rooms',
    route: '/master/rooms',
    title: 'Rooms',
    eyebrow: 'Master Data',
    description: 'Kelola ruang kelas, laboratorium, atau ruang praktik yang dipakai untuk penjadwalan.',
    endpoint: '/master/rooms',
    searchPlaceholder: 'Cari kode, nama, atau tipe ruang…',
    icon: DoorOpen,
    accent: 'linear-gradient(135deg, #4ba8ff, #82d6ff)',
    initialValues: {
      code: '',
      name: '',
      type: '',
      capacity: '',
    },
    columns: [
      { key: 'code', header: 'Code', render: (item) => softBadge(String(item.code ?? '-')) },
      { key: 'name', header: 'Room Name' },
      { key: 'type', header: 'Type' },
      { key: 'capacity', header: 'Capacity' },
    ],
    fields: [
      { name: 'code', label: 'Room Code', type: 'text', required: true, placeholder: 'LAB-01' },
      { name: 'name', label: 'Room Name', type: 'text', required: true, placeholder: 'Laboratorium 1' },
      { name: 'type', label: 'Room Type', type: 'text', placeholder: 'computer_lab' },
      { name: 'capacity', label: 'Capacity', type: 'number', nullable: true, min: 0, valueType: 'number' },
    ],
  },
  teachers: {
    key: 'teachers',
    route: '/academic/teachers',
    title: 'Teachers',
    eyebrow: 'Academic',
    description: 'Simpan profil pengajar lengkap agar jadwal, wali kelas, dan penugasan akademik saling terhubung.',
    endpoint: '/academic/teachers',
    searchPlaceholder: 'Cari nama, NIP, NUPTK, email, atau telepon…',
    icon: GraduationCap,
    accent: 'linear-gradient(135deg, #60c14c, #1ac4d6)',
    initialValues: {
      nip: '',
      nuptk: '',
      full_name: '',
      gender: '',
      address: '',
      phone: '',
      email: '',
      employment_status: '',
      position: '',
      photo_url: '',
      status: 'active',
    },
    columns: [
      {
        key: 'full_name',
        header: 'Teacher',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.full_name ?? '-')}</div>
            <div className="cell-subtitle">{String(item.position ?? 'Tanpa posisi')}</div>
          </>
        ),
      },
      { key: 'nip', header: 'NIP', render: (item) => softBadge(String(item.nip ?? '-')) },
      { key: 'gender', header: 'Gender', render: (item) => statusBadge(String(item.gender ?? 'soft')) },
      { key: 'employment_status', header: 'Employment' },
      { key: 'status', header: 'Status', render: (item) => statusBadge(String(item.status ?? '-')) },
    ],
    fields: [
      { name: 'nip', label: 'NIP', type: 'text', placeholder: '198901012015011001' },
      { name: 'nuptk', label: 'NUPTK', type: 'text', placeholder: '1234567890123456' },
      { name: 'full_name', label: 'Full Name', type: 'text', required: true, placeholder: 'Budi Santoso' },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        options: [
          { label: 'Pilih gender', value: '' },
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ],
      },
      { name: 'phone', label: 'Phone', type: 'text', placeholder: '081234567890' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'budi.santoso@example.com' },
      { name: 'employment_status', label: 'Employment Status', type: 'text', placeholder: 'permanent' },
      { name: 'position', label: 'Position', type: 'text', placeholder: 'Guru Matematika' },
      { name: 'photo_url', label: 'Photo URL', type: 'text', placeholder: 'https://example.com/photo.jpg' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
      },
      {
        name: 'address',
        label: 'Address',
        type: 'textarea',
        fullWidth: true,
        placeholder: 'Alamat guru',
      },
    ],
  },
  homeroomAssignments: {
    key: 'homeroom-assignments',
    route: '/academic/homeroom-assignments',
    title: 'Homeroom Assignments',
    eyebrow: 'Academic',
    description: 'Tetapkan wali kelas per kelas, tahun ajaran, dan semester dengan aturan bentrok yang tegas.',
    endpoint: '/academic/homeroom-assignments',
    searchPlaceholder: 'Cari guru, kelas, tahun ajaran, atau semester…',
    icon: Users2,
    accent: 'linear-gradient(135deg, #ff6b5b, #ffb648)',
    initialValues: {
      teacher_id: '',
      class_id: '',
      academic_year_id: '',
      semester_id: '',
    },
    columns: [
      { key: 'teacher_full_name', header: 'Teacher', render: (item) => <div className="cell-title">{String(item.teacher_full_name ?? '-')}</div> },
      { key: 'class_name', header: 'Class' },
      { key: 'academic_year_name', header: 'Academic Year' },
      { key: 'semester_name', header: 'Semester' },
    ],
    fields: [
      {
        name: 'teacher_id',
        label: 'Teacher',
        type: 'select',
        required: true,
        optionsEndpoint: '/academic/teachers',
        getOptionLabel: (item) => `${item.full_name} · ${item.nip || 'Tanpa NIP'}`,
        valueType: 'number',
      },
      {
        name: 'class_id',
        label: 'Class',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/classes',
        getOptionLabel: classOptionLabel,
        valueType: 'number',
      },
      {
        name: 'academic_year_id',
        label: 'Academic Year',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/academic-years',
        getOptionLabel: (item) => String(item.name ?? '-'),
        valueType: 'number',
      },
      {
        name: 'semester_id',
        label: 'Semester',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/semesters',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
    ],
  },
  subjects: {
    key: 'subjects',
    route: '/academic/subjects',
    title: 'Subjects',
    eyebrow: 'Academic',
    description: 'Kelola mata pelajaran berdasarkan jurusan dan tingkat, termasuk tipe mapel dan KKM.',
    endpoint: '/academic/subjects',
    searchPlaceholder: 'Cari kode, nama, tipe, jurusan, atau tingkat…',
    icon: BookOpenCheck,
    accent: 'linear-gradient(135deg, #4ba8ff, #60c14c)',
    initialValues: {
      department_id: '',
      grade_level_id: '',
      code: '',
      name: '',
      subject_type: '',
      kkm: '',
    },
    columns: [
      { key: 'code', header: 'Code', render: (item) => softBadge(String(item.code ?? '-')) },
      { key: 'name', header: 'Subject' },
      { key: 'department_name', header: 'Department' },
      { key: 'grade_level_name', header: 'Grade Level' },
      { key: 'kkm', header: 'KKM' },
    ],
    fields: [
      {
        name: 'department_id',
        label: 'Department',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/departments',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'grade_level_id',
        label: 'Grade Level',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/grade-levels',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      { name: 'code', label: 'Subject Code', type: 'text', required: true, placeholder: 'MTK-101' },
      { name: 'name', label: 'Subject Name', type: 'text', required: true, placeholder: 'Matematika Dasar' },
      { name: 'subject_type', label: 'Subject Type', type: 'text', placeholder: 'general' },
      { name: 'kkm', label: 'KKM', type: 'number', nullable: true, min: 0, step: '0.01', valueType: 'number' },
    ],
  },
  schedules: {
    key: 'schedules',
    route: '/academic/schedules',
    title: 'Schedules',
    eyebrow: 'Academic',
    description: 'Atur jadwal belajar lengkap dengan validasi bentrok untuk kelas, guru, dan ruang.',
    endpoint: '/academic/schedules',
    searchPlaceholder: 'Cari kelas, subject, guru, tahun ajaran, atau semester…',
    icon: MapPinned,
    accent: 'linear-gradient(135deg, #1ac4d6, #ffb648)',
    initialValues: {
      class_id: '',
      subject_id: '',
      teacher_id: '',
      room_id: '',
      academic_year_id: '',
      semester_id: '',
      day_of_week: '1',
      start_time: '',
      end_time: '',
    },
    columns: [
      {
        key: 'class_name',
        header: 'Schedule',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.class_name ?? '-')}</div>
            <div className="cell-subtitle">
              {`${item.subject_code ?? ''} · ${item.subject_name ?? ''}`}
            </div>
          </>
        ),
      },
      { key: 'teacher_full_name', header: 'Teacher' },
      { key: 'room_name', header: 'Room' },
      {
        key: 'day_of_week',
        header: 'Day & Time',
        render: (item) =>
          `${['-', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][Number(item.day_of_week ?? 0)]} · ${item.start_time ?? '-'} - ${item.end_time ?? '-'}`,
      },
      { key: 'semester_name', header: 'Semester' },
    ],
    fields: [
      {
        name: 'class_id',
        label: 'Class',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/classes',
        getOptionLabel: classOptionLabel,
        valueType: 'number',
      },
      {
        name: 'subject_id',
        label: 'Subject',
        type: 'select',
        required: true,
        optionsEndpoint: '/academic/subjects',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'teacher_id',
        label: 'Teacher',
        type: 'select',
        required: true,
        optionsEndpoint: '/academic/teachers',
        getOptionLabel: (item) => `${item.full_name} · ${item.position || 'Tanpa posisi'}`,
        valueType: 'number',
      },
      {
        name: 'room_id',
        label: 'Room',
        type: 'select',
        nullable: true,
        optionsEndpoint: '/master/rooms',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'academic_year_id',
        label: 'Academic Year',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/academic-years',
        getOptionLabel: (item) => String(item.name ?? '-'),
        valueType: 'number',
      },
      {
        name: 'semester_id',
        label: 'Semester',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/semesters',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'day_of_week',
        label: 'Day of Week',
        type: 'select',
        required: true,
        options: [
          { label: 'Senin', value: '1' },
          { label: 'Selasa', value: '2' },
          { label: 'Rabu', value: '3' },
          { label: 'Kamis', value: '4' },
          { label: 'Jumat', value: '5' },
          { label: 'Sabtu', value: '6' },
          { label: 'Minggu', value: '7' },
        ],
        valueType: 'number',
      },
      { name: 'start_time', label: 'Start Time', type: 'time', required: true },
      { name: 'end_time', label: 'End Time', type: 'time', required: true },
    ],
  },
  assessmentComponents: {
    key: 'assessment-components',
    route: '/academic/assessment-components',
    title: 'Assessment Components',
    eyebrow: 'Academic',
    description: 'Kelola komponen penilaian seperti Tugas, UTS, UAS, dan Praktik per mata pelajaran serta periode.',
    endpoint: '/academic/assessment-components',
    searchPlaceholder: 'Cari nama komponen, mapel, tahun ajaran, atau semester…',
    icon: ClipboardCheck,
    accent: 'linear-gradient(135deg, #ff6b5b, #ffb648)',
    initialValues: {
      subject_id: '',
      academic_year_id: '',
      semester_id: '',
      name: '',
      weight: '',
    },
    columns: [
      { key: 'name', header: 'Component', render: (item) => <div className="cell-title">{String(item.name ?? '-')}</div> },
      {
        key: 'subject_code',
        header: 'Subject',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.subject_code ?? '-')}</div>
            <div className="cell-subtitle">{String(item.subject_name ?? '-')}</div>
          </>
        ),
      },
      {
        key: 'academic_year_name',
        header: 'Period',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.academic_year_name ?? '-')}</div>
            <div className="cell-subtitle">{String(item.semester_name ?? '-')}</div>
          </>
        ),
      },
      {
        key: 'weight',
        header: 'Weight',
        render: (item) => softBadge(`${String(item.weight ?? 0)}%`),
      },
    ],
    fields: [
      {
        name: 'subject_id',
        label: 'Mata Pelajaran',
        type: 'select',
        required: true,
        optionsEndpoint: '/academic/subjects',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'academic_year_id',
        label: 'Tahun Ajaran',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/academic-years',
        getOptionLabel: (item) => String(item.name ?? '-'),
        valueType: 'number',
      },
      {
        name: 'semester_id',
        label: 'Semester',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/semesters',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'weight',
        label: 'Bobot (%)',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        step: '0.01',
        valueType: 'number',
      },
      { name: 'name', label: 'Nama Komponen', type: 'text', required: true, placeholder: 'Tugas, UTS, UAS, Praktik' },
    ],
  },
  studentAssessments: {
    key: 'student-assessments',
    route: '/academic/student-assessments',
    title: 'Student Assessments',
    eyebrow: 'Academic',
    description: 'Kelola data penilaian siswa per komponen, mapel, kelas, dan periode akademik.',
    endpoint: '/academic/student-assessments',
    searchPlaceholder: 'Cari nama siswa, NIS, kelas, mapel, komponen, atau guru…',
    icon: ClipboardCheck,
    accent: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    initialValues: {
      student_id: '',
      class_id: '',
      subject_id: '',
      assessment_component_id: '',
      teacher_id: '',
      score: '',
      academic_year_id: '',
      semester_id: '',
    },
    columns: [
      {
        key: 'student_name',
        header: 'Student',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.student_name ?? '-')}</div>
            <div className="cell-subtitle">{String(item.student_nis ?? '')}</div>
          </>
        ),
      },
      { key: 'class_name', header: 'Class' },
      {
        key: 'subject_code',
        header: 'Subject',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.subject_code ?? '-')}</div>
            <div className="cell-subtitle">{String(item.subject_name ?? '-')}</div>
          </>
        ),
      },
      { key: 'component_name', header: 'Component' },
      { key: 'teacher_name', header: 'Teacher' },
      { key: 'score', header: 'Score' },
      {
        key: 'academic_year_name',
        header: 'Period',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.academic_year_name ?? '-')}</div>
            <div className="cell-subtitle">{String(item.semester_name ?? '-')}</div>
          </>
        ),
      },
    ],
    fields: [
      {
        name: 'student_id',
        label: 'Siswa',
        type: 'select',
        required: true,
        optionsEndpoint: '/student-affairs/students',
        getOptionLabel: (item) => `${item.nis} · ${item.full_name}`,
        valueType: 'number',
      },
      {
        name: 'class_id',
        label: 'Kelas',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/classes',
        getOptionLabel: classOptionLabel,
        valueType: 'number',
      },
      {
        name: 'subject_id',
        label: 'Mata Pelajaran',
        type: 'select',
        required: true,
        optionsEndpoint: '/academic/subjects',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'assessment_component_id',
        label: 'Komponen',
        type: 'select',
        required: true,
        optionsEndpoint: '/academic/assessment-components',
        getOptionLabel: (item) => String(item.name ?? '-'),
        valueType: 'number',
      },
      {
        name: 'teacher_id',
        label: 'Guru',
        type: 'select',
        required: true,
        optionsEndpoint: '/academic/teachers',
        getOptionLabel: (item) => `${item.full_name} · ${item.nip || 'Tanpa NIP'}`,
        valueType: 'number',
      },
      {
        name: 'score',
        label: 'Nilai',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        step: '0.01',
        valueType: 'number',
      },
      {
        name: 'academic_year_id',
        label: 'Tahun Ajaran',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/academic-years',
        getOptionLabel: (item) => String(item.name ?? '-'),
        valueType: 'number',
      },
      {
        name: 'semester_id',
        label: 'Semester',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/semesters',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
    ],
  },
  studentGrades: {
    key: 'student-grades',
    route: '/academic/student-grades',
    title: 'Student Grades',
    eyebrow: 'Academic',
    description: 'Kelola nilai akhir siswa per mata pelajaran, kelas, dan periode akademik.',
    endpoint: '/academic/student-grades',
    searchPlaceholder: 'Cari nama siswa, NIS, kelas, mapel, tahun ajaran, atau semester…',
    icon: GraduationCap,
    accent: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    initialValues: {
      student_id: '',
      class_id: '',
      subject_id: '',
      academic_year_id: '',
      semester_id: '',
      final_score: '',
      grade_letter: '',
      predicate: '',
    },
    columns: [
      {
        key: 'student_name',
        header: 'Student',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.student_name ?? '-')}</div>
            <div className="cell-subtitle">{String(item.student_nis ?? '')}</div>
          </>
        ),
      },
      { key: 'class_name', header: 'Class' },
      {
        key: 'subject_code',
        header: 'Subject',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.subject_code ?? '-')}</div>
            <div className="cell-subtitle">{String(item.subject_name ?? '-')}</div>
          </>
        ),
      },
      { key: 'final_score', header: 'Score', render: (item) => softBadge(String(item.final_score ?? '-')) },
      { key: 'grade_letter', header: 'Grade' },
      { key: 'predicate', header: 'Predicate' },
      {
        key: 'academic_year_name',
        header: 'Period',
        render: (item) => (
          <>
            <div className="cell-title">{String(item.academic_year_name ?? '-')}</div>
            <div className="cell-subtitle">{String(item.semester_name ?? '-')}</div>
          </>
        ),
      },
    ],
    fields: [
      {
        name: 'student_id',
        label: 'Siswa',
        type: 'select',
        required: true,
        optionsEndpoint: '/student-affairs/students',
        getOptionLabel: (item) => `${item.nis} · ${item.full_name}`,
        valueType: 'number',
      },
      {
        name: 'class_id',
        label: 'Kelas',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/classes',
        getOptionLabel: classOptionLabel,
        valueType: 'number',
      },
      {
        name: 'subject_id',
        label: 'Mata Pelajaran',
        type: 'select',
        required: true,
        optionsEndpoint: '/academic/subjects',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'academic_year_id',
        label: 'Tahun Ajaran',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/academic-years',
        getOptionLabel: (item) => String(item.name ?? '-'),
        valueType: 'number',
      },
      {
        name: 'semester_id',
        label: 'Semester',
        type: 'select',
        required: true,
        optionsEndpoint: '/master/semesters',
        getOptionLabel: (item) => `${item.code} · ${item.name}`,
        valueType: 'number',
      },
      {
        name: 'final_score',
        label: 'Nilai Akhir',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        step: '0.01',
        valueType: 'number',
      },
      { name: 'grade_letter', label: 'Huruf Mutu', type: 'text', placeholder: 'A, B+, B, C+, C, D, E' },
      { name: 'predicate', label: 'Predikat', type: 'text', placeholder: 'Sangat Baik, Baik, Cukup, Kurang' },
    ],
  },

  roles: {
    key: 'roles',
    route: '/admin/roles',
    title: 'Roles',
    eyebrow: 'Administration',
    description: 'Kelola role sistem yang menentukan hak akses pengguna di seluruh modul.',
    endpoint: '/roles',
    searchPlaceholder: 'Cari nama atau kode role...',
    icon: Shield,
    accent: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    initialValues: {
      name: '',
      code: '',
      description: '',
    },
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'code', header: 'Code', render: (item) => softBadge(String(item.code ?? '-')) },
      { key: 'description', header: 'Description' },
    ],
    fields: [
      { name: 'name', label: 'Role Name', type: 'text', required: true, placeholder: 'Administrator' },
      { name: 'code', label: 'Role Code', type: 'text', required: true, placeholder: 'admin' },
      { name: 'description', label: 'Description', type: 'textarea', fullWidth: true, placeholder: 'Deskripsi singkat tentang role ini' },
    ],
  },

  permissions: {
    key: 'permissions',
    route: '/admin/permissions',
    title: 'Permissions',
    eyebrow: 'Administration',
    description: 'Kelola hak akses granular yang bisa diberikan ke setiap role.',
    endpoint: '/permissions',
    searchPlaceholder: 'Cari nama atau kode permission...',
    icon: Shield,
    accent: 'linear-gradient(135deg, #6366f1, #818cf8)',
    initialValues: {
      name: '',
      code: '',
      description: '',
    },
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'code', header: 'Code', render: (item) => softBadge(String(item.code ?? '-')) },
      { key: 'description', header: 'Description' },
    ],
    fields: [
      { name: 'name', label: 'Permission Name', type: 'text', required: true, placeholder: 'Master Read' },
      { name: 'code', label: 'Permission Code', type: 'text', required: true, placeholder: 'master.read' },
      { name: 'description', label: 'Description', type: 'textarea', fullWidth: true, placeholder: 'Deskripsi singkat tentang permission ini' },
    ],
  },

  users: {
    key: 'users',
    route: '/admin/users',
    title: 'Users',
    eyebrow: 'Administration',
    description: 'Kelola akun pengguna sistem, termasuk pembuatan, update, dan penghapusan user.',
    endpoint: '/users',
    searchPlaceholder: 'Cari username, nama lengkap, atau email...',
    icon: Users2,
    accent: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    initialValues: {
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      is_active: true,
    },
    columns: [
      { key: 'username', header: 'Username' },
      { key: 'full_name', header: 'Full Name' },
      { key: 'email', header: 'Email' },
      {
        key: 'is_active',
        header: 'Status',
        render: (item) => statusBadge(String(item.is_active)),
      },
    ],
    fields: [
      { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'admin' },
      { name: 'password', label: 'Password', type: 'text', placeholder: 'Minimal 6 karakter' },
      { name: 'full_name', label: 'Full Name', type: 'text', required: true, placeholder: 'Administrator SIAKAD' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'admin@siakad.local' },
      { name: 'phone', label: 'Phone', type: 'text', placeholder: '081234567890' },
      { name: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },
}
