import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarRange, CheckCircle2, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { ImportExportPanel } from '../components/ImportExportPanel'
import { createResource, deleteResource, extractError, listResource, updateResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'
import { resourceConfigs } from '../config/resources'

type AcademicYearRecord = ResourceRecord & {
  id?: number
  name?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
}

type StatusFilter = 'all' | 'active' | 'inactive'

type FormValues = {
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}

const config = resourceConfigs.academicYears

const formatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

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

function toFormValues(item: AcademicYearRecord | null): FormValues {
  if (!item) {
    return {
      name: '',
      start_date: '',
      end_date: '',
      is_active: false,
    }
  }

  return {
    name: String(item.name ?? ''),
    start_date: normalizeDateInput(item.start_date),
    end_date: normalizeDateInput(item.end_date),
    is_active: Boolean(item.is_active),
  }
}

function toPayload(values: FormValues) {
  return {
    name: values.name.trim(),
    start_date: values.start_date,
    end_date: values.end_date,
    is_active: values.is_active,
  }
}

export function AcademicYearsPage() {
  const [items, setItems] = useState<AcademicYearRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<AcademicYearRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AcademicYearRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    if (statusFilter === 'all') {
      return undefined
    }

    return { is_active: statusFilter === 'active' }
  }, [statusFilter])

  const activeAcademicYear = useMemo(
    () => overviewItems.find((item) => Boolean(item.is_active)) ?? null,
    [overviewItems],
  )

  const newestAcademicYear = useMemo(() => overviewItems[0] ?? null, [overviewItems])

  async function fetchAcademicYears(searchValue: string, query?: { is_active: boolean }) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<AcademicYearRecord>(config.endpoint, searchValue, query),
      listResource<AcademicYearRecord>(config.endpoint),
    ])

    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchAcademicYears(deferredSearch, filterQuery)
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

    async function syncAcademicYears() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchAcademicYears(deferredSearch, filterQuery)
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

    void syncAcademicYears()

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

  function handleEditClick(item: AcademicYearRecord) {
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

  async function handleDelete(item: AcademicYearRecord) {
    if (!item.id) {
      return
    }

    const confirmed = window.confirm(`Hapus tahun ajaran ${item.name ?? ''}?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Tahun ajaran berhasil dihapus.')
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleSetActive(item: AcademicYearRecord) {
    if (!item.id) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await updateResource(config.endpoint, Number(item.id), {
        name: String(item.name ?? ''),
        start_date: normalizeDateInput(item.start_date),
        end_date: normalizeDateInput(item.end_date),
        is_active: true,
      })
      setSuccessMessage(`Tahun ajaran ${item.name ?? ''} sekarang aktif.`)
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
        setSuccessMessage('Tahun ajaran berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Tahun ajaran berhasil dibuat.')
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
          <ImportExportPanel module="academic-years" label="Tahun Ajaran" onImportSuccess={refreshList} />
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Tahun Ajaran
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Tahun Ajaran</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Semua periode akademik yang masih tersimpan.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Tahun Ajaran Aktif</div>
            <div className="stat-card__value stat-card__value--compact">
              {activeAcademicYear?.name ?? 'Belum ditetapkan'}
            </div>
            <div className="stat-card__copy">
              {activeAcademicYear
                ? `${formatDateLabel(activeAcademicYear.start_date)} - ${formatDateLabel(activeAcademicYear.end_date)}`
                : 'Gunakan aksi aktifkan untuk menandai periode berjalan.'}
            </div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Periode Terbaru</div>
            <div className="stat-card__value stat-card__value--compact">
              {newestAcademicYear?.name ?? '-'}
            </div>
            <div className="stat-card__copy">
              {newestAcademicYear
                ? `${formatDateLabel(newestAcademicYear.start_date)} - ${formatDateLabel(newestAcademicYear.end_date)}`
                : 'Belum ada periode yang tersimpan.'}
            </div>
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

          <div className="toolbar__actions">
            <div className="chip">Hasil: {items.length}</div>
            <div className="chip">Aktif tersimpan: {overviewItems.filter((item) => item.is_active).length}</div>
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
              Tambahkan periode pertama agar modul semester, kelas, dan jadwal bisa mulai bergantung pada tahun ajaran yang jelas.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tahun Ajaran</th>
                  <th>Mulai</th>
                  <th>Selesai</th>
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
                    <td>{formatDateLabel(item.start_date)}</td>
                    <td>{formatDateLabel(item.end_date)}</td>
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
              <h2 className="modal-title">
                {editingItem ? 'Edit Academic Year' : 'Create Academic Year'}
              </h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui periode yang sudah ada sambil menjaga hanya satu tahun ajaran aktif.'
                  : 'Tambahkan periode akademik baru sebagai fondasi semester, kelas, dan jadwal.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field field--full">
                  <label htmlFor="name">Academic Year Name *</label>
                  <input
                    id="name"
                    onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                    placeholder="2026/2027"
                    required
                    type="text"
                    value={formValues.name}
                  />
                </div>

                <div className="field">
                  <label htmlFor="start_date">Start Date *</label>
                  <input
                    id="start_date"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, start_date: event.target.value }))
                    }
                    required
                    type="date"
                    value={formValues.start_date}
                  />
                </div>

                <div className="field">
                  <label htmlFor="end_date">End Date *</label>
                  <input
                    id="end_date"
                    onChange={(event) => setFormValues((current) => ({ ...current, end_date: event.target.value }))}
                    required
                    type="date"
                    value={formValues.end_date}
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
                    <span>Set as active academic year</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Tahun Ajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
