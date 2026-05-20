import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Factory, LoaderCircle, PencilLine, Plus, Search, Trash2, Building2, MapPinned } from 'lucide-react'
import { createResource, deleteResource, extractError, listOptions, listResource, updateResource } from '../lib/api'
import type { ResourceRecord, StaticOption } from '../types/resources'

type IndustryCategoryRecord = ResourceRecord & {
  id?: number
  name?: string
  description?: string
}

type CompanyRecord = ResourceRecord & {
  id?: number
  category_id?: number
  category_name?: string
  name?: string
  city?: string
  address?: string
  contact_person?: string
  phone?: string
  email?: string
  status?: string
}

type CategoryFormValues = {
  name: string
  description: string
}

type CompanyFormValues = {
  category_id: string
  name: string
  city: string
  address: string
  contact_person: string
  phone: string
  email: string
  status: string
}

const categoriesEndpoint = '/industry-relations/categories'
const companiesEndpoint = '/industry-relations/companies'

function toCategoryFormValues(item: IndustryCategoryRecord | null): CategoryFormValues {
  if (!item) {
    return { name: '', description: '' }
  }
  return {
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
  }
}

function toCompanyFormValues(item: CompanyRecord | null): CompanyFormValues {
  if (!item) {
    return {
      category_id: '',
      name: '',
      city: '',
      address: '',
      contact_person: '',
      phone: '',
      email: '',
      status: 'active',
    }
  }
  return {
    category_id: String(item.category_id ?? ''),
    name: String(item.name ?? ''),
    city: String(item.city ?? ''),
    address: String(item.address ?? ''),
    contact_person: String(item.contact_person ?? ''),
    phone: String(item.phone ?? ''),
    email: String(item.email ?? ''),
    status: String(item.status ?? 'active'),
  }
}

function toCategoryPayload(values: CategoryFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
  }
}

function toCompanyPayload(values: CompanyFormValues) {
  return {
    category_id: values.category_id ? Number(values.category_id) : 0,
    name: values.name.trim(),
    city: values.city.trim(),
    address: values.address.trim(),
    contact_person: values.contact_person.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    status: values.status.trim() || 'active',
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'active') {
    return <span className="inline-status inline-status--active">Active</span>
  }
  if (normalized === 'inactive') {
    return <span className="inline-status inline-status--inactive">Inactive</span>
  }
  return <span className="inline-status inline-status--soft">{String(value ?? '-')}</span>
}

export function HubimCompaniesPage() {
  const [categories, setCategories] = useState<IndustryCategoryRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [overviewCompanies, setOverviewCompanies] = useState<CompanyRecord[]>([])
  const [categoryOptions, setCategoryOptions] = useState<StaticOption[]>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [companySearch, setCompanySearch] = useState('')
  const deferredCategorySearch = useDeferredValue(categorySearch)
  const deferredCompanySearch = useDeferredValue(companySearch)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('')
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [submittingCategory, setSubmittingCategory] = useState(false)
  const [submittingCompany, setSubmittingCompany] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [companyModalOpen, setCompanyModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<IndustryCategoryRecord | null>(null)
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(null)
  const [categoryFormValues, setCategoryFormValues] = useState<CategoryFormValues>(toCategoryFormValues(null))
  const [companyFormValues, setCompanyFormValues] = useState<CompanyFormValues>(toCompanyFormValues(null))

  const companyQuery = useMemo(() => {
    const query: Record<string, number | string> = {}
    if (categoryFilter) query.category_id = Number(categoryFilter)
    if (statusFilter !== 'all') query.status = statusFilter
    if (cityFilter.trim()) query.city = cityFilter.trim()
    return query
  }, [categoryFilter, cityFilter, statusFilter])

  const activeCompanies = useMemo(
    () => overviewCompanies.filter((item) => String(item.status ?? '').toLowerCase() === 'active').length,
    [overviewCompanies],
  )
  const cityCoverage = useMemo(
    () => new Set(overviewCompanies.map((item) => String(item.city ?? '')).filter(Boolean)).size,
    [overviewCompanies],
  )
  const categoryCoverage = useMemo(
    () => new Set(overviewCompanies.map((item) => String(item.category_name ?? '')).filter(Boolean)).size,
    [overviewCompanies],
  )

  async function refreshCategories(searchValue = deferredCategorySearch) {
    setLoadingCategories(true)
    try {
      const result = await listResource<IndustryCategoryRecord>(categoriesEndpoint, searchValue)
      setCategories(result.items)
      setCategoryOptions(
        result.items.map((item) => ({
          label: String(item.name ?? '-'),
          value: String(item.id ?? ''),
        })),
      )
    } finally {
      setLoadingCategories(false)
    }
  }

  async function refreshCompanies(searchValue = deferredCompanySearch, query = companyQuery) {
    setLoadingCompanies(true)
    try {
      const [listResult, overviewResult] = await Promise.all([
        listResource<CompanyRecord>(companiesEndpoint, searchValue, query),
        listResource<CompanyRecord>(companiesEndpoint),
      ])
      setCompanies(listResult.items)
      setOverviewCompanies(overviewResult.items)
    } finally {
      setLoadingCompanies(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function syncCategories() {
      setLoadingCategories(true)
      try {
        const result = await listResource<IndustryCategoryRecord>(categoriesEndpoint, deferredCategorySearch)
        if (!isMounted) return
        setCategories(result.items)
        setCategoryOptions(
          result.items.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoadingCategories(false)
      }
    }
    void syncCategories()
    return () => {
      isMounted = false
    }
  }, [deferredCategorySearch])

  useEffect(() => {
    let isMounted = true
    async function syncCompanies() {
      setLoadingCompanies(true)
      try {
        const [listResult, overviewResult] = await Promise.all([
          listResource<CompanyRecord>(companiesEndpoint, deferredCompanySearch, companyQuery),
          listResource<CompanyRecord>(companiesEndpoint),
        ])
        if (!isMounted) return
        setCompanies(listResult.items)
        setOverviewCompanies(overviewResult.items)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      } finally {
        if (isMounted) setLoadingCompanies(false)
      }
    }
    void syncCompanies()
    return () => {
      isMounted = false
    }
  }, [companyQuery, deferredCompanySearch])

  useEffect(() => {
    let isMounted = true
    async function syncCategoryOptions() {
      try {
        const items = await listOptions(categoriesEndpoint)
        if (!isMounted) return
        setCategoryOptions(
          items.map((item) => ({
            label: String(item.name ?? '-'),
            value: String(item.id ?? ''),
          })),
        )
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(extractError(error))
      }
    }
    void syncCategoryOptions()
    return () => {
      isMounted = false
    }
  }, [])

  function handleCreateCategory() {
    startTransition(() => {
      setEditingCategory(null)
      setCategoryFormValues(toCategoryFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setCategoryModalOpen(true)
    })
  }

  function handleEditCategory(item: IndustryCategoryRecord) {
    startTransition(() => {
      setEditingCategory(item)
      setCategoryFormValues(toCategoryFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setCategoryModalOpen(true)
    })
  }

  function handleCreateCompany() {
    startTransition(() => {
      setEditingCompany(null)
      setCompanyFormValues(toCompanyFormValues(null))
      setErrorMessage('')
      setSuccessMessage('')
      setCompanyModalOpen(true)
    })
  }

  function handleEditCompany(item: CompanyRecord) {
    startTransition(() => {
      setEditingCompany(item)
      setCompanyFormValues(toCompanyFormValues(item))
      setErrorMessage('')
      setSuccessMessage('')
      setCompanyModalOpen(true)
    })
  }

  async function handleDeleteCategory(item: IndustryCategoryRecord) {
    if (!item.id) return
    if (!window.confirm(`Hapus kategori industri ${item.name ?? ''}?`)) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(categoriesEndpoint, Number(item.id))
      setSuccessMessage('Kategori industri berhasil dihapus.')
      await refreshCategories()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleDeleteCompany(item: CompanyRecord) {
    if (!item.id) return
    if (!window.confirm(`Hapus perusahaan ${item.name ?? ''}?`)) return
    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(companiesEndpoint, Number(item.id))
      setSuccessMessage('Perusahaan berhasil dihapus.')
      await refreshCompanies()
    } catch (error) {
      setErrorMessage(extractError(error))
    }
  }

  async function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmittingCategory(true)
      setErrorMessage('')
      setSuccessMessage('')
      const payload = toCategoryPayload(categoryFormValues)
      if (editingCategory?.id) {
        await updateResource(categoriesEndpoint, Number(editingCategory.id), payload)
        setSuccessMessage('Kategori industri berhasil diperbarui.')
      } else {
        await createResource(categoriesEndpoint, payload)
        setSuccessMessage('Kategori industri berhasil dibuat.')
      }
      setCategoryModalOpen(false)
      await refreshCategories()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmittingCategory(false)
    }
  }

  async function handleCompanySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmittingCompany(true)
      setErrorMessage('')
      setSuccessMessage('')
      const payload = toCompanyPayload(companyFormValues)
      if (editingCompany?.id) {
        await updateResource(companiesEndpoint, Number(editingCompany.id), payload)
        setSuccessMessage('Perusahaan berhasil diperbarui.')
      } else {
        await createResource(companiesEndpoint, payload)
        setSuccessMessage('Perusahaan berhasil dibuat.')
      }
      setCompanyModalOpen(false)
      await refreshCompanies()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setSubmittingCompany(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="page-header__eyebrow">HUBIM</p>
          <h1 className="page-header__title">Company Partners</h1>
          <p className="page-header__description">
            Kelola kategori industri dan daftar perusahaan mitra agar penempatan prakerin dan relasi eksternal punya fondasi yang rapi.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="button-secondary" onClick={handleCreateCategory} type="button">
            <Plus size={18} />
            &nbsp;Tambah Kategori
          </button>
          <button className="button" onClick={handleCreateCompany} type="button">
            <Plus size={18} />
            &nbsp;Tambah Perusahaan
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <Building2 size={18} />
          </div>
          <div>
            <div className="stat-card__label">Industry Categories</div>
            <div className="stat-card__value">{categories.length}</div>
            <div className="stat-card__copy">Klasifikasi mitra industri untuk memudahkan segmentasi kerja sama.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <Factory size={18} />
          </div>
          <div>
            <div className="stat-card__label">Companies</div>
            <div className="stat-card__value">{overviewCompanies.length}</div>
            <div className="stat-card__copy">{activeCompanies} perusahaan aktif siap dipakai untuk penempatan siswa.</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__icon stat-card__icon--sky">
            <MapPinned size={18} />
          </div>
          <div>
            <div className="stat-card__label">Coverage</div>
            <div className="stat-card__value stat-card__value--compact">{cityCoverage} kota</div>
            <div className="stat-card__copy">{categoryCoverage} kategori industri sudah terwakili di database mitra.</div>
          </div>
        </article>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div>
            <p className="page-header__eyebrow">Kategori Industri</p>
            <h2 className="panel-heading">Industry Categories</h2>
          </div>
          <div className="toolbar__actions">
            <label className="toolbar__search">
              <Search size={18} />
              <input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Cari nama kategori atau deskripsi..." type="search" />
            </label>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingCategories ? (
                <tr><td className="table-empty" colSpan={3}><LoaderCircle className="spin" size={18} /> Memuat kategori industri...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td className="table-empty" colSpan={3}>Belum ada kategori industri yang cocok dengan pencarian saat ini.</td></tr>
              ) : (
                categories.map((item) => (
                  <tr key={String(item.id)}>
                    <td><div className="cell-title">{String(item.name ?? '-')}</div></td>
                    <td><div className="cell-subtitle">{String(item.description ?? 'Tanpa deskripsi')}</div></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditCategory(item)} type="button"><PencilLine size={16} /></button>
                        <button className="icon-button icon-button--danger" onClick={() => handleDeleteCategory(item)} type="button"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar toolbar--stack">
          <div>
            <p className="page-header__eyebrow">Perusahaan Mitra</p>
            <h2 className="panel-heading">Company Directory</h2>
          </div>
          <div className="toolbar__actions">
            <label className="toolbar__search">
              <Search size={18} />
              <input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Cari perusahaan, PIC, email, atau kategori..." type="search" />
            </label>
            <div className="toolbar__filters">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">Semua kategori</option>
                {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <input value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Filter kota" type="text" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Semua status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Perusahaan</th>
                <th>Kategori</th>
                <th>Kota</th>
                <th>Kontak</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingCompanies ? (
                <tr><td className="table-empty" colSpan={6}><LoaderCircle className="spin" size={18} /> Memuat perusahaan mitra...</td></tr>
              ) : companies.length === 0 ? (
                <tr><td className="table-empty" colSpan={6}>Belum ada perusahaan yang cocok dengan filter saat ini.</td></tr>
              ) : (
                companies.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <div className="cell-title">{String(item.name ?? '-')}</div>
                      <div className="cell-subtitle">{String(item.address ?? 'Tanpa alamat')}</div>
                    </td>
                    <td><div className="cell-subtitle">{String(item.category_name ?? 'Tanpa kategori')}</div></td>
                    <td><div className="cell-subtitle">{String(item.city ?? '-')}</div></td>
                    <td>
                      <div className="cell-title">{String(item.contact_person ?? 'Belum ada PIC')}</div>
                      <div className="cell-subtitle">{String(item.phone ?? item.email ?? '-')}</div>
                    </td>
                    <td><StatusBadge value={item.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => handleEditCompany(item)} type="button"><PencilLine size={16} /></button>
                        <button className="icon-button icon-button--danger" onClick={() => handleDeleteCompany(item)} type="button"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {categoryModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-card__header">
              <p className="page-header__eyebrow">HUBIM Category</p>
              <h2 className="panel-heading">{editingCategory ? 'Edit Kategori Industri' : 'Tambah Kategori Industri'}</h2>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Nama Kategori</span>
                  <input value={categoryFormValues.name} onChange={(event) => setCategoryFormValues((current) => ({ ...current, name: event.target.value }))} placeholder="Mis. Software House, Manufaktur, Retail" required type="text" />
                </label>
                <label className="form-field form-field--full">
                  <span>Deskripsi</span>
                  <textarea rows={4} value={categoryFormValues.description} onChange={(event) => setCategoryFormValues((current) => ({ ...current, description: event.target.value }))} placeholder="Jelaskan kategori industri ini digunakan untuk tipe mitra seperti apa." />
                </label>
              </div>
              <div className="form-actions">
                <button className="button-ghost" onClick={() => setCategoryModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submittingCategory} type="submit">
                  {submittingCategory ? <LoaderCircle className="spin" size={18} /> : null}
                  {submittingCategory ? ' Menyimpan...' : ' Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {companyModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-card__header">
              <p className="page-header__eyebrow">Company Partner</p>
              <h2 className="panel-heading">{editingCompany ? 'Edit Perusahaan Mitra' : 'Tambah Perusahaan Mitra'}</h2>
            </div>
            <form onSubmit={handleCompanySubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Nama Perusahaan</span>
                  <input value={companyFormValues.name} onChange={(event) => setCompanyFormValues((current) => ({ ...current, name: event.target.value }))} placeholder="Mis. PT Nusantara Digital" required type="text" />
                </label>
                <label className="form-field">
                  <span>Kategori Industri</span>
                  <select value={companyFormValues.category_id} onChange={(event) => setCompanyFormValues((current) => ({ ...current, category_id: event.target.value }))}>
                    <option value="">Tanpa kategori</option>
                    {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span>Kota</span>
                  <input value={companyFormValues.city} onChange={(event) => setCompanyFormValues((current) => ({ ...current, city: event.target.value }))} placeholder="Mis. Padang" type="text" />
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select value={companyFormValues.status} onChange={(event) => setCompanyFormValues((current) => ({ ...current, status: event.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Contact Person</span>
                  <input value={companyFormValues.contact_person} onChange={(event) => setCompanyFormValues((current) => ({ ...current, contact_person: event.target.value }))} placeholder="Nama PIC perusahaan" type="text" />
                </label>
                <label className="form-field">
                  <span>Phone</span>
                  <input value={companyFormValues.phone} onChange={(event) => setCompanyFormValues((current) => ({ ...current, phone: event.target.value }))} placeholder="Nomor telepon PIC" type="text" />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input value={companyFormValues.email} onChange={(event) => setCompanyFormValues((current) => ({ ...current, email: event.target.value }))} placeholder="email@company.com" type="email" />
                </label>
                <label className="form-field form-field--full">
                  <span>Alamat</span>
                  <textarea rows={4} value={companyFormValues.address} onChange={(event) => setCompanyFormValues((current) => ({ ...current, address: event.target.value }))} placeholder="Alamat lengkap perusahaan" />
                </label>
              </div>
              <div className="form-actions">
                <button className="button-ghost" onClick={() => setCompanyModalOpen(false)} type="button">Batal</button>
                <button className="button" disabled={submittingCompany} type="submit">
                  {submittingCompany ? <LoaderCircle className="spin" size={18} /> : null}
                  {submittingCompany ? ' Menyimpan...' : ' Simpan Perusahaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
