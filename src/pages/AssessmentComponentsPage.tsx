import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, BookOpen, CalendarRange, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
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

type AssessmentComponentRecord = ResourceRecord & {
  id?: number
  subject_id?: number
  subject_code?: string
  subject_name?: string
  academic_year_id?: number
  academic_year_name?: string
  semester_id?: number
  semester_code?: string
  semester_name?: string
  name?: string
  weight?: number
}

type FormValues = {
  subject_id: string
  academic_year_id: string
  semester_id: string
  name: string
  weight: string
}

const config = resourceConfigs.assessmentComponents

function toFormValues(item: AssessmentComponentRecord | null): FormValues {
  if (!item) {
    return {
      subject_id: '',
      academic_year_id: '',
      semester_id: '',
      name: '',
      weight: '',
    }
  }

  return {
    subject_id: String(item.subject_id ?? ''),
    academic_year_id: String(item.academic_year_id ?? ''),
    semester_id: String(item.semester_id ?? ''),
    name: String(item.name ?? ''),
    weight: item.weight === null || item.weight === undefined ? '' : String(item.weight),
  }
}

function toPayload(values: FormValues) {
  return {
    subject_id: Number(values.subject_id),
    academic_year_id: Number(values.academic_year_id),
    semester_id: Number(values.semester_id),
    name: values.name.trim(),
    weight: Number(values.weight),
  }
}

export function AssessmentComponentsPage() {
  const [items, setItems] = useState<AssessmentComponentRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<AssessmentComponentRecord[]>([])
  const [subjectOptions, setSubjectOptions] = useState<StaticOption[]>([])
  const [academicYearOptions, setAcademicYearOptions] = useState<StaticOption[]>([])
  const [allSemesterOptions, setAllSemesterOptions] = useState<StaticOption[]>([])
  const [formSemesterOptions, setFormSemesterOptions] = useState<StaticOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AssessmentComponentRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, number> = {}
    if (subjectFilter) {
      query.subject_id = Number(subjectFilter)
    }
    if (academicYearFilter) {
      query.academic_year_id = Number(academicYearFilter)
    }
    if (semesterFilter) {
      query.semester_id = Number(semesterFilter)
    }
    return query
  }, [subjectFilter, academicYearFilter, semesterFilter])

  const subjectCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.subject_code ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const scopeCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => `${item.academic_year_id ?? ''}::${item.semester_id ?? ''}`)
        .filter((item) => item !== '::'),
    ).size
  }, [overviewItems])

  async function fetchItems(searchValue: string, query: Record<string, number>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<AssessmentComponentRecord>(config.endpoint, searchValue, query),
      listResource<AssessmentComponentRecord>(config.endpoint),
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
        const [subjects, academicYears, semesters] = await Promise.all([
          listOptions('/academic/subjects'),
          listOptions('/master/academic-years'),
          listOptions('/master/semesters'),
        ])

        if (!isMounted) return

        setSubjectOptions(
          subjects.map((item) => ({
            label: `${String(item.code ?? '-')} · ${String(item.name ?? '-')}`,
            value: String(item.id ?? ''),
          })),
        )
        setAcademicYearOptions(
          academicYears.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
        setAllSemesterOptions(
          semesters.map((item) => ({
            label: `${String(item.code ?? '-')} · ${String(item.name ?? '-')}`,
            value: String(item.id ?? ''),
            academic_year_id: item.academic_year_id,
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

  useEffect(() => {
    if (!formValues.academic_year_id) {
      setFormSemesterOptions([])
      return
    }
    setFormSemesterOptions(
      allSemesterOptions.filter(
        (opt) => String((opt as Record<string, unknown>).academic_year_id ?? '') === formValues.academic_year_id,
      ),
    )
  }, [formValues.academic_year_id, allSemesterOptions])

  function handleCreateClick() {
    startTransition(() => {
      setEditingItem(null)
      setFormValues(toFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleEditClick(item: AssessmentComponentRecord) {
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

  async function handleDelete(item: AssessmentComponentRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus komponen penilaian "${item.name ?? ''}"?`)
    if (!confirmed) return

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Komponen penilaian berhasil dihapus.')
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  function handleFormChange(field: string, value: string) {
    setFormValues((current) => {
      const next = { ...current, [field]: value }
      if (field === 'academic_year_id') {
        next.semester_id = ''
      }
      return next
    })
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
        setSuccessMessage('Komponen penilaian berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Komponen penilaian berhasil dibuat.')
      }

      setModalOpen(false)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const optionsReady = subjectOptions.length > 0 && academicYearOptions.length > 0

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
            &nbsp;Tambah Komponen
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <ClipboardCheck size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Components</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Komponen penilaian yang terdaftar di seluruh mata pelajaran.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="stat-card__label">Subject Coverage</div>
            <div className="stat-card__value">{subjectCoverage}</div>
            <div className="stat-card__copy">Mata pelajaran yang sudah memiliki komponen penilaian.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Scope Coverage</div>
            <div className="stat-card__value">{scopeCoverage}</div>
            <div className="stat-card__copy">Kombinasi tahun ajaran dan semester yang sudah terisi.</div>
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
              onChange={(event) => setSubjectFilter(event.target.value)}
              value={subjectFilter}
            >
              <option value="">Semua Mapel</option>
              {subjectOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="toolbar-select"
              onChange={(event) => setAcademicYearFilter(event.target.value)}
              value={academicYearFilter}
            >
              <option value="">Semua Tahun</option>
              {academicYearOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="toolbar-select"
              onChange={(event) => setSemesterFilter(event.target.value)}
              value={semesterFilter}
            >
              <option value="">Semua Semester</option>
              {allSemesterOptions.map((option) => (
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
              <strong>Belum ada komponen penilaian.</strong>
              Buat komponen seperti Tugas, UTS, UAS, atau Praktik untuk mulai mengisi nilai siswa.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Subject</th>
                  <th>Period</th>
                  <th>Weight</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.name ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.subject_code ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.subject_name ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.academic_year_name ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.semester_name ?? '-')}</div>
                    </td>
                    <td>
                      <span className="inline-status inline-status--soft">{String(item.weight ?? 0)}%</span>
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
              <h2 className="modal-title">{editingItem ? 'Edit Komponen' : 'Tambah Komponen'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui data komponen penilaian tanpa keluar dari konteks akademik.'
                  : 'Tentukan nama komponen, bobot, dan kaitkan ke mapel serta periode yang sesuai.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="subject_id">Mata Pelajaran *</label>
                  <select
                    id="subject_id"
                    onChange={(event) => handleFormChange('subject_id', event.target.value)}
                    required
                    value={formValues.subject_id}
                  >
                    <option value="">Pilih Mapel</option>
                    {subjectOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="academic_year_id">Tahun Ajaran *</label>
                  <select
                    id="academic_year_id"
                    onChange={(event) => handleFormChange('academic_year_id', event.target.value)}
                    required
                    value={formValues.academic_year_id}
                  >
                    <option value="">Pilih Tahun Ajaran</option>
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
                    onChange={(event) => handleFormChange('semester_id', event.target.value)}
                    required
                    value={formValues.semester_id}
                    disabled={!formValues.academic_year_id}
                  >
                    <option value="">
                      {formValues.academic_year_id ? 'Pilih Semester' : 'Pilih tahun ajaran terlebih dahulu'}
                    </option>
                    {formSemesterOptions.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="weight">Bobot (%) *</label>
                  <input
                    id="weight"
                    max={100}
                    min={0}
                    onChange={(event) => handleFormChange('weight', event.target.value)}
                    placeholder="30"
                    required
                    step="0.01"
                    type="number"
                    value={formValues.weight}
                  />
                </div>

                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="name">Nama Komponen *</label>
                  <input
                    id="name"
                    onChange={(event) => handleFormChange('name', event.target.value)}
                    placeholder="Tugas, UTS, UAS, Praktik"
                    required
                    type="text"
                    value={formValues.name}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting || !optionsReady} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Komponen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
