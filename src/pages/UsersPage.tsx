import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, PencilLine, Plus, Search, Trash2, Users2 } from 'lucide-react'
import {
  createResource,
  deleteResource,
  extractError,
  listResource,
  updateResource,
} from '../lib/api'
import type { ResourceRecord } from '../types/resources'

type UserRecord = ResourceRecord & {
  id?: number
  username?: string
  full_name?: string
  email?: string
  phone?: string
  is_active?: boolean
  roles?: Array<{ id: number; name: string; code: string }>
}

type FormValues = {
  username: string
  password: string
  full_name: string
  email: string
  phone: string
  is_active: boolean
}

const endpoint = '/users'

function toFormValues(item: UserRecord | null): FormValues {
  if (!item) {
    return { username: '', password: '', full_name: '', email: '', phone: '', is_active: true }
  }
  return {
    username: String(item.username ?? ''),
    password: '',
    full_name: String(item.full_name ?? ''),
    email: String(item.email ?? ''),
    phone: String(item.phone ?? ''),
    is_active: Boolean(item.is_active),
  }
}

function toPayload(values: FormValues, isEdit: boolean) {
  const payload: Record<string, unknown> = {
    username: values.username.trim(),
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    is_active: values.is_active,
  }
  if (!isEdit || values.password.trim() !== '') {
    payload.password = values.password.trim()
  }
  return payload
}

export function UsersPage() {
  const [items, setItems] = useState<UserRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<UserRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<UserRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const activeCount = useMemo(
    () => overviewItems.filter((i) => i.is_active).length,
    [overviewItems],
  )

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const [listResult, overviewResult] = await Promise.all([
        listResource<UserRecord>(endpoint, deferredSearch),
        listResource<UserRecord>(endpoint),
      ])
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
        const [listResult, overviewResult] = await Promise.all([
          listResource<UserRecord>(endpoint, deferredSearch),
          listResource<UserRecord>(endpoint),
        ])
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

  function handleEditClick(item: UserRecord) {
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

  async function handleDelete(item: UserRecord) {
    if (!item.id) return
    const confirmed = window.confirm(`Hapus user "${item.username ?? ''}"?`)
    if (!confirmed) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('User berhasil dihapus.')
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
      const payload = toPayload(formValues, !editingItem)
      if (editingItem?.id) {
        await updateResource(endpoint, Number(editingItem.id), payload)
        setSuccessMessage('User berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('User berhasil dibuat.')
      }
      setModalOpen(false)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = Boolean(editingItem)

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">Administration</p>
          <h1 className="page-header__title">Users</h1>
          <p className="page-header__description">
            Kelola akun pengguna sistem, termasuk pembuatan, update, dan penghapusan user.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah User
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Users</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Seluruh akun pengguna yang terdaftar.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <Users2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Active Users</div>
            <div className="stat-card__value">{activeCount}</div>
            <div className="stat-card__copy">Pengguna yang saat ini aktif.</div>
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
              placeholder="Cari username, nama lengkap, atau email…"
              value={search}
            />
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
              <strong>Belum ada user.</strong>
              Buat user baru untuk mulai mengelola akses sistem.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.username ?? '-')}</div>
                    </td>
                    <td>{String(item.full_name ?? '-')}</td>
                    <td>{String(item.email ?? '-')}</td>
                    <td>
                      {item.is_active ? (
                        <span className="inline-status inline-status--active">Active</span>
                      ) : (
                        <span className="inline-status inline-status--inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      {(item.roles ?? []).length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(item.roles ?? []).map((role) => (
                            <span key={role.id} className="inline-status inline-status--soft">
                              {role.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="cell-subtitle">No roles</span>
                      )}
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
              <h2 className="modal-title">{isEdit ? 'Edit User' : 'Tambah User'}</h2>
              <p className="modal-copy">
                {isEdit
                  ? 'Perbarui data user. Kosongkan password jika tidak ingin mengubah.'
                  : 'Buat akun pengguna baru untuk mengakses sistem.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="username">Username *</label>
                  <input
                    id="username"
                    onChange={(event) => setFormValues((current) => ({ ...current, username: event.target.value }))}
                    placeholder="admin"
                    required
                    type="text"
                    value={formValues.username}
                  />
                </div>

                <div className="field">
                  <label htmlFor="password">
                    Password {!isEdit ? '*' : ''}
                  </label>
                  <input
                    id="password"
                    onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))}
                    placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                    required={!isEdit}
                    type="password"
                    value={formValues.password}
                  />
                </div>

                <div className="field">
                  <label htmlFor="full_name">Full Name *</label>
                  <input
                    id="full_name"
                    onChange={(event) => setFormValues((current) => ({ ...current, full_name: event.target.value }))}
                    placeholder="Administrator SIAKAD"
                    required
                    type="text"
                    value={formValues.full_name}
                  />
                </div>

                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                    placeholder="admin@siakad.local"
                    type="email"
                    value={formValues.email}
                  />
                </div>

                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="081234567890"
                    type="text"
                    value={formValues.phone}
                  />
                </div>

                <div className="field">
                  <label className="checkbox-field" htmlFor="is_active" style={{ marginTop: '24px' }}>
                    <input
                      checked={formValues.is_active}
                      id="is_active"
                      onChange={(event) => setFormValues((current) => ({ ...current, is_active: event.target.checked }))}
                      type="checkbox"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
