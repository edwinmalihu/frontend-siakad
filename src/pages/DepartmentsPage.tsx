import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { FolderKanban, GraduationCap, Layers3, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listResource, updateResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'
import { resourceConfigs } from '../config/resources'

type DepartmentRecord = ResourceRecord & {
  id?: number
  code?: string
  name?: string
  program_name?: string
  field_name?: string
  description?: string
}

type FormValues = {
  code: string
  name: string
  program_name: string
  field_name: string
  description: string
}

const config = resourceConfigs.departments

function toFormValues(item: DepartmentRecord | null): FormValues {
  if (!item) {
    return { code: '', name: '', program_name: '', field_name: '', description: '' }
  }

  return {
    code: String(item.code ?? ''),
    name: String(item.name ?? ''),
    program_name: String(item.program_name ?? ''),
    field_name: String(item.field_name ?? ''),
    description: String(item.description ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    program_name: values.program_name.trim(),
    field_name: values.field_name.trim(),
    description: values.description.trim(),
  }
}

export function DepartmentsPage() {
  const [items, setItems] = useState<DepartmentRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DepartmentRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const programCoverage = useMemo(
    () => new Set(items.map((item) => String(item.program_name ?? '').trim()).filter(Boolean)).size,
    [items],
  )
  const fieldCoverage = useMemo(
    () => new Set(items.map((item) => String(item.field_name ?? '').trim()).filter(Boolean)).size,
    [items],
  )

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const result = await listResource<DepartmentRecord>(config.endpoint, deferredSearch)
      setItems(result.items)
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function syncDepartments() {
      setLoading(true)
      try {
        setErrorMessage('')
        const result = await listResource<DepartmentRecord>(config.endpoint, deferredSearch)
        if (!isMounted) return
        setItems(result.items)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void syncDepartments()
    return () => {
      isMounted = false
    }
  }, [deferredSearch])

  function handleCreateClick() {
    startTransition(() => {
      setEditingItem(null)
      setFormValues(toFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleEditClick(item: DepartmentRecord) {
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

  async function handleDelete(item: DepartmentRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus jurusan ${item.name ?? ''}?`)
    if (!confirmed) return

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Jurusan berhasil dihapus.')
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
        setSuccessMessage('Jurusan berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Jurusan berhasil dibuat.')
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
            &nbsp;Tambah Jurusan
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <FolderKanban size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Jurusan</div>
            <div className="stat-card__value">{items.length}</div>
            <div className="stat-card__copy">Menjadi basis relasi untuk kelas dan subject.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="stat-card__label">Program Coverage</div>
            <div className="stat-card__value">{programCoverage}</div>
            <div className="stat-card__copy">Program studi atau bidang utama yang sudah terdefinisi.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <Layers3 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Field Coverage</div>
            <div className="stat-card__value">{fieldCoverage}</div>
            <div className="stat-card__copy">Bidang kompetensi yang mulai membentuk struktur akademik.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar">
          <div className="toolbar__search">
            <Search size={18} />
            <input onChange={(event) => setSearch(event.target.value)} placeholder={config.searchPlaceholder} value={search} />
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
              <strong>Belum ada data untuk {config.title}.</strong>
              Tambahkan jurusan inti terlebih dahulu agar class dan subject punya struktur yang jelas.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Program</th>
                  <th>Field</th>
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
                      <div className="cell-subtitle">{String(item.description ?? 'Tanpa deskripsi')}</div>
                    </td>
                    <td>{String(item.program_name ?? '-')}</td>
                    <td>{String(item.field_name ?? '-')}</td>
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
              <h2 className="modal-title">{editingItem ? 'Edit Department' : 'Create Department'}</h2>
              <p className="modal-copy">
                {editingItem ? 'Perbarui data jurusan tanpa keluar dari konteks master data.' : 'Tambahkan jurusan baru untuk membentuk struktur kelas dan subject.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="code">Department Code *</label>
                  <input id="code" onChange={(event) => setFormValues((current) => ({ ...current, code: event.target.value }))} placeholder="RPL" required type="text" value={formValues.code} />
                </div>
                <div className="field">
                  <label htmlFor="name">Department Name *</label>
                  <input id="name" onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} placeholder="Rekayasa Perangkat Lunak" required type="text" value={formValues.name} />
                </div>
                <div className="field">
                  <label htmlFor="program_name">Program Name</label>
                  <input id="program_name" onChange={(event) => setFormValues((current) => ({ ...current, program_name: event.target.value }))} placeholder="Teknik Informatika" type="text" value={formValues.program_name} />
                </div>
                <div className="field">
                  <label htmlFor="field_name">Field Name</label>
                  <input id="field_name" onChange={(event) => setFormValues((current) => ({ ...current, field_name: event.target.value }))} placeholder="Software Engineering" type="text" value={formValues.field_name} />
                </div>
                <div className="field field--full">
                  <label htmlFor="description">Description</label>
                  <textarea id="description" onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))} placeholder="Catatan singkat tentang jurusan ini" value={formValues.description} />
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Jurusan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
