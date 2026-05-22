import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CalendarRange, CheckCircle2, LoaderCircle, Megaphone, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { createResource, deleteResource, extractError, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type AnnouncementRecord = ResourceRecord & {
  id?: number
  title?: string
  content?: string
  target_scope?: string
  publish_start?: string
  publish_end?: string
  is_published?: boolean
  created_at?: string
}

type FormValues = {
  title: string
  content: string
  target_scope: string
  publish_start: string
  publish_end: string
  is_published: boolean
}

const endpoint = '/shared/announcements'
const targetOptions = [
  { label: 'Semua Unit', value: '' },
  { label: 'Admin Umum', value: 'admin' },
  { label: 'Kesiswaan', value: 'student_affairs' },
  { label: 'Akademik', value: 'academic' },
  { label: 'HUBIM', value: 'industry_relations' },
  { label: 'Siswa', value: 'students' },
  { label: 'Guru', value: 'teachers' },
] satisfies StaticOption[]

const formatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function normalizeDateTimeInput(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateLabel(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatter.format(date)
}

function summarizeContent(value: unknown) {
  const text = String(value ?? '').trim()
  if (text.length <= 120) return text || '-'
  return `${text.slice(0, 117)}...`
}

function targetLabel(value: unknown) {
  const key = String(value ?? '')
  return targetOptions.find((item) => item.value === key)?.label ?? (key || 'Semua Unit')
}

function toFormValues(item: AnnouncementRecord | null): FormValues {
  if (!item) {
    return {
      title: '',
      content: '',
      target_scope: '',
      publish_start: '',
      publish_end: '',
      is_published: false,
    }
  }
  return {
    title: String(item.title ?? ''),
    content: String(item.content ?? ''),
    target_scope: String(item.target_scope ?? ''),
    publish_start: normalizeDateTimeInput(item.publish_start),
    publish_end: normalizeDateTimeInput(item.publish_end),
    is_published: Boolean(item.is_published),
  }
}

function toPayload(values: FormValues) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    target_scope: values.target_scope.trim(),
    publish_start: values.publish_start,
    publish_end: values.publish_end,
    is_published: values.is_published,
  }
}

function PublishBadge({ value }: { value: unknown }) {
  return value ? (
    <span className="inline-status inline-status--active">Published</span>
  ) : (
    <span className="inline-status inline-status--soft">Draft</span>
  )
}

export function AnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<AnnouncementRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [targetFilter, setTargetFilter] = useState('')
  const [publishFilter, setPublishFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AnnouncementRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(toFormValues(null))

  const filterQuery = useMemo(() => {
    const query: Record<string, string | boolean> = {}
    if (targetFilter) query.target_scope = targetFilter
    if (publishFilter !== 'all') query.is_published = publishFilter === 'published'
    return query
  }, [publishFilter, targetFilter])

  const publishedCount = useMemo(
    () => overviewItems.filter((item) => Boolean(item.is_published)).length,
    [overviewItems],
  )
  const draftCount = useMemo(() => overviewItems.length - publishedCount, [overviewItems.length, publishedCount])
  const scopeCoverage = useMemo(
    () => new Set(overviewItems.map((item) => String(item.target_scope ?? '')).filter(Boolean)).size,
    [overviewItems],
  )

  async function refreshList() {
    setLoading(true)
    try {
      setErrorMessage('')
      const [listResult, overviewResult] = await Promise.all([
        listResource<AnnouncementRecord>(endpoint, deferredSearch, filterQuery),
        listResource<AnnouncementRecord>(endpoint),
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
    async function syncAnnouncements() {
      setLoading(true)
      try {
        setErrorMessage('')
        const [listResult, overviewResult] = await Promise.all([
          listResource<AnnouncementRecord>(endpoint, deferredSearch, filterQuery),
          listResource<AnnouncementRecord>(endpoint),
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
    void syncAnnouncements()
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

  function handleEditClick(item: AnnouncementRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  async function handleTogglePublish(item: AnnouncementRecord) {
    if (!item.id) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await updateResource(endpoint, Number(item.id), {
        title: String(item.title ?? ''),
        content: String(item.content ?? ''),
        target_scope: String(item.target_scope ?? ''),
        publish_start: normalizeDateTimeInput(item.publish_start),
        publish_end: normalizeDateTimeInput(item.publish_end),
        is_published: !item.is_published,
      })
      setSuccessMessage(`Pengumuman ${!item.is_published ? 'dipublikasikan' : 'dikembalikan ke draft'}.`)
      await refreshList()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleDelete(item: AnnouncementRecord) {
    if (!item.id) return
    if (!window.confirm(`Hapus pengumuman ${item.title ?? ''}?`)) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(endpoint, Number(item.id))
      setSuccessMessage('Pengumuman berhasil dihapus.')
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
        setSuccessMessage('Pengumuman berhasil diperbarui.')
      } else {
        await createResource(endpoint, payload)
        setSuccessMessage('Pengumuman berhasil dibuat.')
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
          <p className="page-header__eyebrow">Shared Module</p>
          <h1 className="page-header__title">Pengumuman</h1>
          <p className="page-header__description">
            Kelola pengumuman lintas unit, status publish, dan rentang tayang agar komunikasi internal sekolah tetap rapi
            dan mudah diarahkan ke audience yang tepat.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button" onClick={handleCreateClick} type="button">
            <Plus size={18} />
            &nbsp;Tambah Pengumuman
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <Megaphone size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Pengumuman</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Seluruh pengumuman yang tersimpan untuk lintas unit sekolah.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Published</div>
            <div className="stat-card__value">{publishedCount}</div>
            <div className="stat-card__copy">{draftCount} item masih disimpan sebagai draft internal.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <CalendarRange size={18} />
          </div>
          <div>
            <div className="stat-card__label">Scope Coverage</div>
            <div className="stat-card__value stat-card__value--compact">{scopeCoverage} target</div>
            <div className="stat-card__copy">Cakupan audience yang sudah mulai dipakai oleh admin untuk broadcasting.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div>
            <p className="page-header__eyebrow">Broadcast Center</p>
            <h2 className="panel-heading">Announcement Board</h2>
          </div>
          <div className="toolbar__actions">
            <label className="toolbar__search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul atau isi pengumuman..."
                type="search"
              />
            </label>
            <div className="toolbar__filters">
              <select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
                {targetOptions.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select value={publishFilter} onChange={(event) => setPublishFilter(event.target.value)}>
                <option value="all">Semua status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pengumuman</th>
                <th>Target</th>
                <th>Jadwal Tayang</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    <LoaderCircle className="spin" size={18} /> Memuat pengumuman...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={5}>Belum ada pengumuman yang cocok dengan filter saat ini.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.title ?? '-')}</div>
                      <div className="cell-subtitle">{summarizeContent(item.content)}</div>
                    </td>
                    <td>
                      <div className="cell-title">{targetLabel(item.target_scope)}</div>
                      <div className="cell-subtitle">Dibuat {formatDateLabel(item.created_at)}</div>
                    </td>
                    <td>
                      <div className="cell-title">{formatDateLabel(item.publish_start)}</div>
                      <div className="cell-subtitle">Sampai {formatDateLabel(item.publish_end)}</div>
                    </td>
                    <td><PublishBadge value={item.is_published} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditClick(item)} type="button">
                          <PencilLine size={16} />
                        </button>
                        <button className="icon-button" onClick={() => handleTogglePublish(item)} type="button">
                          <CheckCircle2 size={16} />
                        </button>
                        <button className="icon-button icon-button--danger" onClick={() => handleDelete(item)} type="button">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-card__header">
              <p className="page-header__eyebrow">Shared / Announcements</p>
              <h2 className="panel-heading">{editingItem ? 'Edit Pengumuman' : 'Tambah Pengumuman'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Judul</span>
                  <input
                    value={formValues.title}
                    onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Mis. Jadwal pembagian rapor semester genap"
                    required
                    type="text"
                  />
                </label>
                <label className="form-field">
                  <span>Target Scope</span>
                  <select
                    value={formValues.target_scope}
                    onChange={(event) => setFormValues((current) => ({ ...current, target_scope: event.target.value }))}
                  >
                    {targetOptions.map((item) => (
                      <option key={item.value || 'all'} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field form-field--full">
                  <span>Isi Pengumuman</span>
                  <textarea
                    rows={6}
                    value={formValues.content}
                    onChange={(event) => setFormValues((current) => ({ ...current, content: event.target.value }))}
                    placeholder="Tulis isi pengumuman yang akan dibaca user..."
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Mulai Tayang</span>
                  <input
                    type="datetime-local"
                    value={formValues.publish_start}
                    onChange={(event) => setFormValues((current) => ({ ...current, publish_start: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>Selesai Tayang</span>
                  <input
                    type="datetime-local"
                    value={formValues.publish_end}
                    onChange={(event) => setFormValues((current) => ({ ...current, publish_end: event.target.value }))}
                  />
                </label>
                <label className="checkbox-field form-field--full">
                  <input
                    checked={formValues.is_published}
                    onChange={(event) => setFormValues((current) => ({ ...current, is_published: event.target.checked }))}
                    type="checkbox"
                  />
                  <div>
                    <strong>Langsung publish</strong>
                    <div className="cell-subtitle">Jika tidak dicentang, pengumuman akan disimpan sebagai draft.</div>
                  </div>
                </label>
              </div>
              <div className="form-actions">
                <button className="button-ghost" onClick={() => setModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan...' : ' Simpan Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
