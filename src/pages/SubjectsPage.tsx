import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, FolderKanban, Layers3, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
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

type SubjectRecord = ResourceRecord & {
  id?: number
  department_id?: number
  department_code?: string
  department_name?: string
  grade_level_id?: number
  grade_level_code?: string
  grade_level_name?: string
  code?: string
  name?: string
  subject_type?: string
  kkm?: number | null
}

type FormValues = {
  department_id: string
  grade_level_id: string
  code: string
  name: string
  subject_type: string
  kkm: string
}

const config = resourceConfigs.subjects

function toFormValues(item: SubjectRecord | null): FormValues {
  if (!item) {
    return {
      department_id: '',
      grade_level_id: '',
      code: '',
      name: '',
      subject_type: '',
      kkm: '',
    }
  }

  return {
    department_id: String(item.department_id ?? ''),
    grade_level_id: String(item.grade_level_id ?? ''),
    code: String(item.code ?? ''),
    name: String(item.name ?? ''),
    subject_type: String(item.subject_type ?? ''),
    kkm: item.kkm === null || item.kkm === undefined ? '' : String(item.kkm),
  }
}

function toPayload(values: FormValues) {
  return {
    department_id: Number(values.department_id),
    grade_level_id: Number(values.grade_level_id),
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    subject_type: values.subject_type.trim(),
    kkm: values.kkm.trim() === '' ? null : Number(values.kkm),
  }
}

export function SubjectsPage() {
  const [items, setItems] = useState<SubjectRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<SubjectRecord[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<StaticOption[]>([])
  const [gradeLevelOptions, setGradeLevelOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [gradeLevelFilter, setGradeLevelFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SubjectRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number> = {}

    if (departmentFilter) {
      query.department_id = Number(departmentFilter)
    }

    if (gradeLevelFilter) {
      query.grade_level_id = Number(gradeLevelFilter)
    }

    return query
  }, [departmentFilter, gradeLevelFilter])

  const departmentCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.department_code ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const gradeLevelCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.grade_level_code ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const kkmCoverage = useMemo(
    () => overviewItems.filter((item) => item.kkm !== null && item.kkm !== undefined).length,
    [overviewItems],
  )

  async function fetchSubjects(searchValue: string, query: Record<string, number>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<SubjectRecord>(config.endpoint, searchValue, query),
      listResource<SubjectRecord>(config.endpoint),
    ])

    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchSubjects(deferredSearch, filterQuery)
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

    async function syncSubjects() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchSubjects(deferredSearch, filterQuery)
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

    void syncSubjects()

    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  useEffect(() => {
    let isMounted = true

    async function syncOptions() {
      try {
        const [departments, gradeLevels] = await Promise.all([
          listOptions('/master/departments'),
          listOptions('/master/grade-levels'),
        ])

        if (!isMounted) {
          return
        }

        setDepartmentOptions(
          departments.map((item) => ({
            label: `${String(item.code ?? '-')} · ${String(item.name ?? '-')}`,
            value: String(item.id ?? ''),
          })),
        )
        setGradeLevelOptions(
          gradeLevels.map((item) => ({
            label: `${String(item.code ?? '-')} · ${String(item.name ?? '-')}`,
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

  function handleEditClick(item: SubjectRecord) {
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

  async function handleDelete(item: SubjectRecord) {
    if (!item.id) {
      return
    }

    const confirmed = window.confirm(`Hapus mata pelajaran ${item.name ?? ''}?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Mata pelajaran berhasil dihapus.')
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
        setSuccessMessage('Mata pelajaran berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Mata pelajaran berhasil dibuat.')
      }

      setModalOpen(false)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const optionsReady = departmentOptions.length > 0 && gradeLevelOptions.length > 0

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
            &nbsp;Tambah Subject
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <BookOpenCheck size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Subjects</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Daftar mapel yang akan dipakai untuk jadwal dan penilaian.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <FolderKanban size={18} />
          </div>
          <div>
            <div className="stat-card__label">Department Coverage</div>
            <div className="stat-card__value">{departmentCoverage}</div>
            <div className="stat-card__copy">Jurusan yang sudah memiliki pemetaan mata pelajaran.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <Layers3 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Grade & KKM</div>
            <div className="stat-card__value stat-card__value--compact">{gradeLevelCoverage} tingkat</div>
            <div className="stat-card__copy">{kkmCoverage} subject sudah memiliki nilai KKM.</div>
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

            <select
              className="toolbar-select"
              onChange={(event) => setGradeLevelFilter(event.target.value)}
              value={gradeLevelFilter}
            >
              <option value="">Semua Tingkat</option>
              {gradeLevelOptions.map((option) => (
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
              Lengkapi jurusan dan tingkat dulu, lalu masukkan daftar mapel inti agar jadwal dan penilaian bisa tersusun dengan rapi.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject</th>
                  <th>Department</th>
                  <th>Grade Level</th>
                  <th>Type</th>
                  <th>KKM</th>
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
                    <td>
                      <div className="cell-title">{String(item.department_code ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.department_name ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.grade_level_code ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.grade_level_name ?? '-')}</div>
                    </td>
                    <td>{String(item.subject_type ?? '-')}</td>
                    <td>{item.kkm === null || item.kkm === undefined ? '-' : String(item.kkm)}</td>
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
              <h2 className="modal-title">{editingItem ? 'Edit Subject' : 'Create Subject'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui mapel tanpa keluar dari konteks akademik.'
                  : 'Tambahkan mata pelajaran baru dan kaitkan langsung ke jurusan serta tingkat yang sesuai.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
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
                  <label htmlFor="code">Subject Code *</label>
                  <input
                    id="code"
                    onChange={(event) => setFormValues((current) => ({ ...current, code: event.target.value }))}
                    placeholder="MTK-X"
                    required
                    type="text"
                    value={formValues.code}
                  />
                </div>

                <div className="field">
                  <label htmlFor="name">Subject Name *</label>
                  <input
                    id="name"
                    onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Matematika"
                    required
                    type="text"
                    value={formValues.name}
                  />
                </div>

                <div className="field">
                  <label htmlFor="subject_type">Subject Type</label>
                  <input
                    id="subject_type"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, subject_type: event.target.value }))
                    }
                    placeholder="teori"
                    type="text"
                    value={formValues.subject_type}
                  />
                </div>

                <div className="field">
                  <label htmlFor="kkm">KKM</label>
                  <input
                    id="kkm"
                    max={100}
                    min={0}
                    onChange={(event) => setFormValues((current) => ({ ...current, kkm: event.target.value }))}
                    placeholder="75"
                    step="0.01"
                    type="number"
                    value={formValues.kkm}
                  />
                  {!optionsReady ? <small>Lengkapi `Department` dan `Grade Level` terlebih dahulu.</small> : null}
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting || !optionsReady} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
