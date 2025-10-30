import nodemailer from 'nodemailer'
import { prisma } from '../db/client'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private isConfigured = false

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    }

    // Check if email is configured
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('⚠️  Email service not configured. Set SMTP_* environment variables.')
      this.isConfigured = false
      return
    }

    try {
      this.transporter = nodemailer.createTransport(emailConfig)
      this.isConfigured = true
      console.log('✅ Email service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error)
      this.isConfigured = false
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email not sent - service not configured:', options.subject)
      return false
    }

    try {
      await this.transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'OptiTrack'}" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      })
      console.log(`✉️  Email sent to ${options.to}: ${options.subject}`)
      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  // Password Reset Email
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${userName}</strong>,</p>
              
              <p>Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte OptiTrack.</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              </div>
              
              <div class="warning">
                <strong>⏰ Ce lien expire dans 1 heure</strong><br>
                Pour des raisons de sécurité, ce lien n'est valable que pendant 60 minutes.
              </div>
              
              <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe restera inchangé.</p>
              
              <p>Pour votre sécurité :</p>
              <ul>
                <li>Ne partagez jamais ce lien avec personne</li>
                <li>Choisissez un mot de passe fort (min. 8 caractères)</li>
                <li>Utilisez une combinaison de lettres, chiffres et symboles</li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #666;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>OptiTrack - Système de Gestion des Actifs</p>
              <p>&copy; ${new Date().getFullYear()} Tous droits réservés</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🔐 Réinitialisation de votre mot de passe OptiTrack',
      html,
    })
  }

  // Welcome Email
  async sendWelcomeEmail(email: string, userName: string, temporaryPassword: string): Promise<boolean> {
    const loginUrl = `${process.env.FRONTEND_URL}/login`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .credentials { background: white; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bienvenue sur OptiTrack !</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${userName}</strong>,</p>
              
              <p>Votre compte OptiTrack a été créé avec succès ! Vous pouvez maintenant accéder à la plateforme de gestion des actifs.</p>
              
              <div class="credentials">
                <h3 style="margin-top: 0;">🔑 Vos identifiants de connexion :</h3>
                <p><strong>Email :</strong> ${email}</p>
                <p><strong>Mot de passe temporaire :</strong> <code style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px;">${temporaryPassword}</code></p>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Se connecter maintenant</a>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <strong>⚠️ Important :</strong> Pour votre sécurité, nous vous recommandons de changer ce mot de passe temporaire dès votre première connexion.
              </div>
              
              <h3>📋 Prochaines étapes :</h3>
              <ol>
                <li>Connectez-vous avec vos identifiants</li>
                <li>Changez votre mot de passe temporaire</li>
                <li>Explorez votre tableau de bord</li>
                <li>Découvrez les fonctionnalités de la plateforme</li>
              </ol>
              
              <p>Si vous avez des questions ou besoin d'aide, n'hésitez pas à contacter notre équipe support.</p>
            </div>
            <div class="footer">
              <p>OptiTrack - Système de Gestion des Actifs</p>
              <p>&copy; ${new Date().getFullYear()} Tous droits réservés</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🎉 Bienvenue sur OptiTrack - Vos identifiants',
      html,
    })
  }

  // Import Results Email
  async sendImportResultsEmail(
    email: string,
    userName: string,
    fileName: string,
    totalRows: number,
    successCount: number,
    errorCount: number,
    errors: Array<{ row: number; error: string }>
  ): Promise<boolean> {
    const successRate = ((successCount / totalRows) * 100).toFixed(1)
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; padding: 15px; background: white; border-radius: 8px; flex: 1; margin: 0 5px; }
            .stat-value { font-size: 24px; font-weight: bold; }
            .success { color: #10b981; }
            .error { color: #ef4444; }
            .errors-list { background: white; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Résultats de l'import</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${userName}</strong>,</p>
              
              <p>Votre import du fichier <strong>${fileName}</strong> est terminé.</p>
              
              <div class="stats">
                <div class="stat">
                  <div class="stat-value">${totalRows}</div>
                  <div>Total lignes</div>
                </div>
                <div class="stat">
                  <div class="stat-value success">${successCount}</div>
                  <div>Réussies</div>
                </div>
                <div class="stat">
                  <div class="stat-value error">${errorCount}</div>
                  <div>Erreurs</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${successRate}%</div>
                  <div>Taux de succès</div>
                </div>
              </div>
              
              ${errorCount > 0 ? `
                <h3>❌ Erreurs détectées :</h3>
                <div class="errors-list">
                  ${errors.slice(0, 10).map(err => `
                    <div style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                      <strong>Ligne ${err.row}:</strong> ${err.error}
                    </div>
                  `).join('')}
                  ${errors.length > 10 ? `<p><em>... et ${errors.length - 10} autres erreurs</em></p>` : ''}
                </div>
              ` : '<div style="background: #d1fae5; padding: 15px; border-radius: 8px; color: #065f46;"><strong>✅ Import réussi sans erreur !</strong></div>'}
              
              <p style="margin-top: 30px;">Vous pouvez maintenant consulter vos actifs importés dans la plateforme.</p>
            </div>
            <div class="footer">
              <p>OptiTrack - Système de Gestion des Actifs</p>
              <p>&copy; ${new Date().getFullYear()} Tous droits réservés</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `📊 Import terminé : ${successCount}/${totalRows} réussies`,
      html,
    })
  }

  // Maintenance Reminder Email
  async sendMaintenanceReminderEmail(
    email: string,
    userName: string,
    assetName: string,
    maintenanceTitle: string,
    dueDate: Date
  ): Promise<boolean> {
    const formattedDate = dueDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Rappel de maintenance</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${userName}</strong>,</p>
              
              <div class="alert">
                <h3 style="margin-top: 0;">🔧 Maintenance planifiée à échéance</h3>
                <p><strong>Actif :</strong> ${assetName}</p>
                <p><strong>Tâche :</strong> ${maintenanceTitle}</p>
                <p><strong>Date d'échéance :</strong> ${formattedDate}</p>
              </div>
              
              <p>Une maintenance préventive est prévue prochainement sur cet actif. Veuillez planifier cette intervention pour maintenir les performances optimales de votre équipement.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/pmplans" class="button">Voir les plans de maintenance</a>
              </div>
              
              <p><strong>Pourquoi la maintenance préventive est importante :</strong></p>
              <ul>
                <li>Prévient les pannes coûteuses</li>
                <li>Prolonge la durée de vie des équipements</li>
                <li>Assure la sécurité des opérations</li>
                <li>Maintient la conformité réglementaire</li>
              </ul>
            </div>
            <div class="footer">
              <p>OptiTrack - Système de Gestion des Actifs</p>
              <p>&copy; ${new Date().getFullYear()} Tous droits réservés</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `⚠️ Rappel : Maintenance à échéance - ${assetName}`,
      html,
    })
  }
}

export const emailService = new EmailService()
