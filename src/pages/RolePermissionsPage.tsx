import { useEffect, useState } from 'react'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import { extractError, listResource, replaceResource } from '../lib/api'
import type { ResourceRecord } from '../types/resources'

type RoleRecord = ResourceRecord & { id?: number; name?: string; code?: string }
type PermissionRecord = ResourceRecord & { id?: number; name?: string; code?: string }

export function RolePermissionsPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [allPermissions, setAllPermissions] = useState<PermissionRecord[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const [rolesResult, permsResult] = await Promise.all([
          listResource<RoleRecord>('/roles'),
          listResource<PermissionRecord>('/permissions'),
        ])
        if (!isMounted) return
        setRoles(rolesResult.items)
        setAllPermissions(permsResult.items)
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
    if (!selectedRoleId) {
      setAssignedPermissionIds(new Set())
      return
    }
    let isMounted = true
    async function loadRolePermissions() {
      try {
        setErrorMessage('')
        const result = await listResource<PermissionRecord>(`/roles/${selectedRoleId}/permissions`)
        if (!isMounted) return
        setAssignedPermissionIds(new Set(result.items.map((p) => Number(p.id))))
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      }
    }
    void loadRolePermissions()
    return () => { isMounted = false }
  }, [selectedRoleId])

  function togglePermission(permId: number) {
    setAssignedPermissionIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) {
        next.delete(permId)
      } else {
        next.add(permId)
      }
      return next
    })
  }

  function toggleAll() {
    if (assignedPermissionIds.size === allPermissions.length) {
      setAssignedPermissionIds(new Set())
    } else {
      setAssignedPermissionIds(new Set(allPermissions.map((p) => Number(p.id))))
    }
  }

  async function handleSave() {
    if (!selectedRoleId) return
    try {
      setSaving(true)
      setErrorMessage('')
      setSuccessMessage('')
      await replaceResource(`/roles/${selectedRoleId}/permissions`, {
        permission_ids: Array.from(assignedPermissionIds),
      })
      setSuccessMessage('Permission role berhasil diperbarui.')
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSaving(false)
    }
  }

  const selectedRole = roles.find((r) => String(r.id) === selectedRoleId)

  if (loading) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <div>
            <p className="page-header__eyebrow">Administration</p>
            <h1 className="page-header__title">Role Permissions</h1>
            <p className="page-header__description">Atur permission mana saja yang dimiliki oleh setiap role.</p>
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
          <h1 className="page-header__title">Role Permissions</h1>
          <p className="page-header__description">Atur permission mana saja yang dimiliki oleh setiap role.</p>
        </div>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar">
          <div className="toolbar__search">
            <ShieldCheck size={18} />
            <select
              className="toolbar-select"
              value={selectedRoleId}
              onChange={(event) => {
                setSelectedRoleId(event.target.value)
                setSuccessMessage('')
              }}
              style={{ minWidth: '240px' }}
            >
              <option value="">Pilih Role</option>
              {roles.map((role) => (
                <option key={String(role.id)} value={String(role.id)}>
                  {String(role.name)} ({String(role.code)})
                </option>
              ))}
            </select>
          </div>
          {selectedRoleId ? (
            <div className="toolbar__actions">
              <button className="button" disabled={saving} onClick={handleSave} type="button">
                {saving ? <LoaderCircle className="spin" size={18} /> : null}
                {saving ? ' Menyimpan…' : ' Simpan'}
              </button>
            </div>
          ) : null}
        </div>

        {!selectedRoleId ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Pilih role terlebih dahulu.</strong>
              Pilih role dari dropdown di atas untuk mengatur permission-nya.
            </div>
          </div>
        ) : allPermissions.length === 0 ? (
          <div className="panel__body">
            <div className="empty-state">
              <strong>Belum ada permission.</strong>
              Buat permission terlebih dahulu di halaman Permissions.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      checked={assignedPermissionIds.size === allPermissions.length && allPermissions.length > 0}
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
                {allPermissions.map((perm) => (
                  <tr key={String(perm.id)}>
                    <td>
                      <input
                        checked={assignedPermissionIds.has(Number(perm.id))}
                        onChange={() => togglePermission(Number(perm.id))}
                        type="checkbox"
                      />
                    </td>
                    <td>{String(perm.name ?? '-')}</td>
                    <td><span className="inline-status inline-status--soft">{String(perm.code ?? '-')}</span></td>
                    <td>{String(perm.description ?? '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedRole ? (
          <div className="panel__body" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', paddingBottom: '12px' }}>
            <span className="chip">
              {String(selectedRole.name)} · {assignedPermissionIds.size} / {allPermissions.length} permissions
            </span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
