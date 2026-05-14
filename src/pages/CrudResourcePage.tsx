import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import {
  createResource,
  deleteResource,
  extractError,
  listOptions,
  listResource,
  updateResource,
} from '../lib/api'
import type {
  ResourceConfig,
  ResourceFieldConfig,
  ResourceRecord,
  StaticOption,
} from '../types/resources'

type CrudResourcePageProps = {
  config: ResourceConfig
}

type SelectOptionMap = Record<string, StaticOption[]>
type FormValues = Record<string, string | boolean>

function toFormValues(
  fields: ResourceFieldConfig[],
  source: ResourceRecord | null,
  fallback: FormValues,
): FormValues {
  if (!source) {
    return { ...fallback }
  }

  return fields.reduce<FormValues>((result, field) => {
    const raw = source[field.name]
    if (field.type === 'checkbox') {
      result[field.name] = Boolean(raw)
      return result
    }

    if (raw === null || raw === undefined) {
      result[field.name] = ''
      return result
    }

    result[field.name] = String(raw)
    return result
  }, { ...fallback })
}

function createPayload(fields: ResourceFieldConfig[], values: FormValues): ResourceRecord {
  return fields.reduce<ResourceRecord>((payload, field) => {
    const raw = values[field.name]

    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(raw)
      return payload
    }

    const textValue = String(raw ?? '')

    if (field.type === 'number' || (field.type === 'select' && field.valueType === 'number')) {
      if (textValue === '') {
        payload[field.name] = field.nullable ? null : ''
        return payload
      }

      payload[field.name] = Number(textValue)
      return payload
    }

    payload[field.name] = textValue
    return payload
  }, {})
}

function renderCell(item: ResourceRecord, key: string) {
  const value = item[key]
  if (value === null || value === undefined || value === '') {
    return <span className="cell-subtitle">-</span>
  }

  return String(value)
}

export function CrudResourcePage({ config }: CrudResourcePageProps) {
  const [items, setItems] = useState<ResourceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ResourceRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(config.initialValues)
  const [selectOptions, setSelectOptions] = useState<SelectOptionMap>({})

  useEffect(() => {
    let isMounted = true

    async function loadItems() {
      try {
        setLoading(true)
        setErrorMessage('')
        const result = await listResource<ResourceRecord>(config.endpoint, deferredSearch)
        if (!isMounted) {
          return
        }
        setItems(result.items)
        setTotal(result.total)
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

    void loadItems()

    return () => {
      isMounted = false
    }
  }, [config.endpoint, deferredSearch])

  useEffect(() => {
    let isMounted = true

    async function loadFieldOptions() {
      const optionFields = config.fields.filter((field) => field.optionsEndpoint)
      if (optionFields.length === 0) {
        return
      }

      try {
        const results = await Promise.all(
          optionFields.map(async (field) => {
            const rows = await listOptions(field.optionsEndpoint!)
            const options = rows.map((item) => ({
              label: field.getOptionLabel ? field.getOptionLabel(item) : String(item.name ?? item.label ?? item.id),
              value: String(item[field.optionValueKey ?? 'id'] ?? ''),
            }))

            return [field.name, options] as const
          }),
        )

        if (!isMounted) {
          return
        }

        setSelectOptions((current) => {
          const next = { ...current }
          for (const [fieldName, options] of results) {
            next[fieldName] = options
          }
          return next
        })
      } catch (error) {
        if (!isMounted) {
          return
        }
        setErrorMessage(extractError(error))
      }
    }

    void loadFieldOptions()

    return () => {
      isMounted = false
    }
  }, [config.fields])

  const modalTitle = useMemo(
    () => (editingItem ? `Edit ${config.title}` : `Create ${config.title}`),
    [config.title, editingItem],
  )

  async function refreshList() {
    setLoading(true)
    try {
      const result = await listResource<ResourceRecord>(config.endpoint, deferredSearch)
      setItems(result.items)
      setTotal(result.total)
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setLoading(false)
    }
  }

  function handleCreateClick() {
    startTransition(() => {
      setEditingItem(null)
      setFormValues({ ...config.initialValues })
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleEditClick(item: ResourceRecord) {
    startTransition(() => {
      setEditingItem(item)
      setFormValues(toFormValues(config.fields, item, config.initialValues))
      setErrorMessage('')
      setSuccessMessage('')
      setModalOpen(true)
    })
  }

  function handleModalClose() {
    setModalOpen(false)
  }

  function updateFieldValue(fieldName: string, value: string | boolean) {
    setFormValues((current) => ({
      ...current,
      [fieldName]: value,
    }))
  }

  async function handleDelete(item: ResourceRecord) {
    const id = Number(item.id)
    if (!id) {
      return
    }

    const confirmed = window.confirm(`Hapus data ${config.title} ini?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await deleteResource(config.endpoint, id)
      setSuccessMessage(`${config.title} berhasil dihapus.`)
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

      const payload = createPayload(config.fields, formValues)
      if (editingItem?.id) {
        await updateResource(config.endpoint, Number(editingItem.id), payload)
        setSuccessMessage(`${config.title} berhasil diperbarui.`)
      } else {
        await createResource(config.endpoint, payload)
        setSuccessMessage(`${config.title} berhasil dibuat.`)
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
            &nbsp;Tambah Data
          </button>
        </div>
      </section>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback feedback--success">{successMessage}</div> : null}

      <section className="panel">
        <div className="toolbar">
          <div className="toolbar__search">
            <Search size={18} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder}
              value={search}
            />
          </div>

          <div className="toolbar__actions">
            <div className="chip">Total data: {total}</div>
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
              Begitu data pertama ditambahkan, halaman ini akan langsung menampilkan list
              dan form edit dengan pola yang sama.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.key}>{column.header}</th>
                  ))}
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.id)}>
                    {config.columns.map((column) => (
                      <td key={column.key}>
                        {column.render ? column.render(item) : renderCell(item, column.key)}
                      </td>
                    ))}
                    <td>
                      <div className="table-actions">
                        <button
                          className="table-action"
                          onClick={() => handleEditClick(item)}
                          type="button"
                        >
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
              <h2 className="modal-title">{modalTitle}</h2>
              <p className="modal-copy">
                {editingItem
                  ? 'Perbarui data yang sudah ada tanpa meninggalkan konteks halaman.'
                  : 'Tambahkan data baru ke modul ini menggunakan pola form yang konsisten.'}
              </p>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                {config.fields.map((field) => {
                  const value = formValues[field.name]
                  const fieldOptions = field.options
                    ? field.options
                    : field.optionsEndpoint
                      ? [{ label: `Pilih ${field.label}`, value: '' }, ...(selectOptions[field.name] ?? [])]
                      : []

                  return (
                    <div className={`field ${field.fullWidth ? 'field--full' : ''}`} key={field.name}>
                      {field.type === 'checkbox' ? (
                        <label className="checkbox-field">
                          <input
                            checked={Boolean(value)}
                            onChange={(event) => updateFieldValue(field.name, event.target.checked)}
                            type="checkbox"
                          />
                          <span>{field.label}</span>
                        </label>
                      ) : (
                        <>
                          <label htmlFor={field.name}>
                            {field.label}
                            {field.required ? ' *' : ''}
                          </label>

                          {field.type === 'textarea' ? (
                            <textarea
                              id={field.name}
                              onChange={(event) => updateFieldValue(field.name, event.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                              value={String(value ?? '')}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              id={field.name}
                              onChange={(event) => updateFieldValue(field.name, event.target.value)}
                              required={field.required}
                              value={String(value ?? '')}
                            >
                              {fieldOptions.map((option) => (
                                <option key={String(option.value)} value={String(option.value)}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={field.name}
                              min={field.min}
                              onChange={(event) => updateFieldValue(field.name, event.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                              step={field.step}
                              type={field.type}
                              value={typeof value === 'boolean' ? String(value) : String(value ?? '')}
                            />
                          )}

                          {field.description ? <small>{field.description}</small> : null}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="modal-footer">
                <button className="button-ghost" onClick={handleModalClose} type="button">
                  Batal
                </button>
                <button className="button" disabled={submitting} type="submit">
                  {submitting ? <LoaderCircle className="spin" size={18} /> : null}
                  {submitting ? ' Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Buat Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
