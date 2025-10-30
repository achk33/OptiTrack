'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { RoleBadge } from '@/components/ui/badge'
import { User, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { api } from '@/components/api'

export default function ProfilePage() {
  const { user, token, hydrated } = useAuth()
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!hydrated) return
    
    if (user) {
      const nameParts = (user.name || '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      setProfileData({
        firstName,
        lastName,
        email: user.email || '',
      })
    }
  }, [user, hydrated])

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await api.put('/users/profile', profileData)
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' })
      
      // Update local user name
      if (window.localStorage) {
        const storedUser = window.localStorage.getItem('user')
        if (storedUser) {
          const userObj = JSON.parse(storedUser)
          userObj.name = `${profileData.firstName} ${profileData.lastName}`
          userObj.email = profileData.email
          window.localStorage.setItem('user', JSON.stringify(userObj))
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Échec de la mise à jour' })
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' })
      return
    }

    setLoading(true)

    try {
      await api.put('/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      
      setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès' })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Échec de la mise à jour' })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="p-8">Chargement...</div>
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
          <p className="text-slate-600 mt-2">Gérez vos informations personnelles et votre sécurité</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {(user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{user.name || 'Utilisateur'}</h2>
              <p className="text-slate-600">{user.email}</p>
              <RoleBadge role={user.role} className="mt-2" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="h-5 w-5" />
            <span>Informations</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="h-5 w-5" />
            <span>Sécurité</span>
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6">
          {activeTab === 'info' && (
            <form onSubmit={updateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
              </Button>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={updatePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full pl-10 pr-12 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-10 pr-12 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
