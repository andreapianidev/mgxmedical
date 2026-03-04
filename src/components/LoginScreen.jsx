import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { DEMO_USERS } from '../data/demoData'
import { Shield, LogIn } from 'lucide-react'

const ROLE_EMOJI = { admin: '👑', technician: '🔧', secretary: '📋', client: '🏥' }
const ROLE_LABEL = { admin: 'Amministratore', technician: 'Tecnico', secretary: 'Segreteria', client: 'Cliente' }

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // simulate small delay
    await new Promise(r => setTimeout(r, 300))

    const result = login(email, password)
    if (result.success) {
      addToast('success', 'Accesso effettuato con successo')
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const handleQuickLogin = async (user) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 200))
    const result = login(user.email, user.password)
    if (result.success) {
      addToast('success', `Benvenuto, ${user.name}!`)
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1B4F72 0%, #148F77 50%, #1B4F72 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #1B4F72, #148F77)' }}>
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1B4F72] to-[#148F77] bg-clip-text text-transparent">
              MGX Medical
            </h1>
            <p className="text-xs text-gray-400 mt-1">Service Manager — ISO 13485 | MDR 2017/745</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@mgxmedical.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1B4F72, #148F77)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Accesso...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn size={16} />
                  Accedi
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">Accesso rapido Demo</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Quick Login Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => handleQuickLogin(user)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
              >
                <span className="text-lg">{ROLE_EMOJI[user.role]}</span>
                <div>
                  <p className="text-xs font-medium text-gray-700 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-gray-400">{ROLE_LABEL[user.role]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/50 mt-6">
          MGX Medical Service Manager v2.0 — Conforme ISO 13485:2016
        </p>
      </div>
    </div>
  )
}
