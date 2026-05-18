import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarRange, LoaderCircle, PencilLine, Plus, Search, Trash2, Users2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listResource, updateResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'

type StudentRecord = ResourceRecord & {
  id?: number
  nis?: string
  nisn?: string
  full_name?: string
  gender?: string
  birth_place?: string
  birth_date?: string
  address?: string
  phone?: string
  entry_year?: number
  status?: string
}

type FormValues = {
  nis: string
  nisn: string
  full_name: string
  gender: string
  birth_place: string
  birth_date: string
  address: string
  phone: string
  entry_year: string
  status: string
}

const endpoint = '/student-affairs/students'
const formatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

function normalizeDateInput(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return ''
  }
  return value.slice(0, 10)
}

function formatDateLabel(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return formatter.format(date)
}

function toFormValues(item: StudentRecord | null): FormValues {
  if (!item) {
    return {
      nis: '',
      nisn: '',
      full_name: '',
      gender: 'male',
      birth_place: '',
      birth_date: '',
      address: '',
      phone: '',
      entry_year: '',
      status: 'active',
    }
  }

  return {
    nis: String(item.nis ?? ''),
    nisn: String(item.nisn ?? ''),
    full_name: String(item.full_name ?? ''),
    gender: String(item.gender ?? 'male'),
    birth_place: String(item.birth_place ?? ''),
    birth_date: normalizeDateInput(item.birth_date),
    address: String(item.address ?? ''),
    phone: String(item.phone ?? ''),
    entry_year: String(item.entry_year ?? ''),
    status: String(item.status ?? 'active'),
  }
}

function toPayload(values: FormValues) {
  return {
    nis: values.nis.trim().toUpperCase(),
    nisn: values.nisn.trim(),
    full_name: values.full_name.trim(),
    gender: values.gender,
    birth_place: values.birth_place.trim(),
    birth_date: values.birth_date,
    address: values.address.trim(),
    phone: values.phone.trim(),
    entry_year: Number(values.entry_year),
    status: values.status.trim() || 'active',
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'active') {
    return <span className="inline-status inline-status--active">Active</span>
  }
  if (normalized === 'male') {
    return <span className="inline-status inline-status--male">Male</span>
  }
  if (normalized === 'female') {
    return <span className="inline-status inline-status--female">Female</span>
  }
  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

export function StudentsPage() {
  const [items, setItems] = useState<StudentRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<StudentRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [entryYearFilter, setEntryYearFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StudentRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, string | number> = {}
    if (statusFilter !== 'all') query.status = statusFilter
    if (genderFilter !== 'all') query.gender = genderFilter
    if (entryYearFilter) query.entry_year = Number(entryYearFilter)
    return query
  }, [entryYearFilter, genderFilter, statusFilter])

  const activeStudentsCount = useMemo(
    () => overviewItems.filter((item) => String(item.status ?? '').toLowerCase() === 'active').length,
    [overviewItems],
  )
  const maleStudentsCount = useMemo(
    () => overviewItems.filter((item) => String(item.gender ?? '').toLowerCase() === 'male').length,
    [overviewItems],
  )
  const entryYearCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.entry_year ?? '')).filter(Boolean)).size,
    [overviewItems],
  )

  const entryYearOptions = useMemo(() => {
    return Array.from(new Set(overviewItems.map((item) => Number(item.entry_year ?? 0)).filter((item) => item > 0))).sort(
      (left, right) => right - left,
    )
  }, [overviewItems])

  async function fetchStudents(searchValue: string, query: Record<string, string | number>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<StudentRecord>(endpoint, searchValue, query),
      listResource<StudentRecord>(endpoint),
    ])
    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchStudents(deferredSearch, filterQuery)
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
    async function syncStudents() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchStudents(deferredSearch, filterQuery)
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
    void syncStudents()
    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  function handleCreateClick() {
    startTransition(() => {
      setEditingItem(null)
      setFormValues(toFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleEditClick(item: StudentRecord) {
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

  async function handleDelete(item: StudentRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus siswa ${item.full_name ?? ''}?`)
    if (!confirmed) return

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Siswa berhasil dihapus.')
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
        await updateResource(endpoint, Number(editingItem.id), payload)
        setSuccessMessage('Siswa berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Siswa berhasil dibuat.')
      }
      setModalOpen(false)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">Kesiswaan</p>
          <h1 className="page-header__title">Students</h1>
          <p className="page-header__description">
            Kelola data inti siswa sebagai fondasi untuk enrollment, absensi, disiplin, nilai, dan riwayat akademik.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Siswa
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Students</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Data inti siswa yang siap dipakai lintas modul kesiswaan dan akademik.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Active & Gender</div>
            <div className="stat-card__value stat-card__value--compact">{activeStudentsCount} active</div>
            <div className="stat-card__copy">{maleStudentsCount} male, {overviewItems.length - maleStudentsCount} female.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Entry Year Coverage</div>
            <div className="stat-card__value">{entryYearCoverage}</div>
            <div className="stat-card__copy">Jumlah angkatan yang sudah tercatat di sistem.</div>
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
              placeholder="Cari NIS, NISN, nama siswa, atau telepon…"
              value={search}
            />
          </div>

          <div className="toolbar__filters">
            <button className={`segmented-button ${statusFilter === 'all' ? 'segmented-button--active' : ''}`} onClick={() => setStatusFilter('all')} type="button">Semua</button>
            <button className={`segmented-button ${statusFilter === 'active' ? 'segmented-button--active' : ''}`} onClick={() => setStatusFilter('active')} type="button">Aktif</button>
            <button className={`segmented-button ${statusFilter === 'inactive' ? 'segmented-button--active' : ''}`} onClick={() => setStatusFilter('inactive')} type="button">Nonaktif</button>
          </div>

          <div className="toolbar__filters">
            <button className={`segmented-button ${genderFilter === 'all' ? 'segmented-button--active' : ''}`} onClick={() => setGenderFilter('all')} type="button">Semua Gender</button>
            <button className={`segmented-button ${genderFilter === 'male' ? 'segmented-button--active' : ''}`} onClick={() => setGenderFilter('male')} type="button">Male</button>
            <button className={`segmented-button ${genderFilter === 'female' ? 'segmented-button--active' : ''}`} onClick={() => setGenderFilter('female')} type="button">Female</button>
          </div>

          <div className="toolbar__filters">
            <select className="toolbar-select" onChange={(event) => setEntryYearFilter(event.target.value)} value={entryYearFilter}>
              <option value="">Semua Angkatan</option>
              {entryYearOptions.map((option) => (
                <option key={option} value={String(option)}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar__actions">
            <div className="chip">Hasil: {items.length}</div>
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
              <strong>Belum ada data untuk Students.</strong>
              Tambahkan siswa pertama agar modul Kesiswaan mulai punya fondasi nyata untuk enrollment, absensi, dan riwayat akademik.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Identity</th>
                  <th>Birth</th>
                  <th>Entry Year</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.full_name ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.phone ?? 'Tanpa nomor telepon')}</div>
                    </td>
                    <td>
                      <div className="cell-title">NIS: {String(item.nis ?? '-')}</div>
                      <div className="cell-subtitle">NISN: {String(item.nisn ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.birth_place ?? '-')}</div>
                      <div className="cell-subtitle">{formatDateLabel(item.birth_date)}</div>
                    </td>
                    <td>{String(item.entry_year ?? '-')}</td>
                    <td>
                      <div className="utility-row">
                        <StatusBadge value={item.status ?? '-'} />
                        <StatusBadge value={item.gender ?? '-'} />
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="table-action" onClick={() => handleEditClick(item)} type="button">
                          <PencilLine size={15} />
                        </button>
                        <button className="table-action table-action--danger" onClick={() => handleDelete(item)} type="button">
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
              <h2 className="modal-title">{editingItem ? 'Edit Student' : 'Create Student'}</h2>
              <p className="modal-copy">
                {editingItem ? 'Perbarui data inti siswa tanpa keluar dari konteks Kesiswaan.' : 'Tambahkan siswa baru untuk membangun fondasi enrollment, absensi, dan riwayat akademik.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="nis">NIS *</label>
                  <input id="nis" onChange={(event) => setFormValues((current) => ({ ...current, nis: event.target.value }))} placeholder="2026001" required type="text" value={formValues.nis} />
                </div>
                <div className="field">
                  <label htmlFor="nisn">NISN</label>
                  <input id="nisn" onChange={(event) => setFormValues((current) => ({ ...current, nisn: event.target.value }))} placeholder="1234567890" type="text" value={formValues.nisn} />
                </div>
                <div className="field field--full">
                  <label htmlFor="full_name">Full Name *</label>
                  <input id="full_name" onChange={(event) => setFormValues((current) => ({ ...current, full_name: event.target.value }))} placeholder="Andi Saputra" required type="text" value={formValues.full_name} />
                </div>
                <div className="field">
                  <label htmlFor="gender">Gender *</label>
                  <select id="gender" onChange={(event) => setFormValues((current) => ({ ...current, gender: event.target.value }))} required value={formValues.gender}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="status">Status *</label>
                  <select id="status" onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))} required value={formValues.status}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="birth_place">Birth Place</label>
                  <input id="birth_place" onChange={(event) => setFormValues((current) => ({ ...current, birth_place: event.target.value }))} placeholder="Padang" type="text" value={formValues.birth_place} />
                </div>
                <div className="field">
                  <label htmlFor="birth_date">Birth Date</label>
                  <input id="birth_date" onChange={(event) => setFormValues((current) => ({ ...current, birth_date: event.target.value }))} type="date" value={formValues.birth_date} />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))} placeholder="081234567890" type="text" value={formValues.phone} />
                </div>
                <div className="field">
                  <label htmlFor="entry_year">Entry Year *</label>
                  <input id="entry_year" min={1901} max={2155} onChange={(event) => setFormValues((current) => ({ ...current, entry_year: event.target.value }))} placeholder="2026" required type="number" value={formValues.entry_year} />
                </div>
                <div className="field field--full">
                  <label htmlFor="address">Address</label>
                  <textarea id="address" onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))} placeholder="Alamat siswa" value={formValues.address} />
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
