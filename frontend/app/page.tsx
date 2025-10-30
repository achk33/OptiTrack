'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { VideoModal } from '../components/video-modal'
import { 
  Shield, 
  BarChart3, 
  Settings, 
  Users, 
  CheckCircle, 
  Zap,
  ArrowRight,
  Database,
  Clock,
  TrendingUp,
  ShieldCheck,
  Globe,
  Smartphone,
  Play
} from 'lucide-react'

export default function Home() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const features = [
    {
      icon: Shield,
      title: "Sécurité & Conformité",
      description: "Surveillance continue de la conformité avec génération automatique de rapports d'audit.",
      color: "from-success-500 to-success-600"
    },
    {
      icon: BarChart3,
      title: "Analytiques Avancées",
      description: "Tableaux de bord intelligents avec KPI en temps réel et prédictions maintenance.",
      color: "from-brand-500 to-brand-600"
    },
    {
      icon: Settings,
      title: "Automatisation",
      description: "Workflows automatisés pour la maintenance préventive et gestion des interventions.",
      color: "from-slate-500 to-slate-600"
    },
    {
      icon: Database,
      title: "Gestion Centralisée",
      description: "Base de données unifiée pour tous vos actifs IT avec historique complet.",
      color: "from-purple-500 to-purple-600"
    }
  ]

  const stats = [
    { value: "99.9%", label: "Disponibilité", icon: Clock },
    { value: "50%", label: "Réduction Coûts", icon: TrendingUp },
    { value: "Sécurisé", label: "Plateforme", icon: ShieldCheck },
    { value: "24/7", label: "Support", icon: Globe }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoSrc="/videos/demo.mp4"
        title="OptiTrack - Démo de la Plateforme"
      />

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-slate-900 via-brand-800 to-slate-900 bg-clip-text text-transparent">
                  Maintenance
                </span>
                <br />
                <span className="bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent">
                  Intelligente
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Plateforme enterprise de gestion d'actifs IT avec maintenance prédictive, 
                analytiques avancées et conformité automatisée.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <Link href="/login">
                <Button size="xl" className="min-w-48">
                  Démarrer maintenant
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="xl" 
                className="min-w-48"
                onClick={() => setIsVideoModalOpen(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Découvrir la plateforme
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div key={index} className="text-center">
                    <div className="flex justify-center mb-2">
                      <Icon className="h-6 w-6 text-brand-600" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                    <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                  </div>
                )
              })}
            </motion.div>
          </div>
        </div>

        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-success-400/10 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Fonctionnalités Enterprise
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Une suite complète d'outils professionnels pour optimiser votre maintenance IT
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card variant="elevated" className="p-8 h-full hover:shadow-strong transition-all duration-300 group cursor-pointer">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-r ${feature.color} shadow-soft`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brand-700 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card variant="gradient" className="p-12 text-center">
              <div className="mb-6">
                <div className="inline-flex p-4 bg-brand-600 rounded-3xl shadow-medium mb-6">
                  <Smartphone className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Prêt à transformer votre maintenance IT ?
                </h2>
                <p className="text-xl text-slate-700 mb-8 max-w-2xl mx-auto">
                  Rejoignez les entreprises qui font confiance à OptiTrack pour optimiser leur infrastructure IT.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="xl" variant="default" className="min-w-48">
                    <Users className="mr-2 h-5 w-5" />
                    Commencer gratuitement
                  </Button>
                </Link>
                <Button 
                  size="xl" 
                  variant="outline" 
                  className="min-w-48"
                  onClick={() => setIsVideoModalOpen(true)}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Voir une démo
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-brand-400 mr-2" />
            <span className="text-xl font-bold">OptiTrack</span>
          </div>
          <p className="text-slate-400 mb-6">
            Plateforme enterprise de maintenance IT • Sécurité & Confidentialité garanties
          </p>
          <div className="flex justify-center space-x-6 text-sm text-slate-400">
            <span>© 2025 OptiTrack</span>
            <span>•</span>
            <span>Enterprise Edition</span>
            <span>•</span>
            <span>Tous droits réservés</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
