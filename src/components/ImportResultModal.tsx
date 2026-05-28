import { AlertTriangle, CheckCircle, FileWarning, X } from 'lucide-react'

type ImportError = {
  row: number
  message: string
}

type ImportResult = {
  total_rows?: number
  skipped_rows?: number
  success_count?: number
  error_count?: number
  errors?: ImportError[]
}

type ImportResultModalProps = {
  result: ImportResult
  moduleLabel: string
  onClose: () => void
}

export function ImportResultModal({ result, moduleLabel, onClose }: ImportResultModalProps) {
  const totalRows = result.total_rows ?? 0
  const successCount = result.success_count ?? 0
  const skippedRows = result.skipped_rows ?? 0
  const errorCount = result.error_count ?? 0
  const errors = result.errors ?? []
  const hasErrors = errors.length > 0
  const allSuccess = errorCount === 0

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-panel import-result-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2 className="modal-title">Hasil Import {moduleLabel}</h2>
          <p className="modal-copy">
            {allSuccess
              ? 'Semua data berhasil diimport.'
              : `Terdapat ${errorCount} baris yang gagal diimport.`}
          </p>
        </div>

        <div className="modal-body">
          <div className="import-result-stats">
            <div className="import-stat-card import-stat-card--total">
              <span className="import-stat-value">{totalRows}</span>
              <span className="import-stat-label">Total Baris</span>
            </div>
            <div className="import-stat-card import-stat-card--success">
              <CheckCircle size={18} />
              <span className="import-stat-value">{successCount}</span>
              <span className="import-stat-label">Berhasil</span>
            </div>
            <div className="import-stat-card import-stat-card--skipped">
              <FileWarning size={18} />
              <span className="import-stat-value">{skippedRows}</span>
              <span className="import-stat-label">Dilewati</span>
            </div>
            {hasErrors ? (
              <div className="import-stat-card import-stat-card--error">
                <AlertTriangle size={18} />
                <span className="import-stat-value">{errorCount}</span>
                <span className="import-stat-label">Gagal</span>
              </div>
            ) : null}
          </div>

          {hasErrors ? (
            <div className="import-error-section">
              <h3 className="import-error-title">Detail Error</h3>
              <div className="import-error-table-wrapper">
                <table className="import-error-table">
                  <thead>
                    <tr>
                      <th className="import-error-th">Baris</th>
                      <th className="import-error-th">Pesan Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((error, index) => (
                      <tr key={index} className="import-error-tr">
                        <td className="import-error-td import-error-td--row">{error.row}</td>
                        <td className="import-error-td">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button className="button" onClick={onClose} type="button">
            <X size={18} />
            &nbsp;Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
