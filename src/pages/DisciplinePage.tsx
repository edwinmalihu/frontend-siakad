import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, LoaderCircle, PencilLine, Plus, Search, ShieldAlert, Trash2, Users2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listOptions, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type DisciplineCategoryRecord = ResourceRecord & {
  id?: number
  name?: string
  point?: number
  description?: string
}

type DisciplineRecord = ResourceRecord & {
  id?: number
  student_id?: number
  student_nis?: string
  student_full_name?: string
  discipline_category_id?: number
  discipline_category_name?: string
  point?: number
  recorded_by?: number
  recorded_by_name?: string
  incident_date?: string
  description?: string
  action_taken?: string
}

type CategoryFormValues = {
  name: string
  point: string
  description: string
}

type RecordFormValues = {
  student_id: string
  discipline_category_id: string
  incident_date: string
  description: string
  action_taken: string
}

const categoriesEndpoint = '/student-affairs/discipline-categories'
const recordsEndpoint = '/student-affairs/discipline-records'
const formatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

function normalizeDateInput(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return ''
  return value.slice(0, 10)
}

function formatDateLabel(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatter.format(date)
}

function toCategoryFormValues(item: DisciplineCategoryRecord | null): CategoryFormValues {
  if (!item) {
    return { name: '', point: '10', description: '' }
  }
  return {
    name: String(item.name ?? ''),
    point: String(item.point ?? 0),
    description: String(item.description ?? ''),
  }
}

function toRecordFormValues(item: DisciplineRecord | null): RecordFormValues {
  if (!item) {
    return {
      student_id: '',
      discipline_category_id: '',
      incident_date: '',
      description: '',
      action_taken: '',
    }
  }

  return {
    student_id: String(item.student_id ?? ''),
    discipline_category_id: String(item.discipline_category_id ?? ''),
    incident_date: normalizeDateInput(item.incident_date),
    description: String(item.description ?? ''),
    action_taken: String(item.action_taken ?? ''),
  }
}

function toCategoryPayload(values: CategoryFormValues) {
  return {
    name: values.name.trim(),
    point: Number(values.point),
    description: values.description.trim(),
  }
}

function toRecordPayload(values: RecordFormValues) {
  return {
    student_id: Number(values.student_id),
    discipline_category_id: Number(values.discipline_category_id),
    incident_date: values.incident_date,
    description: values.description.trim(),
    action_taken: values.action_taken.trim(),
  }
}

function PointBadge({ value }: { value: unknown }) {
  const point = Number(value ?? 0)
  if (point >= 70) {
    return <span className="inline-status inline-status--inactive">{point} pts</span>
  }
  if (point >= 30) {
    return <span className="inline-status inline-status--soft">{point} pts</span>
  }
  return <span className="inline-status inline-status--male">{point} pts</span>
}

export function DisciplinePage() {
  const [categories, setCategories] = useState<DisciplineCategoryRecord[]>([])
  const [overviewRecords, setOverviewRecords] = useState<DisciplineRecord[]>([])
  const [records, setRecords] = useState<DisciplineRecord[]>([])
  const [studentOptions, setStudentOptions] = useState<StaticOption[]>([])
  const [categoryOptions, setCategoryOptions] = useState<StaticOption[]>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [recordSearch, setRecordSearch] = useState('')
  const deferredCategorySearch = useDeferredValue(categorySearch)
  const deferredRecordSearch = useDeferredValue(recordSearch)
  const [studentFilter, setStudentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [incidentDateFilter, setIncidentDateFilter] = useState('')
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [submittingCategory, setSubmittingCategory] = useState(false)
  const [submittingRecord, setSubmittingRecord] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DisciplineCategoryRecord | null>(null)
  const [editingRecord, setEditingRecord] = useState<DisciplineRecord | null>(null)
  const [categoryFormValues, setCategoryFormValues] = useState<CategoryFormValues>(toCategoryFormValues(null))
  const [recordFormValues, setRecordFormValues] = useState<RecordFormValues>(toRecordFormValues(null))

  const recordQuery = useMemo(() => {
    const query: Record<string, number | string> = {}
    if (studentFilter) query.student_id = Number(studentFilter)
    if (categoryFilter) query.discipline_category_id = Number(categoryFilter)
    if (incidentDateFilter) query.incident_date = incidentDateFilter
    return query
  }, [categoryFilter, incidentDateFilter, studentFilter])

  const totalPointsCatalog = useMemo(
    () => categories.reduce((total, item) => total + Number(item.point ?? 0), 0),
    [categories],
  )
  const studentCoverage = useMemo(
    () => new Set(overviewRecords.map((item) => String(item.student_full_name ?? '')).filter(Boolean)).size,
    [overviewRecords],
  )
  const highSeverityCount = useMemo(
    () => overviewRecords.filter((item) => Number(item.point ?? 0) >= 70).length,
    [overviewRecords],
  )

  async function refreshCategories(searchValue = deferredCategorySearch) {
    setLoadingCategories(true)
    try {
      const result = await listResource<DisciplineCategoryRecord>(categoriesEndpoint, searchValue)
      setCategories(result.items)
      setCategoryOptions(
        result.items.map((item) => ({
          label: `${String(item.name ?? '-')} · ${String(item.point ?? 0)} pts`,
          value: String(item.id ?? ''),
        })),
      )
    } finally {
      setLoadingCategories(false)
    }
  }

  async function refreshRecords(searchValue = deferredRecordSearch, query = recordQuery) {
    setLoadingRecords(true)
    try {
      const [listResult, overviewResult] = await Promise.all([
        listResource<DisciplineRecord>(recordsEndpoint, searchValue, query),
        listResource<DisciplineRecord>(recordsEndpoint),
      ])
      setRecords(listResult.items)
      setOverviewRecords(overviewResult.items)
    } finally {
      setLoadingRecords(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function syncBaseOptions() {
      try {
        const students = await listOptions('/student-affairs/students')
        if (!isMounted) return
        setStudentOptions(
          students.map((item) => ({
            label: `${String(item.full_name ?? '-')} · ${String(item.nis ?? 'Tanpa NIS')}`,
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      }
    }

    void syncBaseOptions()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    async function syncCategories() {
      setLoadingCategories(true)
      try {
        const result = await listResource<DisciplineCategoryRecord>(categoriesEndpoint, deferredCategorySearch)
        if (!isMounted) return
        setCategories(result.items)
        setCategoryOptions(
          result.items.map((item) => ({
            label: `${String(item.name ?? '-')} · ${String(item.point ?? 0)} pts`,
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoadingCategories(false)
      }
    }

    void syncCategories()
    return () => {
      isMounted = false
    }
  }, [deferredCategorySearch])

  useEffect(() => {
    let isMounted = true
    async function syncRecords() {
      setLoadingRecords(true)
      try {
        const [listResult, overviewResult] = await Promise.all([
          listResource<DisciplineRecord>(recordsEndpoint, deferredRecordSearch, recordQuery),
          listResource<DisciplineRecord>(recordsEndpoint),
        ])
        if (!isMounted) return
        setRecords(listResult.items)
        setOverviewRecords(overviewResult.items)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoadingRecords(false)
      }
    }

    void syncRecords()
    return () => {
      isMounted = false
    }
  }, [deferredRecordSearch, recordQuery])

  function handleCreateCategory() {
    startTransition(() => {
      setEditingCategory(null)
      setCategoryFormValues(toCategoryFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setCategoryModalOpen(true)
    })
  }

  function handleEditCategory(item: DisciplineCategoryRecord) {
    startTransition(() => {
      setEditingCategory(item)
      setCategoryFormValues(toCategoryFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setCategoryModalOpen(true)
    })
  }

  function handleCreateRecord() {
    startTransition(() => {
      setEditingRecord(null)
      setRecordFormValues(toRecordFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setRecordModalOpen(true)
    })
  }

  function handleEditRecord(item: DisciplineRecord) {
    startTransition(() => {
      setEditingRecord(item)
      setRecordFormValues(toRecordFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setRecordModalOpen(true)
    })
  }

  async function handleDeleteCategory(item: DisciplineCategoryRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus kategori disiplin ${item.name ?? ''}?`)
    if (!confirmed) return

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(categoriesEndpoint, Number(item.id))
      setSuccessMessage('Kategori disiplin berhasil dihapus.')
      await refreshCategories()
      await refreshRecords()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleDeleteRecord(item: DisciplineRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus catatan disiplin ${item.student_full_name ?? ''}?`)
    if (!confirmed) return

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(recordsEndpoint, Number(item.id))
      setSuccessMessage('Catatan disiplin berhasil dihapus.')
      await refreshRecords()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmittingCategory(true)
      setErrorMessage('')
      setSuccessMessage('')
      const payload = toCategoryPayload(categoryFormValues)
      if (editingCategory?.id) {
        await updateResource(categoriesEndpoint, Number(editingCategory.id), payload)
        setSuccessMessage('Kategori disiplin berhasil diperbarui.')
      } else {
        await createResource(categoriesEndpoint, payload)
        setSuccessMessage('Kategori disiplin berhasil dibuat.')
      }
      setCategoryModalOpen(false)
      await refreshCategories()
      await refreshRecords()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmittingCategory(false)
    }
  }

  async function handleRecordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmittingRecord(true)
      setErrorMessage('')
      setSuccessMessage('')
      const payload = toRecordPayload(recordFormValues)
      if (editingRecord?.id) {
        await updateResource(recordsEndpoint, Number(editingRecord.id), payload)
        setSuccessMessage('Catatan disiplin berhasil diperbarui.')
      } else {
        await createResource(recordsEndpoint, payload)
        setSuccessMessage('Catatan disiplin berhasil dibuat.')
      }
      setRecordModalOpen(false)
      await refreshRecords()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmittingRecord(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">Kesiswaan</p>
          <h1 className="page-header__title">Discipline</h1>
          <p className="page-header__description">
            Kelola kategori pelanggaran dan catatan disiplin siswa dalam satu tempat agar tindak lanjut kesiswaan lebih
            terstruktur.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button-secondary" onClick={handleCreateCategory} type="button">
            <Plus size={18} />
            &nbsp;Tambah Kategori
          </button>
          <button className="button" onClick={handleCreateRecord} type="button">
            <Plus size={18} />
            &nbsp;Tambah Catatan
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <ShieldAlert size={18} />
          </div>
          <div>
            <div className="stat-card__label">Categories</div>
            <div className="stat-card__value">{categories.length}</div>
            <div className="stat-card__copy">Katalog kategori pelanggaran yang bisa dipakai operator kesiswaan.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="stat-card__label">Records & High Severity</div>
            <div className="stat-card__value stat-card__value--compact">{overviewRecords.length} records</div>
            <div className="stat-card__copy">{highSeverityCount} catatan berada di kategori poin tinggi.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Coverage</div>
            <div className="stat-card__value stat-card__value--compact">{studentCoverage} siswa</div>
            <div className="stat-card__copy">Total katalog poin saat ini mencapai {totalPointsCatalog} poin.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div>
            <p className="page-header__eyebrow">Kategori Pelanggaran</p>
            <h2 className="panel-heading">Discipline Categories</h2>
          </div>
          <div className="toolbar__actions">
            <label className="toolbar__search">
              <Search size={18} />
              <input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Cari nama kategori atau deskripsi..."
                type="search"
              />
            </label>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Poin</th>
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingCategories ? (
                <tr>
                  <td className="table-empty" colSpan={4}>
                    <LoaderCircle className="spin" size={18} /> Memuat kategori disiplin...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={4}>
                    Belum ada kategori disiplin yang cocok dengan pencarian saat ini.
                  </td>
                </tr>
              ) : (
                categories.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.name ?? '-')}</div>
                    </td>
                    <td>
                      <PointBadge value={item.point} />
                    </td>
                    <td>
                      <div className="cell-subtitle">{String(item.description ?? 'Tanpa deskripsi')}</div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditCategory(item)} type="button">
                          <PencilLine size={16} />
                        </button>
                        <button
                          className="icon-button icon-button--danger"
                          onClick={() => handleDeleteCategory(item)}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
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
            <p className="page-header__eyebrow">Catatan Kedisiplinan</p>
            <h2 className="panel-heading">Discipline Records</h2>
          </div>

          <div className="toolbar__actions">
            <label className="toolbar__search">
              <Search size={18} />
              <input
                value={recordSearch}
                onChange={(event) => setRecordSearch(event.target.value)}
                placeholder="Cari siswa, kategori, deskripsi, atau tindakan..."
                type="search"
              />
            </label>

            <div className="toolbar__filters">
              <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                <option value="">Semua siswa</option>
                {studentOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">Semua kategori</option>
                {categoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={incidentDateFilter}
                onChange={(event) => setIncidentDateFilter(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Tindakan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr>
                  <td className="table-empty" colSpan={6}>
                    <LoaderCircle className="spin" size={18} /> Memuat catatan disiplin...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={6}>
                    Belum ada catatan disiplin yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                records.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.student_full_name ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.student_nis ?? 'Tanpa NIS')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.discipline_category_name ?? '-')}</div>
                      <div className="cell-subtitle">
                        <PointBadge value={item.point} />
                      </div>
                    </td>
                    <td>
                      <div className="cell-title">{formatDateLabel(item.incident_date)}</div>
                      <div className="cell-subtitle">{String(item.recorded_by_name ?? 'Belum dicatat user')}</div>
                    </td>
                    <td>
                      <div className="cell-subtitle">{String(item.description ?? 'Tanpa deskripsi')}</div>
                    </td>
                    <td>
                      <div className="cell-subtitle">{String(item.action_taken ?? 'Belum ada tindakan')}</div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditRecord(item)} type="button">
                          <PencilLine size={16} />
                        </button>
                        <button
                          className="icon-button icon-button--danger"
                          onClick={() => handleDeleteRecord(item)}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {categoryModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-card__header">
              <p className="page-header__eyebrow">Discipline Category</p>
              <h2 className="panel-heading">{editingCategory ? 'Edit Kategori Disiplin' : 'Tambah Kategori Disiplin'}</h2>
            </div>

            <form onSubmit={handleCategorySubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Nama Kategori</span>
                  <input
                    value={categoryFormValues.name}
                    onChange={(event) =>
                      setCategoryFormValues((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Mis. Terlambat, Seragam, atau Perilaku"
                    required
                    type="text"
                  />
                </label>

                <label className="form-field">
                  <span>Poin</span>
                  <input
                    value={categoryFormValues.point}
                    onChange={(event) =>
                      setCategoryFormValues((current) => ({ ...current, point: event.target.value }))
                    }
                    min={0}
                    required
                    type="number"
                  />
                </label>

                <label className="form-field form-field--full">
                  <span>Deskripsi</span>
                  <textarea
                    rows={4}
                    value={categoryFormValues.description}
                    onChange={(event) =>
                      setCategoryFormValues((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Jelaskan kapan kategori ini dipakai oleh operator kesiswaan."
                  />
                </label>
              </div>

              <div className="form-actions">
                <button className="button-ghost" onClick={() => setCategoryModalOpen(false)} type="button">
                  Batal
                </button>
                <button className="button" disabled={submittingCategory} type="submit">
                  {submittingCategory ? <LoaderCircle className="spin" size={18} /> : null}
                  {submittingCategory ? ' Menyimpan...' : ' Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {recordModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-card__header">
              <p className="page-header__eyebrow">Discipline Record</p>
              <h2 className="panel-heading">{editingRecord ? 'Edit Catatan Disiplin' : 'Tambah Catatan Disiplin'}</h2>
            </div>

            <form onSubmit={handleRecordSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Siswa</span>
                  <select
                    value={recordFormValues.student_id}
                    onChange={(event) =>
                      setRecordFormValues((current) => ({ ...current, student_id: event.target.value }))
                    }
                    required
                  >
                    <option value="">Pilih siswa</option>
                    {studentOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Kategori</span>
                  <select
                    value={recordFormValues.discipline_category_id}
                    onChange={(event) =>
                      setRecordFormValues((current) => ({
                        ...current,
                        discipline_category_id: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Pilih kategori</option>
                    {categoryOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Tanggal Kejadian</span>
                  <input
                    value={recordFormValues.incident_date}
                    onChange={(event) =>
                      setRecordFormValues((current) => ({ ...current, incident_date: event.target.value }))
                    }
                    required
                    type="date"
                  />
                </label>

                <label className="form-field form-field--full">
                  <span>Deskripsi</span>
                  <textarea
                    rows={4}
                    value={recordFormValues.description}
                    onChange={(event) =>
                      setRecordFormValues((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Ceritakan kejadian yang terjadi."
                  />
                </label>

                <label className="form-field form-field--full">
                  <span>Tindakan</span>
                  <textarea
                    rows={4}
                    value={recordFormValues.action_taken}
                    onChange={(event) =>
                      setRecordFormValues((current) => ({ ...current, action_taken: event.target.value }))
                    }
                    placeholder="Tulis tindak lanjut atau pembinaan yang diberikan."
                  />
                </label>
              </div>

              <div className="form-actions">
                <button className="button-ghost" onClick={() => setRecordModalOpen(false)} type="button">
                  Batal
                </button>
                <button className="button" disabled={submittingRecord} type="submit">
                  {submittingRecord ? <LoaderCircle className="spin" size={18} /> : null}
                  {submittingRecord ? ' Menyimpan...' : ' Simpan Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
