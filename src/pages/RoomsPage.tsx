import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { DoorOpen, LayoutList, LoaderCircle, PencilLine, Plus, Search, Trash2, Users2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listResource, updateResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'
import { resourceConfigs } from '../config/resources'

type RoomRecord = ResourceRecord & {
  id?: number
  code?: string
  name?: string
  type?: string
  capacity?: number | null
}

type FormValues = {
  code: string
  name: string
  type: string
  capacity: string
}

const config = resourceConfigs.rooms

function toFormValues(item: RoomRecord | null): FormValues {
  if (!item) {
    return { code: '', name: '', type: '', capacity: '' }
  }

  return {
    code: String(item.code ?? ''),
    name: String(item.name ?? ''),
    type: String(item.type ?? ''),
    capacity: item.capacity === null || item.capacity === undefined ? '' : String(item.capacity),
  }
}

function toPayload(values: FormValues) {
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    type: values.type.trim(),
    capacity: values.capacity.trim() === '' ? null : Number(values.capacity),
  }
}

export function RoomsPage() {
  const [items, setItems] = useState<RoomRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RoomRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') {
      return items
    }

    return items.filter((item) => String(item.type ?? '').trim().toLowerCase() === typeFilter)
  }, [items, typeFilter])

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => String(item.type ?? '').trim().toLowerCase())
          .filter((item) => item !== ''),
      ),
    )
  }, [items])

  const totalCapacity = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.capacity ?? 0), 0),
    [items],
  )

  const roomsWithoutCapacity = useMemo(
    () => items.filter((item) => item.capacity === null || item.capacity === undefined).length,
    [items],
  )

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const result = await listResource<RoomRecord>(config.endpoint, deferredSearch)
      setItems(result.items)
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function syncRooms() {
      setLoading(true)
      try {
        setErrorMessage('')
        const result = await listResource<RoomRecord>(config.endpoint, deferredSearch)
        if (!isMounted) {
          return
        }

        setItems(result.items)
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

    void syncRooms()

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

  function handleEditClick(item: RoomRecord) {
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

  async function handleDelete(item: RoomRecord) {
    if (!item.id) {
      return
    }

    const confirmed = window.confirm(`Hapus ruang ${item.name ?? ''}?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Ruang berhasil dihapus.')
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
        setSuccessMessage('Ruang berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Ruang berhasil dibuat.')
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
            &nbsp;Tambah Ruang
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <DoorOpen size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Ruang</div>
            <div className="stat-card__value">{items.length}</div>
            <div className="stat-card__copy">Dipakai untuk penjadwalan kelas, lab, dan praktik.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Capacity</div>
            <div className="stat-card__value">{totalCapacity}</div>
            <div className="stat-card__copy">Akumulasi kapasitas yang sudah didefinisikan di semua ruang.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <LayoutList size={18} />
          </div>
          <div>
            <div className="stat-card__label">Tipe & Gap</div>
            <div className="stat-card__value stat-card__value--compact">{typeOptions.length} tipe</div>
            <div className="stat-card__copy">{roomsWithoutCapacity} ruang belum memiliki capacity.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div className="toolbar__search">
            <Search size={18} />
            <input onChange={(event) => setSearch(event.target.value)} placeholder={config.searchPlaceholder} value={search} />
          </div>

          <div className="toolbar__filters">
            <select className="toolbar-select" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
              <option value="all">Semua Tipe</option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar__actions">
            <div className="chip">Hasil: {filteredItems.length}</div>
          </div>
        </div>

        {loading ? (
          <div className="panel__body">
            <div className="loading-line" />
            <div className="loading-line" style={{ marginTop: '14px' }} />
            <div className="loading-line" style={{ marginTop: '14px', width: '76%' }} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Belum ada data untuk {config.title}.</strong>
              Tambahkan ruang kelas, laboratorium, atau ruang praktik agar jadwal bisa menempel ke ruang fisik yang benar.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <span className="inline-status inline-status--soft">{String(item.code ?? '-')}</span>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.name ?? '-')}</div>
                    </td>
                    <td>{String(item.type ?? '-')}</td>
                    <td>{item.capacity === null || item.capacity === undefined ? '-' : String(item.capacity)}</td>
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
              <h2 className="modal-title">{editingItem ? 'Edit Room' : 'Create Room'}</h2>
              <p className="modal-copy">
                {editingItem ? 'Perbarui detail ruang tanpa meninggalkan konteks master data.' : 'Tambahkan ruang baru untuk mendukung operasional penjadwalan dan penggunaan fasilitas.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="code">Room Code *</label>
                  <input id="code" onChange={(event) => setFormValues((current) => ({ ...current, code: event.target.value }))} placeholder="LAB-01" required type="text" value={formValues.code} />
                </div>
                <div className="field">
                  <label htmlFor="name">Room Name *</label>
                  <input id="name" onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} placeholder="Laboratorium 1" required type="text" value={formValues.name} />
                </div>
                <div className="field">
                  <label htmlFor="type">Room Type</label>
                  <input id="type" onChange={(event) => setFormValues((current) => ({ ...current, type: event.target.value }))} placeholder="computer_lab" type="text" value={formValues.type} />
                </div>
                <div className="field">
                  <label htmlFor="capacity">Capacity</label>
                  <input id="capacity" min={0} onChange={(event) => setFormValues((current) => ({ ...current, capacity: event.target.value }))} placeholder="36" type="number" value={formValues.capacity} />
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Ruang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
