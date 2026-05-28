import { useRef, useState } from 'react'
import { Download, LoaderCircle, Upload } from 'lucide-react'
import { downloadFile, extractError, uploadFile } from '../lib/api'
import { ImportResultModal } from './ImportResultModal'

type ImportResult = {
  total_rows?: number
  skipped_rows?: number
  success_count?: number
  error_count?: number
  errors?: Array<{ row: number; message: string }>
}

type ExportFilters = {
  status?: string
  gender?: string
  entry_year?: string
  is_active?: string
  search?: string
}

type ImportExportPanelProps = {
  module: string
  label?: string
  onImportSuccess?: () => void
}

function buildExportQuery(filters: ExportFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.gender) params.set('gender', filters.gender)
  if (filters.entry_year) params.set('entry_year', filters.entry_year)
  if (filters.is_active) params.set('is_active', filters.is_active)
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function ImportExportPanel({ module, label, onImportSuccess }: ImportExportPanelProps) {
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [resultModalOpen, setResultModalOpen] = useState(false)
  const [exportFilters, setExportFilters] = useState<ExportFilters>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const moduleLabel = label ?? module

  function handleDownloadTemplate() {
    setErrorMessage('')
    downloadFile(`/shared/import/${module}/template`, `template_import_${module}.xlsx`).catch((error) => {
      setErrorMessage(extractError(error))
    })
  }

  function handleExportClick() {
    setExportFilters({})
    setExportModalOpen(true)
  }

  function handleExportModalClose() {
    setExportModalOpen(false)
  }

  function handleExportSubmit() {
    setErrorMessage('')
    setExportModalOpen(false)
    const query = buildExportQuery(exportFilters)
    downloadFile(`/shared/export/${module}${query}`, `export_${module}.xlsx`).catch((error) => {
      setErrorMessage(extractError(error))
    })
  }

  function handleImportClick() {
    setImportFile(null)
    setErrorMessage('')
    setImportModalOpen(true)
  }

  function handleImportModalClose() {
    setImportModalOpen(false)
    setImportFile(null)
  }

  function handleResultModalClose() {
    setResultModalOpen(false)
    setImportResult(null)
  }

  async function handleImportSubmit() {
    if (!importFile) return
    try {
      setImporting(true)
      setErrorMessage('')
      const result = await uploadFile<ImportResult>(`/shared/import/${module}`, importFile)
      setImportResult(result)
      setImportModalOpen(false)
      setResultModalOpen(true)
      onImportSuccess?.()
    } catch (error) {
      setErrorMessage(extractError(error))
    } finally {
      setImporting(false)
    }
  }

  const showStatusFilter = module === 'students' || module === 'teachers'
  const showGenderFilter = module === 'students' || module === 'teachers'
  const showEntryYearFilter = module === 'students'
  const showIsActiveFilter = module === 'academic-years'
  const showSearchFilter = module === 'departments' || module === 'grade-levels' || module === 'academic-years'

  return (
    <>
      <button className="button button-ghost" onClick={handleDownloadTemplate} type="button">
        <Download size={18} />
        &nbsp;Template {moduleLabel}
      </button>
      <button className="button button-ghost" onClick={handleImportClick} type="button">
        <Upload size={18} />
        &nbsp;Import {moduleLabel}
      </button>
      <button className="button button-ghost" onClick={handleExportClick} type="button">
        <Download size={18} />
        &nbsp;Export {moduleLabel}
      </button>

      {errorMessage ? <div className="feedback feedback--error">{errorMessage}</div> : null}

      {resultModalOpen && importResult ? (
        <ImportResultModal result={importResult} moduleLabel={moduleLabel} onClose={handleResultModalClose} />
      ) : null}

      {exportModalOpen ? (
        <div className="modal-backdrop" onClick={handleExportModalClose} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <h2 className="modal-title">Export {moduleLabel}</h2>
              <p className="modal-copy">
                Pilih filter untuk data yang ingin di-export. Kosongkan untuk export semua data.
              </p>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                {showStatusFilter ? (
                  <div className="field">
                    <label htmlFor="export-status">Status</label>
                    <select
                      id="export-status"
                      value={exportFilters.status ?? ''}
                      onChange={(event) => setExportFilters((prev) => ({ ...prev, status: event.target.value || undefined }))}
                    >
                      <option value="">Semua Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                ) : null}

                {showGenderFilter ? (
                  <div className="field">
                    <label htmlFor="export-gender">Jenis Kelamin</label>
                    <select
                      id="export-gender"
                      value={exportFilters.gender ?? ''}
                      onChange={(event) => setExportFilters((prev) => ({ ...prev, gender: event.target.value || undefined }))}
                    >
                      <option value="">Semua Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                ) : null}

                {showEntryYearFilter ? (
                  <div className="field">
                    <label htmlFor="export-entry-year">Tahun Masuk</label>
                    <input
                      id="export-entry-year"
                      type="number"
                      min={1901}
                      max={2155}
                      placeholder="Semua Angkatan"
                      value={exportFilters.entry_year ?? ''}
                      onChange={(event) => setExportFilters((prev) => ({ ...prev, entry_year: event.target.value || undefined }))}
                    />
                  </div>
                ) : null}

                {showIsActiveFilter ? (
                  <div className="field">
                    <label htmlFor="export-is-active">Status Aktif</label>
                    <select
                      id="export-is-active"
                      value={exportFilters.is_active ?? ''}
                      onChange={(event) => setExportFilters((prev) => ({ ...prev, is_active: event.target.value || undefined }))}
                    >
                      <option value="">Semua</option>
                      <option value="1">Aktif</option>
                      <option value="0">Nonaktif</option>
                    </select>
                  </div>
                ) : null}

                {showSearchFilter ? (
                  <div className="field field--full">
                    <label htmlFor="export-search">Cari (kode/nama)</label>
                    <input
                      id="export-search"
                      type="text"
                      placeholder="Kosongkan untuk semua data"
                      value={exportFilters.search ?? ''}
                      onChange={(event) => setExportFilters((prev) => ({ ...prev, search: event.target.value || undefined }))}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="modal-footer">
              <button className="button-ghost" onClick={handleExportModalClose} type="button">
                Batal
              </button>
              <button className="button" onClick={handleExportSubmit} type="button">
                <Download size={18} />
                &nbsp;Export Sekarang
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importModalOpen ? (
        <div className="modal-backdrop" onClick={handleImportModalClose} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <h2 className="modal-title">Import {moduleLabel} dari Excel</h2>
              <p className="modal-copy">
                Upload file Excel (.xlsx) yang sudah diisi sesuai template.
              </p>
            </div>

            <div className="modal-body">
              <div className="field field--full">
                <label>File Excel (.xlsx)</label>
                <div className="import-drop-zone">
                  <input
                    ref={fileInputRef}
                    accept=".xlsx"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setImportFile(file)
                    }}
                    style={{ display: 'none' }}
                    type="file"
                  />
                  {importFile ? (
                    <div className="import-file-info">
                      <span>{importFile.name}</span>
                      <button className="button-ghost" onClick={() => { setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} type="button">Ganti</button>
                    </div>
                  ) : (
                    <button className="button button-ghost" onClick={() => fileInputRef.current?.click()} type="button">
                      <Upload size={18} />
                      &nbsp;Pilih File
                    </button>
                  )}
                </div>
              </div>

              <div className="import-actions-row">
                <button className="button-ghost" onClick={handleDownloadTemplate} type="button">
                  <Download size={16} />
                  &nbsp;Download Template
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="button-ghost" onClick={handleImportModalClose} type="button">
                Batal
              </button>
              <button className="button" disabled={!importFile || importing} onClick={handleImportSubmit} type="button">
                {importing ? <LoaderCircle className="spin" size={18} /> : null}
                {importing ? ' Mengimport…' : 'Import Sekarang'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
