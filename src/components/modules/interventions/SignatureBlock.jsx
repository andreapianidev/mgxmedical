import SignaturePad from '../../shared/SignaturePad'

export default function SignatureBlock({ label, signature = {}, onChange, disabled = false }) {
  const update = (key, val) => {
    onChange({ ...signature, [key]: val })
  }

  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/30">
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">{label}</h4>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-xs text-gray-400 mb-0.5">Funzione</label>
          <input
            type="text"
            value={signature.role || ''}
            onChange={e => update('role', e.target.value)}
            disabled={disabled}
            placeholder="Es. Tecnico"
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-0.5">Nome</label>
          <input
            type="text"
            value={signature.name || ''}
            onChange={e => update('name', e.target.value)}
            disabled={disabled}
            placeholder="Nome e cognome"
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          />
        </div>
      </div>

      <SignaturePad
        label="Firma"
        value={signature.dataUrl || ''}
        onChange={(dataUrl) => update('dataUrl', dataUrl)}
        disabled={disabled}
      />
    </div>
  )
}
