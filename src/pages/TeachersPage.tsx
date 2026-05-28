import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Briefcase, CheckCircle2, GraduationCap, LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { ImportExportPanel } from '../components/ImportExportPanel'
import { createResource, deleteResource, extractError, listResource, updateResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'
import { resourceConfigs } from '../config/resources'

type TeacherRecord = ResourceRecord & {
  id?: number
  nip?: string
  nuptk?: string
  full_name?: string
  gender?: string
  address?: string
  phone?: string
  email?: string
  employment_status?: string
  position?: string
  photo_url?: string
  status?: string
}

type StatusFilter = 'all' | 'active' | 'inactive'
type GenderFilter = 'all' | 'male' | 'female'

type FormValues = {
  nip: string
  nuptk: string
  full_name: string
  gender: string
  address: string
  phone: string
  email: string
  employment_status: string
  position: string
  photo_url: string
  status: string
}

const config = resourceConfigs.teachers

function toFormValues(item: TeacherRecord | null): FormValues {
  if (!item) {
    return {
      nip: '',
      nuptk: '',
      full_name: '',
      gender: '',
      address: '',
      phone: '',
      email: '',
      employment_status: '',
      position: '',
      photo_url: '',
      status: 'active',
    }
  }

  return {
    nip: String(item.nip ?? ''),
    nuptk: String(item.nuptk ?? ''),
    full_name: String(item.full_name ?? ''),
    gender: String(item.gender ?? ''),
    address: String(item.address ?? ''),
    phone: String(item.phone ?? ''),
    email: String(item.email ?? ''),
    employment_status: String(item.employment_status ?? ''),
    position: String(item.position ?? ''),
    photo_url: String(item.photo_url ?? ''),
    status: String(item.status ?? 'active'),
  }
}

function toPayload(values: FormValues) {
  return {
    nip: values.nip.trim(),
    nuptk: values.nuptk.trim(),
    full_name: values.full_name.trim(),
    gender: values.gender.trim(),
    address: values.address.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    employment_status: values.employment_status.trim(),
    position: values.position.trim(),
    photo_url: values.photo_url.trim(),
    status: values.status.trim() || 'active',
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'active') {
    return <span className="inline-status inline-status--active">Active</span>
  }

  if (normalized === 'male') {
    return <span className="inline-status inline-status--male">Male</span>
  }

  if (normalized === 'female') {
    return <span className="inline-status inline-status--female">Female</span>
  }

  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

export function TeachersPage() {
  const [items, setItems] = useState<TeacherRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<TeacherRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TeacherRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, string | boolean> = {}

    if (statusFilter !== 'all') {
      query.status = statusFilter
    }

    if (genderFilter !== 'all') {
      query.gender = genderFilter
    }

    return query
  }, [genderFilter, statusFilter])

  const activeTeachersCount = useMemo(
    () => overviewItems.filter((item) => String(item.status ?? '').toLowerCase() === 'active').length,
    [overviewItems],
  )

  const employmentCoverage = useMemo(() => {
    return new Set(
      overviewItems
        .map((item) => String(item.employment_status ?? '').trim())
        .filter((item) => item !== ''),
    ).size
  }, [overviewItems])

  const connectedTeachersCount = useMemo(
    () =>
      overviewItems.filter((item) => {
        return String(item.email ?? '').trim() !== '' || String(item.phone ?? '').trim() !== ''
      }).length,
    [overviewItems],
  )

  async function fetchTeachers(searchValue: string, query: Record<string, string | boolean>) {
    const [listResult, overviewResult] = await Promise.all([
      listResource<TeacherRecord>(config.endpoint, searchValue, query),
      listResource<TeacherRecord>(config.endpoint),
    ])

    return { listResult, overviewResult }
  }

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const { listResult, overviewResult } = await fetchTeachers(deferredSearch, filterQuery)
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

    async function syncTeachers() {
      setLoading(true)
      try {
        setErrorMessage('')
        const { listResult, overviewResult } = await fetchTeachers(deferredSearch, filterQuery)
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

    void syncTeachers()

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

  function handleEditClick(item: TeacherRecord) {
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

  async function handleDelete(item: TeacherRecord) {
    if (!item.id) {
      return
    }

    const confirmed = window.confirm(`Hapus guru ${item.full_name ?? ''}?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, Number(item.id))
      setSuccessMessage('Data guru berhasil dihapus.')
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleActivate(item: TeacherRecord) {
    if (!item.id) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await updateResource(config.endpoint, Number(item.id), {
        ...toPayload(toFormValues(item)),
        status: 'active',
      })
      setSuccessMessage(`Guru ${item.full_name ?? ''} sekarang aktif.`)
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
        setSuccessMessage('Data guru berhasil diperbarui.')
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage('Data guru berhasil dibuat.')
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
          <ImportExportPanel module="teachers" label="Guru" onImportSuccess={refreshList} />
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Guru
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Guru</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Semua profil pengajar yang tersimpan untuk modul akademik.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--lime">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Guru Aktif</div>
            <div className="stat-card__value">{activeTeachersCount}</div>
            <div className="stat-card__copy">Siap dipakai untuk jadwal, mapel, dan wali kelas.</div>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <Briefcase size={18} />
          </div>
          <div>
            <div className="stat-card__label">Employment Coverage</div>
            <div className="stat-card__value">{employmentCoverage}</div>
            <div className="stat-card__copy">{connectedTeachersCount} guru sudah punya email atau nomor telepon.</div>
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
            <button
              className={`segmented-button ${genderFilter === 'all' ? 'segmented-button--active' : ''}`}
              onClick={() => setGenderFilter('all')}
              type="button"
            >
              Semua Gender
            </button>
            <button
              className={`segmented-button ${genderFilter === 'male' ? 'segmented-button--active' : ''}`}
              onClick={() => setGenderFilter('male')}
              type="button"
            >
              Male
            </button>
            <button
              className={`segmented-button ${genderFilter === 'female' ? 'segmented-button--active' : ''}`}
              onClick={() => setGenderFilter('female')}
              type="button"
            >
              Female
            </button>
          </div>

          <div className="toolbar__actions">
            <div className="chip">Hasil: {items.length}</div>
            <div className="chip">Kontak lengkap: {connectedTeachersCount}</div>
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
              Mulai dari beberapa guru inti agar jadwal, mata pelajaran, dan wali kelas bisa langsung memakai data yang konsisten.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Identity</th>
                  <th>Contact</th>
                  <th>Employment</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.full_name ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.position ?? 'Tanpa posisi')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.nip ?? item.nuptk ?? '-')}</div>
                      <div className="cell-subtitle">NUPTK: {String(item.nuptk ?? '-')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.email ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.phone ?? 'Tanpa nomor telepon')}</div>
                    </td>
                    <td>
                      <div className="cell-title">{String(item.employment_status ?? '-')}</div>
                      <div className="cell-subtitle">
                        <StatusBadge value={item.gender ?? '-'} />
                      </div>
                    </td>
                    <td>
                      <StatusBadge value={item.status ?? '-'} />
                    </td>
                    <td>
                      <div className="table-actions">
                        {String(item.status ?? '').toLowerCase() !== 'active' ? (
                          <button
                            className="table-action table-action--success"
                            onClick={() => handleActivate(item)}
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
              <h2 className="modal-title">{editingItem ? 'Edit Teacher' : 'Create Teacher'}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui profil guru tanpa meninggalkan konteks akademik.'
                  : 'Tambahkan guru baru agar jadwal, mata pelajaran, dan wali kelas punya referensi yang jelas.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="nip">NIP</label>
                  <input
                    id="nip"
                    onChange={(event) => setFormValues((current) => ({ ...current, nip: event.target.value }))}
                    placeholder="198901012015011001"
                    type="text"
                    value={formValues.nip}
                  />
                </div>

                <div className="field">
                  <label htmlFor="nuptk">NUPTK</label>
                  <input
                    id="nuptk"
                    onChange={(event) => setFormValues((current) => ({ ...current, nuptk: event.target.value }))}
                    placeholder="1234567890123456"
                    type="text"
                    value={formValues.nuptk}
                  />
                </div>

                <div className="field field--full">
                  <label htmlFor="full_name">Full Name *</label>
                  <input
                    id="full_name"
                    onChange={(event) => setFormValues((current) => ({ ...current, full_name: event.target.value }))}
                    placeholder="Budi Santoso"
                    required
                    type="text"
                    value={formValues.full_name}
                  />
                </div>

                <div className="field">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    onChange={(event) => setFormValues((current) => ({ ...current, gender: event.target.value }))}
                    value={formValues.gender}
                  >
                    <option value="">Pilih gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="status">Status *</label>
                  <select
                    id="status"
                    onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}
                    required
                    value={formValues.status}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                    placeholder="budi.santoso@example.com"
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
                  <label htmlFor="employment_status">Employment Status</label>
                  <input
                    id="employment_status"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, employment_status: event.target.value }))
                    }
                    placeholder="permanent"
                    type="text"
                    value={formValues.employment_status}
                  />
                </div>

                <div className="field">
                  <label htmlFor="position">Position</label>
                  <input
                    id="position"
                    onChange={(event) => setFormValues((current) => ({ ...current, position: event.target.value }))}
                    placeholder="Guru Matematika"
                    type="text"
                    value={formValues.position}
                  />
                </div>

                <div className="field field--full">
                  <label htmlFor="photo_url">Photo URL</label>
                  <input
                    id="photo_url"
                    onChange={(event) => setFormValues((current) => ({ ...current, photo_url: event.target.value }))}
                    placeholder="https://example.com/photo.jpg"
                    type="text"
                    value={formValues.photo_url}
                  />
                </div>

                <div className="field field--full">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
                    placeholder="Alamat guru"
                    value={formValues.address}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
