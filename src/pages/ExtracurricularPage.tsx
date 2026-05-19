import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarRange, Dumbbell, LoaderCircle, PencilLine, Plus, Search, Trash2, Users2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listOptions, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type ExtracurricularRecord = ResourceRecord & {
  id?: number
  coach_teacher_id?: number
  coach_teacher_name?: string
  name?: string
  description?: string
  is_active?: boolean
}

type ExtracurricularMemberRecord = ResourceRecord & {
  id?: number
  extracurricular_id?: number
  extracurricular_name?: string
  student_id?: number
  student_nis?: string
  student_full_name?: string
  academic_year_id?: number
  academic_year_name?: string
  status?: string
}

type ExtracurricularFormValues = {
  coach_teacher_id: string
  name: string
  description: string
  is_active: boolean
}

type MemberFormValues = {
  extracurricular_id: string
  student_id: string
  academic_year_id: string
  status: string
}

const extracurricularsEndpoint = '/student-affairs/extracurriculars'
const membersEndpoint = '/student-affairs/extracurricular-members'

function toExtracurricularFormValues(item: ExtracurricularRecord | null): ExtracurricularFormValues {
  if (!item) {
    return {
      coach_teacher_id: '',
      name: '',
      description: '',
      is_active: true,
    }
  }
  return {
    coach_teacher_id: String(item.coach_teacher_id ?? ''),
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
    is_active: Boolean(item.is_active ?? true),
  }
}

function toMemberFormValues(item: ExtracurricularMemberRecord | null): MemberFormValues {
  if (!item) {
    return {
      extracurricular_id: '',
      student_id: '',
      academic_year_id: '',
      status: 'active',
    }
  }
  return {
    extracurricular_id: String(item.extracurricular_id ?? ''),
    student_id: String(item.student_id ?? ''),
    academic_year_id: String(item.academic_year_id ?? ''),
    status: String(item.status ?? 'active'),
  }
}

function toExtracurricularPayload(values: ExtracurricularFormValues) {
  return {
    coach_teacher_id: values.coach_teacher_id ? Number(values.coach_teacher_id) : 0,
    name: values.name.trim(),
    description: values.description.trim(),
    is_active: values.is_active,
  }
}

function toMemberPayload(values: MemberFormValues) {
  return {
    extracurricular_id: Number(values.extracurricular_id),
    student_id: Number(values.student_id),
    academic_year_id: Number(values.academic_year_id),
    status: values.status.trim() || 'active',
  }
}

function ActiveBadge({ value }: { value: unknown }) {
  return value ? (
    <span className="inline-status inline-status--active">Active</span>
  ) : (
    <span className="inline-status inline-status--inactive">Inactive</span>
  )
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'active') return <span className="inline-status inline-status--active">Active</span>
  if (normalized === 'inactive') return <span className="inline-status inline-status--inactive">Inactive</span>
  return <span className="inline-status inline-status--soft">{String(value ?? '-')}</span>
}

export function ExtracurricularPage() {
  const [extracurriculars, setExtracurriculars] = useState<ExtracurricularRecord[]>([])
  const [overviewMembers, setOverviewMembers] = useState<ExtracurricularMemberRecord[]>([])
  const [members, setMembers] = useState<ExtracurricularMemberRecord[]>([])
  const [teacherOptions, setTeacherOptions] = useState<StaticOption[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [extracurricularOptions, setExtracurricularOptions] = useState<StaticOption[]>([])
  const [extracurricularSearch, setExtracurricularSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const deferredExtracurricularSearch = useDeferredValue(extracurricularSearch)
  const deferredMemberSearch = useDeferredValue(memberSearch)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [activityFilter, setActivityFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState('all')
  const [loadingExtracurriculars, setLoadingExtracurriculars] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [submittingExtracurricular, setSubmittingExtracurricular] = useState(false)
  const [submittingMember, setSubmittingMember] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [extracurricularModalOpen, setExtracurricularModalOpen] = useState(false)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingExtracurricular, setEditingExtracurricular] = useState<ExtracurricularRecord | null>(null)
  const [editingMember, setEditingMember] = useState<ExtracurricularMemberRecord | null>(null)
  const [extracurricularFormValues, setExtracurricularFormValues] = useState<ExtracurricularFormValues>(
    toExtracurricularFormValues(null),
  )
  const [memberFormValues, setMemberFormValues] = useState<MemberFormValues>(toMemberFormValues(null))

  const memberQuery = useMemo(() => {
    const query: Record<string, number | string> = {}
    if (activityFilter) query.extracurricular_id = Number(activityFilter)
    if (academicYearFilter) query.academic_year_id = Number(academicYearFilter)
    if (memberStatusFilter !== 'all') query.status = memberStatusFilter
    return query
  }, [activityFilter, academicYearFilter, memberStatusFilter])

  const catalogActiveCount = useMemo(
    () => extracurriculars.filter((item) => Boolean(item.is_active)).length,
    [extracurriculars],
  )
  const coachCoverage = useMemo(
    () => new Set(extracurriculars.map((item) => String(item.coach_teacher_name ?? '')).filter(Boolean)).size,
    [extracurriculars],
  )
  const memberCoverage = useMemo(
    () => new Set(overviewMembers.map((item) => String(item.student_full_name ?? '')).filter(Boolean)).size,
    [overviewMembers],
  )

  async function refreshExtracurriculars(searchValue = deferredExtracurricularSearch, teacherFilterValue = teacherFilter) {
    setLoadingExtracurriculars(true)
    try {
      const query: Record<string, number> = {}
      if (teacherFilterValue) query.coach_teacher_id = Number(teacherFilterValue)
      const result = await listResource<ExtracurricularRecord>(extracurricularsEndpoint, searchValue, query)
      setExtracurriculars(result.items)
      setExtracurricularOptions(
        result.items.map((item) => ({
          label: String(item.name ?? '-'),
          value: String(item.id ?? ''),
        })),
      )
    } finally {
      setLoadingExtracurriculars(false)
    }
  }

  async function refreshMembers(searchValue = deferredMemberSearch, query = memberQuery) {
    setLoadingMembers(true)
    try {
      const [listResult, overviewResult] = await Promise.all([
        listResource<ExtracurricularMemberRecord>(membersEndpoint, searchValue, query),
        listResource<ExtracurricularMemberRecord>(membersEndpoint),
      ])
      setMembers(listResult.items)
      setOverviewMembers(overviewResult.items)
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function syncOptions() {
      try {
        const [teachers, students, academicYears] = await Promise.all([
          listOptions('/academic/teachers'),
          listOptions('/student-affairs/students'),
          listOptions('/master/academic-years'),
        ])
        if (!isMounted) return
        setTeacherOptions(
          teachers.map((item) => ({
            label: String(item.full_name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
        setStudentOptions(
          students.map((item) => ({
            label: `${String(item.full_name ?? '-')} · ${String(item.nis ?? 'Tanpa NIS')}`,
            value: String(item.id ?? ''),
          })),
        )
        setAcademicYearOptions(
          academicYears.map((item) => ({
            label: String(item.name ?? '-'),
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

  useEffect(() => {
    let isMounted = true
    async function syncExtracurriculars() {
      setLoadingExtracurriculars(true)
      try {
        const query: Record<string, number> = {}
        if (teacherFilter) query.coach_teacher_id = Number(teacherFilter)
        const result = await listResource<ExtracurricularRecord>(extracurricularsEndpoint, deferredExtracurricularSearch, query)
        if (!isMounted) return
        setExtracurriculars(result.items)
        setExtracurricularOptions(
          result.items.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoadingExtracurriculars(false)
      }
    }

    void syncExtracurriculars()
    return () => {
      isMounted = false
    }
  }, [deferredExtracurricularSearch, teacherFilter])

  useEffect(() => {
    let isMounted = true
    async function syncMembers() {
      setLoadingMembers(true)
      try {
        const [listResult, overviewResult] = await Promise.all([
          listResource<ExtracurricularMemberRecord>(membersEndpoint, deferredMemberSearch, memberQuery),
          listResource<ExtracurricularMemberRecord>(membersEndpoint),
        ])
        if (!isMounted) return
        setMembers(listResult.items)
        setOverviewMembers(overviewResult.items)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoadingMembers(false)
      }
    }

    void syncMembers()
    return () => {
      isMounted = false
    }
  }, [deferredMemberSearch, memberQuery])

  function handleCreateExtracurricular() {
    startTransition(() => {
      setEditingExtracurricular(null)
      setExtracurricularFormValues(toExtracurricularFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setExtracurricularModalOpen(true)
    })
  }

  function handleEditExtracurricular(item: ExtracurricularRecord) {
    startTransition(() => {
      setEditingExtracurricular(item)
      setExtracurricularFormValues(toExtracurricularFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setExtracurricularModalOpen(true)
    })
  }

  function handleCreateMember() {
    startTransition(() => {
      setEditingMember(null)
      setMemberFormValues(toMemberFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setMemberModalOpen(true)
    })
  }

  function handleEditMember(item: ExtracurricularMemberRecord) {
    startTransition(() => {
      setEditingMember(item)
      setMemberFormValues(toMemberFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setMemberModalOpen(true)
    })
  }

  async function handleDeleteExtracurricular(item: ExtracurricularRecord) {
    if (!item.id) return
    if (!window.confirm(`Hapus ekskul ${item.name ?? ''}?`)) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(extracurricularsEndpoint, Number(item.id))
      setSuccessMessage('Ekstrakurikuler berhasil dihapus.')
      await refreshExtracurriculars()
      await refreshMembers()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleDeleteMember(item: ExtracurricularMemberRecord) {
    if (!item.id) return
    if (!window.confirm(`Hapus anggota ${item.student_full_name ?? ''}?`)) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(membersEndpoint, Number(item.id))
      setSuccessMessage('Keanggotaan ekskul berhasil dihapus.')
      await refreshMembers()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleExtracurricularSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmittingExtracurricular(true)
      setErrorMessage('')
      setSuccessMessage('')
      const payload = toExtracurricularPayload(extracurricularFormValues)
      if (editingExtracurricular?.id) {
        await updateResource(extracurricularsEndpoint, Number(editingExtracurricular.id), payload)
        setSuccessMessage('Ekstrakurikuler berhasil diperbarui.')
      } else {
        await createResource(extracurricularsEndpoint, payload)
        setSuccessMessage('Ekstrakurikuler berhasil dibuat.')
      }
      setExtracurricularModalOpen(false)
      await refreshExtracurriculars()
      await refreshMembers()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmittingExtracurricular(false)
    }
  }

  async function handleMemberSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmittingMember(true)
      setErrorMessage('')
      setSuccessMessage('')
      const payload = toMemberPayload(memberFormValues)
      if (editingMember?.id) {
        await updateResource(membersEndpoint, Number(editingMember.id), payload)
        setSuccessMessage('Keanggotaan ekskul berhasil diperbarui.')
      } else {
        await createResource(membersEndpoint, payload)
        setSuccessMessage('Anggota ekskul berhasil ditambahkan.')
      }
      setMemberModalOpen(false)
      await refreshMembers()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmittingMember(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">Kesiswaan</p>
          <h1 className="page-header__title">Extracurricular</h1>
          <p className="page-header__description">
            Kelola katalog kegiatan ekstrakurikuler dan anggota aktifnya agar pembinaan siswa di luar kelas tetap tercatat rapi.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button-secondary" onClick={handleCreateExtracurricular} type="button">
            <Plus size={18} />
            &nbsp;Tambah Ekskul
          </button>
          <button className="button" onClick={handleCreateMember} type="button">
            <Plus size={18} />
            &nbsp;Tambah Anggota
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <Dumbbell size={18} />
          </div>
          <div>
            <div className="stat-card__label">Activities</div>
            <div className="stat-card__value">{extracurriculars.length}</div>
            <div className="stat-card__copy">{catalogActiveCount} kegiatan masih aktif untuk pembinaan siswa.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Members</div>
            <div className="stat-card__value">{overviewMembers.length}</div>
            <div className="stat-card__copy">{memberCoverage} siswa sudah tercatat sebagai peserta ekskul.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Coach Coverage</div>
            <div className="stat-card__value">{coachCoverage}</div>
            <div className="stat-card__copy">Jumlah pembina yang sudah memiliki tanggung jawab kegiatan.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div>
            <p className="page-header__eyebrow">Katalog Kegiatan</p>
            <h2 className="panel-heading">Extracurricular Activities</h2>
          </div>
          <div className="toolbar__actions">
            <label className="toolbar__search">
              <Search size={18} />
              <input
                value={extracurricularSearch}
                onChange={(event) => setExtracurricularSearch(event.target.value)}
                placeholder="Cari ekskul, deskripsi, atau pembina..."
                type="search"
              />
            </label>
            <div className="toolbar__filters">
              <select value={teacherFilter} onChange={(event) => setTeacherFilter(event.target.value)}>
                <option value="">Semua pembina</option>
                {teacherOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kegiatan</th>
                <th>Pembina</th>
                <th>Status</th>
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingExtracurriculars ? (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    <LoaderCircle className="spin" size={18} /> Memuat daftar ekskul...
                  </td>
                </tr>
              ) : extracurriculars.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={5}>Belum ada kegiatan yang cocok dengan filter saat ini.</td>
                </tr>
              ) : (
                extracurriculars.map((item) => (
                  <tr key={String(item.id)}>
                    <td><div className="cell-title">{String(item.name ?? '-')}</div></td>
                    <td><div className="cell-subtitle">{String(item.coach_teacher_name ?? 'Belum ada pembina')}</div></td>
                    <td><ActiveBadge value={item.is_active} /></td>
                    <td><div className="cell-subtitle">{String(item.description ?? 'Tanpa deskripsi')}</div></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditExtracurricular(item)} type="button"><PencilLine size={16} /></button>
                        <button className="icon-button icon-button--danger" onClick={() => handleDeleteExtracurricular(item)} type="button"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div>
            <p className="page-header__eyebrow">Anggota Ekskul</p>
            <h2 className="panel-heading">Extracurricular Members</h2>
          </div>
          <div className="toolbar__actions">
            <label className="toolbar__search">
              <Search size={18} />
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Cari siswa, NIS, ekskul, atau tahun ajaran..."
                type="search"
              />
            </label>
            <div className="toolbar__filters">
              <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
                <option value="">Semua ekskul</option>
                {extracurricularOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select value={academicYearFilter} onChange={(event) => setAcademicYearFilter(event.target.value)}>
                <option value="">Semua tahun ajaran</option>
                {academicYearOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select value={memberStatusFilter} onChange={(event) => setMemberStatusFilter(event.target.value)}>
                <option value="all">Semua status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Ekskul</th>
                <th>Tahun Ajaran</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingMembers ? (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    <LoaderCircle className="spin" size={18} /> Memuat anggota ekskul...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={5}>Belum ada anggota ekskul yang cocok dengan filter saat ini.</td>
                </tr>
              ) : (
                members.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.student_full_name ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.student_nis ?? 'Tanpa NIS')}</div>
                    </td>
                    <td><div className="cell-title">{String(item.extracurricular_name ?? '-')}</div></td>
                    <td><div className="cell-subtitle">{String(item.academic_year_name ?? '-')}</div></td>
                    <td><StatusBadge value={item.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditMember(item)} type="button"><PencilLine size={16} /></button>
                        <button className="icon-button icon-button--danger" onClick={() => handleDeleteMember(item)} type="button"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {extracurricularModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-card__header">
              <p className="page-header__eyebrow">Extracurricular</p>
              <h2 className="panel-heading">{editingExtracurricular ? 'Edit Ekskul' : 'Tambah Ekskul'}</h2>
            </div>
            <form onSubmit={handleExtracurricularSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Nama Kegiatan</span>
                  <input
                    value={extracurricularFormValues.name}
                    onChange={(event) => setExtracurricularFormValues((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Mis. Basket, Rohis, Paskibra"
                    required
                    type="text"
                  />
                </label>
                <label className="form-field">
                  <span>Pembina</span>
                  <select
                    value={extracurricularFormValues.coach_teacher_id}
                    onChange={(event) => setExtracurricularFormValues((current) => ({ ...current, coach_teacher_id: event.target.value }))}
                  >
                    <option value="">Belum ditentukan</option>
                    {teacherOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field form-field--full">
                  <span>Deskripsi</span>
                  <textarea
                    rows={4}
                    value={extracurricularFormValues.description}
                    onChange={(event) => setExtracurricularFormValues((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Jelaskan fokus kegiatan, target siswa, atau pola pembinaannya."
                  />
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select
                    value={extracurricularFormValues.is_active ? 'true' : 'false'}
                    onChange={(event) => setExtracurricularFormValues((current) => ({ ...current, is_active: event.target.value === 'true' }))}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button className="button-ghost" onClick={() => setExtracurricularModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submittingExtracurricular} type="submit">
                  {submittingExtracurricular ? <LoaderCircle className="spin" size={18} /> : null}
                  {submittingExtracurricular ? ' Menyimpan...' : ' Simpan Ekskul'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {memberModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-card__header">
              <p className="page-header__eyebrow">Extracurricular Member</p>
              <h2 className="panel-heading">{editingMember ? 'Edit Anggota Ekskul' : 'Tambah Anggota Ekskul'}</h2>
            </div>
            <form onSubmit={handleMemberSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Ekskul</span>
                  <select
                    value={memberFormValues.extracurricular_id}
                    onChange={(event) => setMemberFormValues((current) => ({ ...current, extracurricular_id: event.target.value }))}
                    required
                  >
                    <option value="">Pilih ekskul</option>
                    {extracurricularOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Siswa</span>
                  <select
                    value={memberFormValues.student_id}
                    onChange={(event) => setMemberFormValues((current) => ({ ...current, student_id: event.target.value }))}
                    required
                  >
                    <option value="">Pilih siswa</option>
                    {studentOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Tahun Ajaran</span>
                  <select
                    value={memberFormValues.academic_year_id}
                    onChange={(event) => setMemberFormValues((current) => ({ ...current, academic_year_id: event.target.value }))}
                    required
                  >
                    <option value="">Pilih tahun ajaran</option>
                    {academicYearOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select
                    value={memberFormValues.status}
                    onChange={(event) => setMemberFormValues((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button className="button-ghost" onClick={() => setMemberModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submittingMember} type="submit">
                  {submittingMember ? <LoaderCircle className="spin" size={18} /> : null}
                  {submittingMember ? ' Menyimpan...' : ' Simpan Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
