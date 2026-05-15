import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarRange, CheckCircle2, Layers3, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
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

type SemesterRecord = ResourceRecord & {
  id?: number
  academic_year_id?: number
  academic_year?: string
  name?: string
  code?: string
  is_active?: boolean
}

type StatusFilter = 'all' | 'active' | 'inactive'

type FormValues = {
  academic_year_id: string
  name: string
  code: string
  is_active: boolean
}

const config = resourceConfigs.semesters

function toFormValues(item: SemesterRecord | null): FormValues {
  if (!item) {
    return {
      academic_year_id: '',
      name: '',
      code: '',
      is_active: false,
    }
  }

  return {
    academic_year_id: String(item.academic_year_id ?? ''),
    name: String(item.name ?? ''),
    code: String(item.code ?? ''),
    is_active: Boolean(item.is_active),
  }
}

function toPayload(values: FormValues) {
  return {
    academic_year_id: Number(values.academic_year_id),
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    is_active: values.is_active,
  }
}

export function SemestersPage() {
  const [items, setItems] = useState<SemesterRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<SemesterRecord[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SemesterRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, string | number | boolean> = {}

    if (statusFilter !== 'all') {
      query.is_active = statusFilter === 'active'
    }

    if (academicYearFilter) {
      query.academic_year_id = Number(academicYearFilter)
    }

    return query
  }, [academicYearFilter, statusFilter])

  const activeSemester = useMemo(
    () => overviewItems.find((item) => Boolean(item.is_active)) ?? null,
    [overviewItems],
  )

  const academicYearCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.academic_year ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  async function fetchSemesters(searchValue: string, query: Record<string, string | number | boolean>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<SemesterRecord>(config.endpoint, searchValue, query),
      listResource<SemesterRecord>(config.endpoint),
    ])

    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchSemesters(deferredSearch, filterQuery)
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

    async function syncSemesters() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchSemesters(deferredSearch, filterQuery)
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

    void syncSemesters()

    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true

    async function syncAcademicYears() {
      try {
        const rows = await listOptions('/master/academic-years')
        if (!isMounted) {
          return
        }

        const options = rows.map((item) => ({
          label: String(item.name ?? '-'),
          value: String(item.id ?? ''),
        }))
        setAcademicYearOptions(options)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(extractError(error))
      }
    }

    void syncAcademicYears()

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

  function handleEditClick(item: SemesterRecord) {
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

  async function handleDelete(item: SemesterRecord) {
    if (!item.id) {
      return
    }

    const confirmed = window.confirm(`Hapus semester ${item.name ?? ''}?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Semester berhasil dihapus.')
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleSetActive(item: SemesterRecord) {
    if (!item.id || !item.academic_year_id) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await updateResource(config.endpoint, Number(item.id), {
        academic_year_id: Number(item.academic_year_id),
        name: String(item.name ?? ''),
        code: String(item.code ?? '').trim().toUpperCase(),
        is_active: true,
      })
      setSuccessMessage(`Semester ${item.name ?? ''} sekarang aktif.`)
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
        setSuccessMessage('Semester berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Semester berhasil dibuat.')
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
          <p className="page-header__eyebrow">{config.eyebrow}</p>
          <h1 className="page-header__title">{config.title}</h1>
          <p className="page-header__description">{config.description}</p>
        </div>

        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Semester
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Semester</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Semua semester yang masih aktif tersimpan di sistem.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Semester Aktif</div>
            <div className="stat-card__value stat-card__value--compact">
              {activeSemester?.name ?? 'Belum ditetapkan'}
            </div>
            <div className="stat-card__copy">
              {activeSemester
                ? `${activeSemester.code ?? '-'} · ${activeSemester.academic_year ?? '-'}`
                : 'Tetapkan satu semester aktif untuk semester berjalan.'}
            </div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <Layers3 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Coverage Tahun Ajaran</div>
            <div className="stat-card__value">{academicYearCoverage}</div>
            <div className="stat-card__copy">Jumlah tahun ajaran yang sudah memiliki semester.</div>
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
          </div>

          <div className="toolbar__actions">
            <div className="chip">Hasil: {items.length}</div>
            <div className="chip">Tahun ajaran tersedia: {academicYearOptions.length}</div>
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
              Buat tahun ajaran terlebih dahulu, lalu tambahkan semester ganjil atau genap agar modul kelas dan jadwal bisa mulai berjalan.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Semester</th>
                  <th>Tahun Ajaran</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <span className="inline-status inline-status--soft">{String(item.code ?? '-')}</span>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.name ?? '-')}</div>
                    </td>
                    <td>{String(item.academic_year ?? '-')}</td>
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
              <h2 className="modal-title">{editingItem ? 'Edit Semester' : 'Create Semester'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui semester yang sudah ada sambil menjaga hanya satu semester aktif.'
                  : 'Tambahkan semester baru dan kaitkan langsung ke tahun ajaran yang sesuai.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field field--full">
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
                  {academicYearOptions.length === 0 ? (
                    <small>Buat `Academic Year` dulu agar semester bisa dibuat.</small>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="name">Semester Name *</label>
                  <input
                    id="name"
                    onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Semester Ganjil"
                    required
                    type="text"
                    value={formValues.name}
                  />
                </div>

                <div className="field">
                  <label htmlFor="code">Semester Code *</label>
                  <input
                    id="code"
                    onChange={(event) => setFormValues((current) => ({ ...current, code: event.target.value }))}
                    placeholder="GANJIL"
                    required
                    type="text"
                    value={formValues.code}
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
                    <span>Set as active semester</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting || academicYearOptions.length === 0} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
