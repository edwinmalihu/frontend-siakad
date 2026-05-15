import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarRange, LoaderCircle, MapPinned, PencilLine, Plus, Search, Trash2, TriangleAlert } from 'lucide-react'
import {
  createResource,
  deleteResource,
  extractError,
  listOptions,
  listResource,
  updateResource,
} from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'
import { resourceConfigs } from '../config/resources'

type ScheduleRecord = ResourceRecord & {
  id?: number
  class_id?: number
  class_name?: string
  subject_id?: number
  subject_code?: string
  subject_name?: string
  teacher_id?: number
  teacher_full_name?: string
  room_id?: number | null
  room_code?: string
  room_name?: string
  academic_year_id?: number
  academic_year_name?: string
  semester_id?: number
  semester_code?: string
  semester_name?: string
  day_of_week?: number
  start_time?: string
  end_time?: string
}

type FormValues = {
  class_id: string
  subject_id: string
  teacher_id: string
  room_id: string
  academic_year_id: string
  semester_id: string
  day_of_week: string
  start_time: string
  end_time: string
}

const config = resourceConfigs.schedules

const dayLabels: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
}

function toFormValues(item: ScheduleRecord | null): FormValues {
  if (!item) {
    return {
      class_id: '',
      subject_id: '',
      teacher_id: '',
      room_id: '',
      academic_year_id: '',
      semester_id: '',
      day_of_week: '1',
      start_time: '',
      end_time: '',
    }
  }

  return {
    class_id: String(item.class_id ?? ''),
    subject_id: String(item.subject_id ?? ''),
    teacher_id: String(item.teacher_id ?? ''),
    room_id: item.room_id === null || item.room_id === undefined ? '' : String(item.room_id),
    academic_year_id: String(item.academic_year_id ?? ''),
    semester_id: String(item.semester_id ?? ''),
    day_of_week: String(item.day_of_week ?? '1'),
    start_time: String(item.start_time ?? ''),
    end_time: String(item.end_time ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    class_id: Number(values.class_id),
    subject_id: Number(values.subject_id),
    teacher_id: Number(values.teacher_id),
    room_id: values.room_id.trim() === '' ? null : Number(values.room_id),
    academic_year_id: Number(values.academic_year_id),
    semester_id: Number(values.semester_id),
    day_of_week: Number(values.day_of_week),
    start_time: values.start_time,
    end_time: values.end_time,
  }
}

function buildOptionLabel(item: ResourceRecord, keys: string[]) {
  return keys.map((key) => String(item[key] ?? '')).filter((value) => value.trim() !== '').join(' · ')
}

export function SchedulesPage() {
  const [items, setItems] = useState<ScheduleRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<ScheduleRecord[]>([])
  const [classOptions, setClassOptions] = useState<StaticOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<StaticOption[]>([])
  const [teacherOptions, setTeacherOptions] = useState<StaticOption[]>([])
  const [roomOptions, setRoomOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [semesterOptions, setSemesterOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [classFilter, setClassFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number> = {}
    if (classFilter) query.class_id = Number(classFilter)
    if (teacherFilter) query.teacher_id = Number(teacherFilter)
    if (roomFilter) query.room_id = Number(roomFilter)
    if (academicYearFilter) query.academic_year_id = Number(academicYearFilter)
    if (semesterFilter) query.semester_id = Number(semesterFilter)
    if (dayFilter) query.day_of_week = Number(dayFilter)
    return query
  }, [academicYearFilter, classFilter, dayFilter, roomFilter, semesterFilter, teacherFilter])

  const classCoverage = useMemo(() => new Set(overviewItems.map((item) => String(item.class_name ?? '')).filter(Boolean)).size, [overviewItems])
  const teacherCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.teacher_full_name ?? '')).filter(Boolean)).size,
    [overviewItems],
  )
  const roomlessCount = useMemo(
    () => overviewItems.filter((item) => item.room_id === null || item.room_id === undefined).length,
    [overviewItems],
  )

  async function fetchSchedules(searchValue: string, query: Record<string, number>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<ScheduleRecord>(config.endpoint, searchValue, query),
      listResource<ScheduleRecord>(config.endpoint),
    ])
    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchSchedules(deferredSearch, filterQuery)
      setItems(listResult.items)
      setOverviewItems(overviewResult.items)
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function syncSchedules() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchSchedules(deferredSearch, filterQuery)
        if (!isMounted) return
        setItems(listResult.items)
        setOverviewItems(overviewResult.items)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void syncSchedules()
    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true

    async function syncOptions() {
      try {
        const [classes, subjects, teachers, rooms, academicYears, semesters] = await Promise.all([
          listOptions('/master/classes'),
          listOptions('/academic/subjects'),
          listOptions('/academic/teachers'),
          listOptions('/master/rooms'),
          listOptions('/master/academic-years'),
          listOptions('/master/semesters'),
        ])
        if (!isMounted) return

        setClassOptions(
          classes.map((item) => ({
            label: buildOptionLabel(item, ['name', 'department_code', 'grade_level_code', 'academic_year_name']),
            value: String(item.id ?? ''),
          })),
        )
        setSubjectOptions(
          subjects.map((item) => ({
            label: buildOptionLabel(item, ['code', 'name', 'department_code', 'grade_level_code']),
            value: String(item.id ?? ''),
          })),
        )
        setTeacherOptions(
          teachers.map((item) => ({
            label: buildOptionLabel(item, ['full_name', 'position']),
            value: String(item.id ?? ''),
          })),
        )
        setRoomOptions(
          rooms.map((item) => ({
            label: buildOptionLabel(item, ['code', 'name']),
            value: String(item.id ?? ''),
          })),
        )
        setAcademicYearOptions(
          academicYears.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
        setSemesterOptions(
          semesters.map((item) => ({
            label: buildOptionLabel(item, ['code', 'name', 'academic_year']),
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      }
    }

    void syncOptions()
    return () => {
      isMounted = false
    }
  }, [])

  function handleCreateClick() {
    startTransition(() => {
      setEditingItem(null)
      setFormValues(toFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleEditClick(item: ScheduleRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleModalClose() {
    setModalOpen(false)
  }

  async function handleDelete(item: ScheduleRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus jadwal ${item.subject_name ?? ''} untuk kelas ${item.class_name ?? ''}?`)
    if (!confirmed) return

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Jadwal berhasil dihapus.')
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')
      const payload = toPayload(formValues)
      if (editingItem?.id) {
        await updateResource(config.endpoint, Number(editingItem.id), payload)
        setSuccessMessage('Jadwal berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Jadwal berhasil dibuat.')
      }
      setModalOpen(false)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const optionsReady =
    classOptions.length > 0 &&
    subjectOptions.length > 0 &&
    teacherOptions.length > 0 &&
    academicYearOptions.length > 0 &&
    semesterOptions.length > 0

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">{config.eyebrow}</p>
          <h1 className="page-header__title">{config.title}</h1>
          <p className="page-header__description">{config.description}</p>
        </div>

        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Jadwal
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <MapPinned size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Jadwal</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Semua slot belajar yang sudah tersusun untuk modul akademik.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Coverage</div>
            <div className="stat-card__value stat-card__value--compact">{classCoverage} kelas</div>
            <div className="stat-card__copy">{teacherCoverage} guru sudah terhubung ke jadwal.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <TriangleAlert size={18} />
          </div>
          <div>
            <div className="stat-card__label">Tanpa Ruang</div>
            <div className="stat-card__value">{roomlessCount}</div>
            <div className="stat-card__copy">Jadwal ini masih perlu ruang agar operasionalnya lengkap.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div className="toolbar__search">
            <Search size={18} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder}
              value={search}
            />
          </div>

          <div className="toolbar__filters">
            <select className="toolbar-select" onChange={(event) => setClassFilter(event.target.value)} value={classFilter}>
              <option value="">Semua Kelas</option>
              {classOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select className="toolbar-select" onChange={(event) => setTeacherFilter(event.target.value)} value={teacherFilter}>
              <option value="">Semua Guru</option>
              {teacherOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select className="toolbar-select" onChange={(event) => setRoomFilter(event.target.value)} value={roomFilter}>
              <option value="">Semua Ruang</option>
              {roomOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar__filters">
            <select
              className="toolbar-select"
              onChange={(event) => setAcademicYearFilter(event.target.value)}
              value={academicYearFilter}
            >
              <option value="">Semua Tahun Ajaran</option>
              {academicYearOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select className="toolbar-select" onChange={(event) => setSemesterFilter(event.target.value)} value={semesterFilter}>
              <option value="">Semua Semester</option>
              {semesterOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select className="toolbar-select" onChange={(event) => setDayFilter(event.target.value)} value={dayFilter}>
              <option value="">Semua Hari</option>
              {Object.entries(dayLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar__actions">
            <div className="chip">Hasil: {items.length}</div>
            <div className="chip">Master siap: {optionsReady ? 'Lengkap' : 'Belum lengkap'}</div>
          </div>
        </div>

        {loading ? (
          <div className="panel__body">
            <div className="loading-line" />
            <div className="loading-line" style={{ marginTop: '14px' }} />
            <div className="loading-line" style={{ marginTop: '14px', width: '76%' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Belum ada data untuk {config.title}.</strong>
              Pastikan kelas, subject, teacher, academic year, dan semester sudah siap, lalu susun slot belajar tanpa bentrok.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Room</th>
                  <th>Day & Time</th>
                  <th>Period</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.class_name ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.subject_code ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.subject_name ?? '-')}</div>
                    </td>
                    <td>{String(item.teacher_full_name ?? '-')}</td>
                    <td>
                      <div className="cell-title">{String(item.room_code ?? 'Tanpa ruang')}</div>
                      <div className="cell-subtitle">{String(item.room_name ?? 'Belum dipilih')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{dayLabels[Number(item.day_of_week ?? 0)] ?? '-'}</div>
                      <div className="cell-subtitle">
                        {String(item.start_time ?? '-')} - {String(item.end_time ?? '-')}
                      </div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.academic_year_name ?? '-')}</div>
                      <div className="cell-subtitle">
                        {String(item.semester_code ?? '-')} · {String(item.semester_name ?? '-')}
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="table-action" onClick={() => handleEditClick(item)} type="button">
                          <PencilLine size={15} />
                        </button>
                        <button
                          className="table-action table-action--danger"
                          onClick={() => handleDelete(item)}
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" onClick={handleModalClose} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Edit Schedule' : 'Create Schedule'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui slot belajar sambil menjaga validasi bentrok kelas, guru, dan ruang.'
                  : 'Tambahkan jadwal baru dengan relasi kelas, subject, teacher, ruang, dan periode yang sesuai.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="class_id">Class *</label>
                  <select
                    id="class_id"
                    onChange={(event) => setFormValues((current) => ({ ...current, class_id: event.target.value }))}
                    required
                    value={formValues.class_id}
                  >
                    <option value="">Pilih Class</option>
                    {classOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="subject_id">Subject *</label>
                  <select
                    id="subject_id"
                    onChange={(event) => setFormValues((current) => ({ ...current, subject_id: event.target.value }))}
                    required
                    value={formValues.subject_id}
                  >
                    <option value="">Pilih Subject</option>
                    {subjectOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="teacher_id">Teacher *</label>
                  <select
                    id="teacher_id"
                    onChange={(event) => setFormValues((current) => ({ ...current, teacher_id: event.target.value }))}
                    required
                    value={formValues.teacher_id}
                  >
                    <option value="">Pilih Teacher</option>
                    {teacherOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="room_id">Room</label>
                  <select
                    id="room_id"
                    onChange={(event) => setFormValues((current) => ({ ...current, room_id: event.target.value }))}
                    value={formValues.room_id}
                  >
                    <option value="">Tanpa ruang</option>
                    {roomOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="academic_year_id">Academic Year *</label>
                  <select
                    id="academic_year_id"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, academic_year_id: event.target.value }))
                    }
                    required
                    value={formValues.academic_year_id}
                  >
                    <option value="">Pilih Academic Year</option>
                    {academicYearOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="semester_id">Semester *</label>
                  <select
                    id="semester_id"
                    onChange={(event) => setFormValues((current) => ({ ...current, semester_id: event.target.value }))}
                    required
                    value={formValues.semester_id}
                  >
                    <option value="">Pilih Semester</option>
                    {semesterOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="day_of_week">Day of Week *</label>
                  <select
                    id="day_of_week"
                    onChange={(event) => setFormValues((current) => ({ ...current, day_of_week: event.target.value }))}
                    required
                    value={formValues.day_of_week}
                  >
                    {Object.entries(dayLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="start_time">Start Time *</label>
                  <input
                    id="start_time"
                    onChange={(event) => setFormValues((current) => ({ ...current, start_time: event.target.value }))}
                    required
                    type="time"
                    value={formValues.start_time}
                  />
                </div>

                <div className="field">
                  <label htmlFor="end_time">End Time *</label>
                  <input
                    id="end_time"
                    onChange={(event) => setFormValues((current) => ({ ...current, end_time: event.target.value }))}
                    required
                    type="time"
                    value={formValues.end_time}
                  />
                  {!optionsReady ? <small>Lengkapi master relasi akademik terlebih dahulu sebelum membuat jadwal.</small> : null}
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting || !optionsReady} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
