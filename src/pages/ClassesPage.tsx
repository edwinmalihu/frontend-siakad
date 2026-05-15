import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FolderKanban, LayoutList, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
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

type ClassRecord = ResourceRecord & {
  id?: number
  academic_year_id?: number
  academic_year_name?: string
  department_id?: number
  department_code?: string
  department_name?: string
  grade_level_id?: number
  grade_level_code?: string
  grade_level_name?: string
  name?: string
  is_active?: boolean
}

type StatusFilter = 'all' | 'active' | 'inactive'

type FormValues = {
  academic_year_id: string
  department_id: string
  grade_level_id: string
  name: string
  is_active: boolean
}

const config = resourceConfigs.classes

function toFormValues(item: ClassRecord | null): FormValues {
  if (!item) {
    return {
      academic_year_id: '',
      department_id: '',
      grade_level_id: '',
      name: '',
      is_active: true,
    }
  }

  return {
    academic_year_id: String(item.academic_year_id ?? ''),
    department_id: String(item.department_id ?? ''),
    grade_level_id: String(item.grade_level_id ?? ''),
    name: String(item.name ?? ''),
    is_active: Boolean(item.is_active),
  }
}

function toPayload(values: FormValues) {
  return {
    academic_year_id: Number(values.academic_year_id),
    department_id: Number(values.department_id),
    grade_level_id: Number(values.grade_level_id),
    name: values.name.trim(),
    is_active: values.is_active,
  }
}

export function ClassesPage() {
  const [items, setItems] = useState<ClassRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<ClassRecord[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<StaticOption[]>([])
  const [gradeLevelOptions, setGradeLevelOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ClassRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, string | number | boolean> = {}

    if (statusFilter !== 'all') {
      query.is_active = statusFilter === 'active'
    }

    if (academicYearFilter) {
      query.academic_year_id = Number(academicYearFilter)
    }

    if (departmentFilter) {
      query.department_id = Number(departmentFilter)
    }

    return query
  }, [academicYearFilter, departmentFilter, statusFilter])

  const activeClassesCount = useMemo(
    () => overviewItems.filter((item) => Boolean(item.is_active)).length,
    [overviewItems],
  )

  const departmentCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.department_code ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const academicYearCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.academic_year_name ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  async function fetchClasses(searchValue: string, query: Record<string, string | number | boolean>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<ClassRecord>(config.endpoint, searchValue, query),
      listResource<ClassRecord>(config.endpoint),
    ])

    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchClasses(deferredSearch, filterQuery)
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

    async function syncClasses() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchClasses(deferredSearch, filterQuery)
        if (!isMounted) {
          return
        }

        setItems(listResult.items)
        setOverviewItems(overviewResult.items)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void syncClasses()

    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true

    async function syncOptions() {
      try {
        const [academicYears, departments, gradeLevels] = await Promise.all([
          listOptions('/master/academic-years'),
          listOptions('/master/departments'),
          listOptions('/master/grade-levels'),
        ])

        if (!isMounted) {
          return
        }

        setAcademicYearOptions(
          academicYears.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
        setDepartmentOptions(
          departments.map((item) => ({
            label: `${String(item.code ?? '-') } · ${String(item.name ?? '-')}`,
            value: String(item.id ?? ''),
          })),
        )
        setGradeLevelOptions(
          gradeLevels.map((item) => ({
            label: `${String(item.code ?? '-') } · ${String(item.name ?? '-')}`,
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) {
          return
        }

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

  function handleEditClick(item: ClassRecord) {
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

  async function handleDelete(item: ClassRecord) {
    if (!item.id) {
      return
    }

    const confirmed = window.confirm(`Hapus kelas ${item.name ?? ''}?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Kelas berhasil dihapus.')
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleSetActive(item: ClassRecord) {
    if (!item.id || !item.academic_year_id || !item.department_id || !item.grade_level_id) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await updateResource(config.endpoint, Number(item.id), {
        academic_year_id: Number(item.academic_year_id),
        department_id: Number(item.department_id),
        grade_level_id: Number(item.grade_level_id),
        name: String(item.name ?? ''),
        is_active: true,
      })
      setSuccessMessage(`Kelas ${item.name ?? ''} sekarang aktif.`)
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
        setSuccessMessage('Kelas berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Kelas berhasil dibuat.')
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
    academicYearOptions.length > 0 && departmentOptions.length > 0 && gradeLevelOptions.length > 0

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
            &nbsp;Tambah Kelas
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <LayoutList size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Kelas</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Semua struktur kelas yang dipakai oleh modul akademik.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Kelas Aktif</div>
            <div className="stat-card__value">{activeClassesCount}</div>
            <div className="stat-card__copy">Siap dipakai untuk enrollment, jadwal, dan wali kelas.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <FolderKanban size={18} />
          </div>
          <div>
            <div className="stat-card__label">Coverage</div>
            <div className="stat-card__value stat-card__value--compact">{departmentCoverage} jurusan</div>
            <div className="stat-card__copy">{academicYearCoverage} tahun ajaran sudah memiliki struktur kelas.</div>
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
            <button
              className={`segmented-button ${statusFilter === 'all' ? 'segmented-button--active' : ''}`}
              onClick={() => setStatusFilter('all')}
              type="button"
            >
              Semua
            </button>
            <button
              className={`segmented-button ${statusFilter === 'active' ? 'segmented-button--active' : ''}`}
              onClick={() => setStatusFilter('active')}
              type="button"
            >
              Aktif
            </button>
            <button
              className={`segmented-button ${statusFilter === 'inactive' ? 'segmented-button--active' : ''}`}
              onClick={() => setStatusFilter('inactive')}
              type="button"
            >
              Nonaktif
            </button>
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

            <select
              className="toolbar-select"
              onChange={(event) => setDepartmentFilter(event.target.value)}
              value={departmentFilter}
            >
              <option value="">Semua Jurusan</option>
              {departmentOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
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
              Pastikan tahun ajaran, jurusan, dan tingkat sudah tersedia, lalu mulai bentuk struktur kelas aktif per periode.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kelas</th>
                  <th>Tahun Ajaran</th>
                  <th>Jurusan</th>
                  <th>Tingkat</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.name ?? '-')}</div>
                    </td>
                    <td>{String(item.academic_year_name ?? '-')}</td>
                    <td>
                      <div className="cell-title">{String(item.department_code ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.department_name ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.grade_level_code ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.grade_level_name ?? '-')}</div>
                    </td>
                    <td>
                      {item.is_active ? (
                        <span className="inline-status inline-status--active">Active</span>
                      ) : (
                        <span className="inline-status inline-status--inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        {!item.is_active ? (
                          <button
                            className="table-action table-action--success"
                            onClick={() => handleSetActive(item)}
                            title="Set aktif"
                            type="button"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        ) : null}
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
              <h2 className="modal-title">{editingItem ? 'Edit Class' : 'Create Class'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui struktur kelas yang sudah ada tanpa keluar dari konteks master data.'
                  : 'Bentuk kelas baru dengan mengikat tahun ajaran, jurusan, dan tingkat yang sudah tersedia.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
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
                  <label htmlFor="department_id">Department *</label>
                  <select
                    id="department_id"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, department_id: event.target.value }))
                    }
                    required
                    value={formValues.department_id}
                  >
                    <option value="">Pilih Department</option>
                    {departmentOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="grade_level_id">Grade Level *</label>
                  <select
                    id="grade_level_id"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, grade_level_id: event.target.value }))
                    }
                    required
                    value={formValues.grade_level_id}
                  >
                    <option value="">Pilih Grade Level</option>
                    {gradeLevelOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="name">Class Name *</label>
                  <input
                    id="name"
                    onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                    placeholder="A"
                    required
                    type="text"
                    value={formValues.name}
                  />
                </div>

                <div className="field field--full">
                  <label className="checkbox-field">
                    <input
                      checked={formValues.is_active}
                      onChange={(event) =>
                        setFormValues((current) => ({ ...current, is_active: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span>Class is active</span>
                  </label>
                  {!optionsReady ? <small>Lengkapi master `Academic Year`, `Department`, dan `Grade Level` terlebih dahulu.</small> : null}
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting || !optionsReady} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
