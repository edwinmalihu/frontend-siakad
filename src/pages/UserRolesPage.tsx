import { useEffect, useState } from 'react'
import { LoaderCircle, Users } from 'lucide-react'
import { extractError, listResource, replaceResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'

type UserRecord = ResourceRecord & { id?: number; username?: string; full_name?: string; is_active?: boolean }
type RoleRecord = ResourceRecord & { id?: number; name?: string; code?: string }

export function UserRolesPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [allRoles, setAllRoles] = useState<RoleRecord[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assignedRoleIds, setAssignedRoleIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const [usersResult, rolesResult] = await Promise.all([
          listResource<UserRecord>('/users'),
          listResource<RoleRecord>('/roles'),
        ])
        if (!isMounted) return
        setUsers(usersResult.items)
        setAllRoles(rolesResult.items)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void load()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (!selectedUserId) {
      setAssignedRoleIds(new Set())
      return
    }
    let isMounted = true
    async function loadUserRoles() {
      try {
        setErrorMessage('')
        const result = await listResource<RoleRecord>(`/users/${selectedUserId}/roles`)
        if (!isMounted) return
        setAssignedRoleIds(new Set(result.items.map((r) => Number(r.id))))
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      }
    }
    void loadUserRoles()
    return () => { isMounted = false }
  }, [selectedUserId])

  function toggleRole(roleId: number) {
    setAssignedRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(roleId)) {
        next.delete(roleId)
      } else {
        next.add(roleId)
      }
      return next
    })
  }

  function toggleAll() {
    if (assignedRoleIds.size === allRoles.length) {
      setAssignedRoleIds(new Set())
    } else {
      setAssignedRoleIds(new Set(allRoles.map((r) => Number(r.id))))
    }
  }

  async function handleSave() {
    if (!selectedUserId) return
    try {
      setSaving(true)
      setErrorMessage('')
      setSuccessMessage('')
      await replaceResource(`/users/${selectedUserId}/roles`, {
        role_ids: Array.from(assignedRoleIds),
      })
      setSuccessMessage('Role user berhasil diperbarui.')
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSaving(false)
    }
  }

  const selectedUser = users.find((u) => String(u.id) === selectedUserId)

  if (loading) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <div>
            <p className="page-header__eyebrow">Administration</p>
            <h1 className="page-header__title">User Roles</h1>
            <p className="page-header__description">Atur role mana saja yang dimiliki oleh setiap pengguna.</p>
          </div>
        </section>
        <div className="panel__body">
          <div className="loading-line" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">Administration</p>
          <h1 className="page-header__title">User Roles</h1>
          <p className="page-header__description">Atur role mana saja yang dimiliki oleh setiap pengguna.</p>
        </div>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar">
          <div className="toolbar__search">
            <Users size={18} />
            <select
              className="toolbar-select"
              value={selectedUserId}
              onChange={(event) => {
                setSelectedUserId(event.target.value)
                setSuccessMessage('')
              }}
              style={{ minWidth: '280px' }}
            >
              <option value="">Pilih Pengguna</option>
              {users.map((user) => (
                <option key={String(user.id)} value={String(user.id)}>
                  {String(user.full_name || user.username)} ({String(user.username)})
                </option>
              ))}
            </select>
          </div>
          {selectedUserId ? (
            <div className="toolbar__actions">
              <button className="button" disabled={saving} onClick={handleSave} type="button">
                {saving ? <LoaderCircle className="spin" size={18} /> : null}
                {saving ? ' Menyimpan…' : ' Simpan'}
              </button>
            </div>
          ) : null}
        </div>

        {!selectedUserId ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Pilih pengguna terlebih dahulu.</strong>
              Pilih pengguna dari dropdown di atas untuk mengatur role-nya.
            </div>
          </div>
        ) : allRoles.length === 0 ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Belum ada role.</strong>
              Buat role terlebih dahulu di halaman Roles.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      checked={assignedRoleIds.size === allRoles.length && allRoles.length > 0}
                      onChange={toggleAll}
                      type="checkbox"
                    />
                  </th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {allRoles.map((role) => (
                  <tr key={String(role.id)}>
                    <td>
                      <input
                        checked={assignedRoleIds.has(Number(role.id))}
                        onChange={() => toggleRole(Number(role.id))}
                        type="checkbox"
                      />
                    </td>
                    <td>{String(role.name ?? '-')}</td>
                    <td><span className="inline-status inline-status--soft">{String(role.code ?? '-')}</span></td>
                    <td>{String(role.description ?? '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedUser ? (
          <div className="panel__body" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', paddingBottom: '12px' }}>
            <span className="chip">
              {String(selectedUser.full_name || selectedUser.username)} · {assignedRoleIds.size} / {allRoles.length} roles
            </span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
