import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { FileClock, Layers, LoaderCircle, Search, Users } from 'lucide-react'
import { extractError, listResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'

type AuditLogRecord = ResourceRecord & {
  id?: number
  user_id?: number
  user_name?: string
  module?: string
  action?: string
  entity_type?: string
  entity_id?: number
  payload_json?: string
  ip_address?: string
  login_time?: string
  logout_time?: string
  created_at?: string
}

const endpoint = '/shared/audit-logs'

const moduleOptions = [
  { label: 'Semua modul', value: '' },
  { label: 'Auth', value: 'auth' },
  { label: 'Master', value: 'master' },
  { label: 'Student Affairs', value: 'student_affairs' },
  { label: 'Academic', value: 'academic' },
  { label: 'Industry Relations', value: 'industry_relations' },
  { label: 'Shared', value: 'shared' },
]

const actionOptions = [
  { label: 'Semua aksi', value: '' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
  { label: 'Login', value: 'login' },
  { label: 'Logout', value: 'logout' },
]

function formatTimestamp(value: string | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function ActionBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'create') return <span className="inline-status inline-status--active">Create</span>
  if (normalized === 'update') return <span className="inline-status inline-status--male">Update</span>
  if (normalized === 'delete') return <span className="inline-status inline-status--female">Delete</span>
  if (normalized === 'login') return <span className="inline-status inline-status--soft">Login</span>
  if (normalized === 'login_failed') return <span className="inline-status inline-status--inactive">Login Gagal</span>
  if (normalized === 'logout') return <span className="inline-status inline-status--inactive">Logout</span>
  return <span className="inline-status inline-status--inactive">{String(value ?? '-')}</span>
}

function OnlineStatus({ logoutTime }: { logoutTime?: string }) {
  if (!logoutTime) {
    return (
      <span className="inline-status inline-status--active" style={{ gap: '4px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
        Online
      </span>
    )
  }
  return <span className="inline-status inline-status--inactive">Offline</span>
}

function tryFormatJSON(raw: string | undefined) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

export function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogRecord[]>([])
  const [overviewItems, setOverviewItems] = useState<AuditLogRecord[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailItem, setDetailItem] = useState<AuditLogRecord | null>(null)

  const filterQuery = useMemo(() => {
    const query: Record<string, string> = {}
    if (moduleFilter) query.module = moduleFilter
    if (actionFilter) query.action = actionFilter
    return query
  }, [moduleFilter, actionFilter])

  const uniqueModules = useMemo(
    () => new Set(overviewItems.map((i) => String(i.module ?? '')).filter(Boolean)).size,
    [overviewItems],
  )
  const uniqueUsers = useMemo(
    () => new Set(overviewItems.map((i) => String(i.user_name ?? i.user_id ?? '')).filter(Boolean)).size,
    [overviewItems],
  )
  const onlineUsers = useMemo(
    () => overviewItems.filter((i) => i.action === 'login' && !i.logout_time).length,
    [overviewItems],
  )

  useEffect(() => {
    let isMounted = true
    async function syncItems() {
      setLoading(true)
      try {
        setErrorMessage('')
        const [listResult, overviewResult] = await Promise.all([
          listResource<AuditLogRecord>(endpoint, deferredSearch, filterQuery),
          listResource<AuditLogRecord>(endpoint),
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
    return () => {
      isMounted = false
    }
  }, [deferredSearch, filterQuery])

  function handleRowClick(item: AuditLogRecord) {
    setDetailItem(item)
  }

  const formattedPayload = tryFormatJSON(detailItem?.payload_json)

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">System</p>
          <h1 className="page-header__title">Audit Logs</h1>
          <p className="page-header__description">
            Pantau seluruh aktivitas sistem yang tercatat untuk keperluan audit, troubleshooting, dan keamanan.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <FileClock size={18} />
          </div>
          <div>
            <div className="stat-card__label">Total Logs</div>
            <div className="stat-card__value">{overviewItems.length}</div>
            <div className="stat-card__copy">Seluruh catatan aktivitas sistem yang tercatat.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <Layers size={18} />
          </div>
          <div>
            <div className="stat-card__label">Modules</div>
            <div className="stat-card__value">{uniqueModules}</div>
            <div className="stat-card__copy">Jumlah modul yang memiliki aktivitas tercatat.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <Users size={18} />
          </div>
          <div>
            <div className="stat-card__label">Users</div>
            <div className="stat-card__value">{uniqueUsers}</div>
            <div className="stat-card__copy">Jumlah pengguna yang memiliki aktivitas tercatat.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <Users size={18} />
          </div>
          <div>
            <div className="stat-card__label">Online</div>
            <div className="stat-card__value">{onlineUsers}</div>
            <div className="stat-card__copy">Pengguna yang sedang aktif (belum logout).</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div className="toolbar__search">
            <Search size={18} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama pengguna, modul, aksi, atau entity…"
              value={search}
            />
          </div>
          <div className="toolbar__filters">
            <select
              className="toolbar-select"
              onChange={(event) => setModuleFilter(event.target.value)}
              value={moduleFilter}
            >
              {moduleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="toolbar-select"
              onChange={(event) => setActionFilter(event.target.value)}
              value={actionFilter}
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
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
              <strong>Belum ada audit log.</strong>
              Aktivitas sistem akan tercatat secara otomatis di sini.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Modul</th>
                  <th>Aksi</th>
                  <th>Waktu Login</th>
                  <th>Waktu Logout</th>
                  <th>Status</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={String(item.id)}
                    onClick={() => handleRowClick(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="cell-title">{String(item.user_name ?? 'System')}</div>
                      {item.user_id ? <div className="cell-subtitle">ID: {item.user_id}</div> : null}
                    </td>
                    <td>{String(item.module ?? '-')}</td>
                    <td>
                      <ActionBadge value={item.action} />
                    </td>
                    <td>
                      <span className="inline-status inline-status--soft">{formatTimestamp(item.login_time ?? item.created_at)}</span>
                    </td>
                    <td>
                      <span className="inline-status inline-status--soft">{formatTimestamp(item.logout_time)}</span>
                    </td>
                    <td>
                      <OnlineStatus logoutTime={item.logout_time} />
                    </td>
                    <td>
                      <div className="cell-subtitle">{String(item.ip_address ?? '-')}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailItem ? (
        <div className="modal-backdrop" onClick={() => setDetailItem(null)} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <h2 className="modal-title">Detail Audit Log</h2>
              <p className="modal-copy">
                {String(detailItem.module ?? '')} · {String(detailItem.action ?? '')} · {formatTimestamp(detailItem.created_at)}
              </p>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label>User</label>
                  <div>{String(detailItem.user_name ?? 'System')} {detailItem.user_id ? `(ID: ${detailItem.user_id})` : ''}</div>
                </div>
                <div className="field">
                  <label>IP Address</label>
                  <div>{String(detailItem.ip_address ?? '-')}</div>
                </div>
                <div className="field">
                  <label>Entity</label>
                  <div>{String(detailItem.entity_type ?? '-')} {detailItem.entity_id ? `#${detailItem.entity_id}` : ''}</div>
                </div>
                {detailItem.action === 'login' ? (
                  <>
                    <div className="field">
                      <label>Waktu Login</label>
                      <div>{formatTimestamp(detailItem.login_time ?? detailItem.created_at)}</div>
                    </div>
                    <div className="field">
                      <label>Waktu Logout</label>
                      <div>{detailItem.logout_time ? formatTimestamp(detailItem.logout_time) : 'Masih online'}</div>
                    </div>
                    <div className="field">
                      <label>Status</label>
                      <div><OnlineStatus logoutTime={detailItem.logout_time} /></div>
                    </div>
                  </>
                ) : (
                  <div className="field">
                    <label>Waktu</label>
                    <div>{formatTimestamp(detailItem.created_at)}</div>
                  </div>
                )}
              </div>
              {formattedPayload ? (
                <div className="field" style={{ marginTop: '16px' }}>
                  <label>Payload</label>
                  <pre style={{
                    background: '#f8f9fa',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '13px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {formattedPayload}
                  </pre>
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="button-ghost" onClick={() => setDetailItem(null)} type="button">
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
