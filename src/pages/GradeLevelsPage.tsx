import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Layers3, LayoutList, LoaderCircle, PencilLine, Plus, Search, SortAsc, Trash2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listResource, updateResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'
import { resourceConfigs } from '../config/resources'

type GradeLevelRecord = ResourceRecord & {
  id?: number
  code?: string
  name?: string
  sort_order?: number
}

type FormValues = {
  code: string
  name: string
  sort_order: string
}

const config = resourceConfigs.gradeLevels

function toFormValues(item: GradeLevelRecord | null): FormValues {
  if (!item) {
    return { code: '', name: '', sort_order: '' }
  }

  return {
    code: String(item.code ?? ''),
    name: String(item.name ?? ''),
    sort_order: String(item.sort_order ?? ''),
  }
}

function toPayload(values: FormValues) {
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    sort_order: Number(values.sort_order),
  }
}

export function GradeLevelsPage() {
  const [items, setItems] = useState<GradeLevelRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GradeLevelRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const highestSortOrder = useMemo(
    () => items.reduce((max, item) => Math.max(max, Number(item.sort_order ?? 0)), 0),
    [items],
  )

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const result = await listResource<GradeLevelRecord>(config.endpoint, deferredSearch)
      setItems(result.items)
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function syncGradeLevels() {
      setLoading(true)
      try {
        setErrorMessage('')
        const result = await listResource<GradeLevelRecord>(config.endpoint, deferredSearch)
        if (!isMounted) return
        setItems(result.items)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void syncGradeLevels()
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

  function handleEditClick(item: GradeLevelRecord) {
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

  async function handleDelete(item: GradeLevelRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus tingkat ${item.name ?? ''}?`)
    if (!confirmed) return

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Tingkat berhasil dihapus.')
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
        setSuccessMessage('Tingkat berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Tingkat berhasil dibuat.')
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
            &nbsp;Tambah Tingkat
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <Layers3 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Tingkat</div>
            <div className="stat-card__value">{items.length}</div>
            <div className="stat-card__copy">Struktur tingkat belajar seperti X, XI, dan XII.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <SortAsc size={18} />
          </div>
          <div>
            <div className="stat-card__label">Sort Order Tertinggi</div>
            <div className="stat-card__value">{highestSortOrder}</div>
            <div className="stat-card__copy">Membantu menjaga urutan tingkat tetap konsisten di seluruh modul.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <LayoutList size={18} />
          </div>
          <div>
            <div className="stat-card__label">Kode Tingkat</div>
            <div className="stat-card__value stat-card__value--compact">
              {items.map((item) => String(item.code ?? '')).filter(Boolean).join(', ') || '-'}
            </div>
            <div className="stat-card__copy">Membentuk relasi yang rapi dengan classes dan subjects.</div>
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
              Tambahkan tingkat lebih dulu agar kelas dan subject bisa dibedakan per level pembelajaran.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Level Name</th>
                  <th>Sort Order</th>
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
                    <td>{String(item.sort_order ?? '-')}</td>
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
              <h2 className="modal-title">{editingItem ? 'Edit Grade Level' : 'Create Grade Level'}</h2>
              <p className="modal-copy">
                {editingItem ? 'Perbarui tingkat belajar tanpa keluar dari konteks master data.' : 'Tambahkan tingkat baru untuk membentuk struktur kelas dan subject yang konsisten.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="code">Level Code *</label>
                  <input id="code" onChange={(event) => setFormValues((current) => ({ ...current, code: event.target.value }))} placeholder="X" required type="text" value={formValues.code} />
                </div>
                <div className="field">
                  <label htmlFor="name">Level Name *</label>
                  <input id="name" onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} placeholder="Kelas 10" required type="text" value={formValues.name} />
                </div>
                <div className="field">
                  <label htmlFor="sort_order">Sort Order *</label>
                  <input id="sort_order" min={0} onChange={(event) => setFormValues((current) => ({ ...current, sort_order: event.target.value }))} placeholder="10" required type="number" value={formValues.sort_order} />
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Tingkat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
