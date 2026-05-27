import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Factory, BriefcaseBusiness, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import {
  createResource,
  deleteResource,
  extractError,
  listOptions,
  listResource,
  updateResource,
} from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type InternshipLogRecord = ResourceRecord & {
  id?: number
  internship_id?: number
  student_name?: string
  company_name?: string
  log_date?: string
  activity?: string
  notes?: string
  supervisor_name?: string
}

type FormValues = {
  internship_id: string
  log_date: string
  activity: string
  notes: string
  supervisor_name: string
}

const endpoint = '/industry-relations/internship-logs'

function toFormValues(item: InternshipLogRecord | null): FormValues {
  if (!item) {
    return { internship_id: '', log_date: '', activity: '', notes: '', supervisor_name: '' }
  }
  return {
    internship_id: String(item.internship_id ?? ''),
    log_date: item.log_date ? item.log_date.slice(0, 10) : '',
    activity: String(item.activity ?? ''),
    notes: String(item.notes ?? ''),
    supervisor_name: String(item.supervisor_name ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    internship_id: Number(values.internship_id),
    log_date: values.log_date,
    activity: values.activity.trim(),
    notes: values.notes.trim(),
    supervisor_name: values.supervisor_name.trim(),
  }
}

export function InternshipLogsPage() {
  const [items, setItems] = useState<InternshipLogRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<InternshipLogRecord[]>([])
  const [internshipOptions, setInternshipOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [internshipFilter, setInternshipFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InternshipLogRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number> = {}
    if (internshipFilter) query.internship_id = Number(internshipFilter)
    return query
  }, [internshipFilter])

  const uniqueStudents = useMemo(() => {
    return new Set(overviewItems.map((i) => String(i.student_name ?? '')).filter(Boolean)).size
  }, [overviewItems])

  async function fetchItems(searchValue: string, query: Record<string, number>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<InternshipLogRecord>(endpoint, searchValue, query),
      listResource<InternshipLogRecord>(endpoint),
    ])
    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchItems(deferredSearch, filterQuery)
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
    async function syncItems() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchItems(deferredSearch, filterQuery)
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
    void syncItems()
    return () => { isMounted = false }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true
    async function syncOptions() {
      try {
        const internships = await listOptions('/industry-relations/internships')
        if (!isMounted) return
        setInternshipOptions(
          internships.map((item) => ({
            label: `${String(item.student_name ?? item.student_full_name ?? '-')} · ${String(item.company_name ?? '')}`,
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      }
    }
    void syncOptions()
    return () => { isMounted = false }
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

  function handleEditClick(item: InternshipLogRecord) {
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

  async function handleDelete(item: InternshipLogRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus log aktivitas "${item.activity ?? ''}"?`)
    if (!confirmed) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Log aktivitas berhasil dihapus.')
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
        setSuccessMessage('Log aktivitas berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Log aktivitas berhasil dibuat.')
      }
      setModalOpen(false)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const optionsReady = internshipOptions.length > 0

  function formatDate(value: string | undefined) {
    if (!value) return '-'
    return value.slice(0, 10)
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">HUBIM</p>
          <h1 className="page-header__title">Internship Logs</h1>
          <p className="page-header__description">Catat aktivitas harian siswa selama menjalani praktik kerja di perusahaan mitra.</p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Log
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <ClipboardList size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Logs</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Seluruh catatan aktivitas prakerin yang tercatat.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <Factory size={18} />
          </div>
          <div>
            <div className="stat-card__label">Companies</div>
            <div className="stat-card__value">
              {new Set(overviewItems.map((i) => String(i.company_name ?? '')).filter(Boolean)).size}
            </div>
            <div className="stat-card__copy">Perusahaan mitra yang memiliki catatan log.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <div className="stat-card__label">Students</div>
            <div className="stat-card__value">{uniqueStudents}</div>
            <div className="stat-card__copy">Siswa yang sudah memiliki catatan aktivitas.</div>
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
              placeholder="Cari nama siswa, perusahaan, aktivitas, atau supervisor…"
              value={search}
            />
          </div>
          <div className="toolbar__filters">
            <select
              className="toolbar-select"
              onChange={(event) => setInternshipFilter(event.target.value)}
              value={internshipFilter}
            >
              <option value="">Semua Prakerin</option>
              {internshipOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
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
          </div>
        ) : items.length === 0 ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Belum ada log aktivitas prakerin.</strong>
              Catat aktivitas harian siswa selama praktik kerja untuk dokumentasi kemajuan.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Company</th>
                  <th>Activity</th>
                  <th>Supervisor</th>
                  <th>Notes</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <span className="inline-status inline-status--soft">{formatDate(item.log_date)}</span>
                    </td>
                    <td>{String(item.student_name ?? '-')}</td>
                    <td>{String(item.company_name ?? '-')}</td>
                    <td>
                      <div className="cell-title">{String(item.activity ?? '-')}</div>
                    </td>
                    <td>{String(item.supervisor_name ?? '-')}</td>
                    <td>
                      <div className="cell-subtitle" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(item.notes ?? '-')}
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
              <h2 className="modal-title">{editingItem ? 'Edit Log Aktivitas' : 'Tambah Log Aktivitas'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui catatan aktivitas prakerin siswa.'
                  : 'Catat aktivitas harian siswa selama menjalani praktik kerja.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="internship_id">Prakerin *</label>
                  <select
                    id="internship_id"
                    onChange={(event) => setFormValues((current) => ({ ...current, internship_id: event.target.value }))}
                    required
                    value={formValues.internship_id}
                  >
                    <option value="">Pilih Prakerin</option>
                    {internshipOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="log_date">Tanggal *</label>
                  <input
                    id="log_date"
                    onChange={(event) => setFormValues((current) => ({ ...current, log_date: event.target.value }))}
                    required
                    type="date"
                    value={formValues.log_date}
                  />
                </div>

                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="activity">Aktivitas *</label>
                  <textarea
                    id="activity"
                    onChange={(event) => setFormValues((current) => ({ ...current, activity: event.target.value }))}
                    placeholder="Deskripsikan aktivitas harian siswa hari ini…"
                    required
                    rows={3}
                    value={formValues.activity}
                  />
                </div>

                <div className="field">
                  <label htmlFor="supervisor_name">Supervisor</label>
                  <input
                    id="supervisor_name"
                    onChange={(event) => setFormValues((current) => ({ ...current, supervisor_name: event.target.value }))}
                    placeholder="Nama supervisor di perusahaan"
                    type="text"
                    value={formValues.supervisor_name}
                  />
                </div>

                <div className="field">
                  <label htmlFor="notes">Catatan</label>
                  <input
                    id="notes"
                    onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Catatan tambahan (opsional)"
                    type="text"
                    value={formValues.notes}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting || !optionsReady} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
