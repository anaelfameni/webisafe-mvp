import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, Send, CheckCircle, MapPin, Clock } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'support',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const text = await response.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        // La réponse n'est pas du JSON (ex: 404 HTML, erreur serveur)
        throw new Error(
          text.trim()
            ? `Erreur ${response.status} : ${text.slice(0, 120)}`
            : `Erreur serveur (${response.status}). Vérifiez que l'API est déployée.`
        );
      }

      if (!response.ok) throw new Error(data.error || 'Erreur inconnue');

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: 'support', message: '' });
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Contactez-<span className="gradient-text">nous</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Une question ? Un besoin spécifique ? Notre équipe vous répond rapidement.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* WhatsApp CTA + Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* WhatsApp */}
            <a
              href="https://wa.me/22505953356620?text=Bonjour, j'ai une question concernant Webisafe."
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-success/10 border border-success/30 rounded-2xl p-6 hover:bg-success/20 transition-all group"
            >
              <MessageCircle size={32} className="text-success mb-3" />
              <h3 className="text-white font-bold text-lg mb-1">WhatsApp</h3>
              <p className="text-text-secondary text-sm mb-3">
                Réponse la plus rapide généralement sous 2h
              </p>
              <span className="text-success font-medium text-sm group-hover:underline">
                Nous écrire sur WhatsApp →
              </span>
            </a>

            {/* Email */}
            <div className="bg-card-bg border border-border-color rounded-2xl p-6">
              <Mail size={24} className="text-primary mb-3" />
              <h3 className="text-white font-bold mb-1">Email</h3>
              <a href="mailto:webisafe@gmail.com" className="text-primary text-sm hover:underline">
                webisafe@gmail.com
              </a>
              <p className="text-text-secondary text-xs mt-2">
                Réponse sous 24h ouvrées
              </p>
            </div>

            {/* Info */}
            <div className="bg-card-bg border border-border-color rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">Localisation</p>
                  <p className="text-text-secondary text-sm">Abidjan, Côte d'Ivoire</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">Horaires</p>
                  <p className="text-text-secondary text-sm">Lun-Ven : 8h-18h (GMT)</p>
                  <p className="text-text-secondary text-sm">WhatsApp : réponse sous 2h</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <div className="bg-card-bg border border-border-color rounded-2xl p-6 lg:p-8">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <CheckCircle size={48} className="text-success mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Message envoyé !</h3>
                  <p className="text-text-secondary text-sm">
                    Nous vous répondrons dans les plus brefs délais.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-lg font-bold text-white mb-4">Envoyez-nous un message</h2>

                  <div>
                    <label className="text-text-secondary text-sm mb-1 block">Nom complet</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Votre nom"
                      className="w-full px-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm mb-1 block">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="votre@email.com"
                      className="w-full px-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm mb-1 block">Sujet</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white focus:outline-none focus:border-primary transition-colors text-sm"
                    >
                      <option value="support">Support technique</option>
                      <option value="whitelabel">White Label</option>
                      <option value="partenariat">Partenariat</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm mb-1 block">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Décrivez votre besoin..."
                      className="w-full px-4 py-3 bg-dark-navy border border-border-color rounded-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                    />
                  </div>

                  {error && (
                    <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 btn-glow"
                  >
                    {loading ? (
                      'Envoi en cours...'
                    ) : (
                      <>
                        <Send size={16} />
                        Envoyer le message
                      </>
                    )}
                  </button>

                  <p className="text-text-secondary/60 text-xs text-center">
                    Réponse sous 24h ouvrées · WhatsApp : réponse sous 2h
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
