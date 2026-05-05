import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Target, Users, Share2, Wallet } from 'lucide-react';

export default function Partenaire() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(3);
  const [form, setForm] = useState({ name: '', wavePhone: '', email: '', channel: '', otherChannel: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const commissionPerSale = 17500;
  const calculateEarnings = (n) => (n * commissionPerSale).toLocaleString('fr-FR');

  const steps = [
    {
      icon: <Target size={22} />,
      step: '1',
      title: "Tu t'inscris",
      desc: 'Tu reçois ton lien unique en 2 minutes. Validation automatique.',
    },
    {
      icon: <Share2 size={22} />,
      step: '2',
      title: 'Tu partages',
      desc: 'À tes clients, ton réseau, sur WhatsApp, sur tes réseaux sociaux.',
    },
    {
      icon: <Wallet size={22} />,
      step: '3',
      title: 'Tu gagnes',
      desc: '17 500 FCFA virés sur Wave pour chaque vente confirmée. Sans limite.',
    },
  ];

  const profiles = [
    {
      title: 'Développeurs & Freelances',
      desc: "Vos clients ont déjà un site. Ils ont besoin d'un audit. Vous avez la confiance.",
    },
    {
      title: 'Community Managers',
      desc: 'Votre audience a des sites. Vous avez la confiance. Un lien = un revenu.',
    },
    {
      title: 'Agences digitales',
      desc: "Vos clients ont besoin d'audits. Vous avez l'accès. Ajoutez Webisafe à votre offre.",
    },
  ];

  const channels = [
    { label: 'À mes clients directs', value: 'clients' },
    { label: 'Sur mes réseaux sociaux', value: 'social' },
    { label: 'Dans mon réseau professionnel', value: 'network' },
    { label: 'Autre', value: 'other' },
  ];

  if (submitted && result) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-[#0C1627] border border-success/30 rounded-[32px] p-10 text-center"
        >
          <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-success" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Bienvenue dans le programme !</h1>
          <p className="text-white/60 text-sm mb-6">
            Votre lien affilié est prêt. Partagez-le dès maintenant.
          </p>

          <div className="bg-dark-navy border border-white/10 rounded-xl p-4 mb-4 text-left">
            <p className="text-white/40 text-xs mb-1">Votre lien unique</p>
            <code className="text-white text-sm font-mono break-all">{result.affiliateLink}</code>
            <button
              onClick={() => navigator.clipboard.writeText(result.affiliateLink)}
              className="mt-3 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg border border-primary/20 transition"
            >
              Copier le lien
            </button>
          </div>

          <a
            href={`/affiliate/dashboard?code=${result.refCode}`}
            className="block w-full py-3 bg-success hover:bg-success/90 text-white font-bold rounded-xl transition mb-3"
          >
            Voir mon dashboard →
          </a>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold rounded-xl transition"
          >
            Retour à l'accueil
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4">
      {/* ── Hero ── */}
      <div className="max-w-4xl mx-auto pt-28 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-full mb-8 text-sm text-success font-medium">
            <Target size={15} /> Programme Affiliés Webisafe
          </span>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-5 leading-tight">
            Recommandez Webisafe.<br />
            <span className="shiny-text">Gagnez jusqu'à 17 500 FCFA</span><br />
            <span className="text-white">par client.</span>
          </h1>
          <p className="text-white/50 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Chaque Audit Premium vendu via votre lien = <strong className="text-white">50% de commission</strong> = <strong className="text-white">17 500 FCFA</strong> dans votre poche.
            <br />Sans stock. Sans effort technique. Sans limite.
          </p>
          <button
            onClick={() => document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' })}
            className="relative overflow-hidden px-8 py-4 bg-success hover:bg-success/90 text-white font-bold rounded-full transition-all inline-flex items-center gap-2"
          >
            <span className="relative z-10 inline-flex items-center gap-2">
              Rejoindre le programme
              <ArrowRight size={18} />
            </span>
          </button>
        </motion.div>
      </div>

      {/* ── 3 étapes ── */}
      <div className="max-w-5xl mx-auto mb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0C1627] border border-border-color rounded-2xl p-6 flex flex-col gap-4"
            >
              <div className="w-11 h-11 bg-success/10 rounded-xl flex items-center justify-center text-success">
                {s.icon}
              </div>
              <div>
                <span className="text-success text-xs font-bold uppercase tracking-widest">Étape {s.step}</span>
                <h3 className="text-white font-bold text-lg mt-1">{s.title}</h3>
              </div>
              <p className="text-white/55 text-sm leading-relaxed flex-1">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Pour qui ── */}
      <div className="max-w-5xl mx-auto mb-20">
        <h2 className="text-center text-2xl font-bold text-white mb-10">Pour qui c'est fait</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {profiles.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0C1627] border border-border-color rounded-2xl p-6"
            >
              <Users size={20} className="text-primary mb-3" />
              <h3 className="text-white font-bold text-base mb-2">{p.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Calculateur ── */}
      <div className="max-w-2xl mx-auto mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[#0C1627] border border-border-color rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold text-white mb-2">Simulez vos revenus</h2>
          <p className="text-white/50 text-sm mb-6">Combien de personnes recommandez-vous par mois ?</p>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
            {[1, 3, 5, 10, 20].map((num) => (
              <button
                key={num}
                onClick={() => setSelected(num)}
                className={`py-2.5 px-2 rounded-xl text-sm font-semibold transition-all ${
                  selected === num
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="bg-dark-navy rounded-xl p-5 text-center border border-white/5">
            <p className="text-white/40 text-xs mb-1">Revenus mensuels estimés</p>
            <p className="text-3xl font-black text-success">{calculateEarnings(selected)} FCFA</p>
            <p className="text-white/40 text-xs mt-2">
              Soit {(selected * commissionPerSale * 12).toLocaleString('fr-FR')} FCFA/an
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Formulaire ── */}
      <div id="form" className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[#0C1627] border border-border-color rounded-[28px] p-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Rejoindre le programme</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Nom complet</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Kouassi Jean"
                className="w-full px-4 py-3 bg-[#060C1A] border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="votre@email.com"
                className="w-full px-4 py-3 bg-[#060C1A] border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Numéro Wave (pour vos commissions)</label>
              <input
                type="tel"
                value={form.wavePhone}
                onChange={(e) => setForm((p) => ({ ...p, wavePhone: e.target.value }))}
                placeholder="+225 07 00 00 00 00"
                className="w-full px-4 py-3 bg-[#060C1A] border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Comment comptez-vous recommander ?</label>
              <div className="space-y-2">
                {channels.map((ch) => (
                  <label key={ch.value} className="flex items-center gap-3 p-3 bg-[#060C1A] border border-white/10 rounded-xl cursor-pointer hover:border-primary/30 transition">
                    <input
                      type="radio"
                      name="channel"
                      value={ch.value}
                      checked={form.channel === ch.value}
                      onChange={() => setForm((p) => ({ ...p, channel: ch.value }))}
                      className="accent-primary"
                    />
                    <span className="text-white/70 text-sm">{ch.label}</span>
                  </label>
                ))}
              </div>

              {form.channel === 'other' && (
                <input
                  type="text"
                  value={form.otherChannel}
                  onChange={(e) => setForm((p) => ({ ...p, otherChannel: e.target.value }))}
                  placeholder="Précisez comment vous comptez recommander..."
                  className="w-full mt-2 px-4 py-3 bg-[#060C1A] border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-primary transition"
                />
              )}
            </div>

            {error && (
              <p className="text-danger text-sm mt-2">{error}</p>
            )}
            <button
              onClick={async () => {
                if (!form.name || !form.email || !form.wavePhone) return;
                setLoading(true);
                setError(null);
                try {
                  const res = await fetch('/api/affiliate-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: form.name, email: form.email, phone: form.wavePhone, channel: form.channel, otherChannel: form.otherChannel })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Erreur inscription');
                  setResult(data);
                  setSubmitted(true);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!form.name || !form.email || !form.wavePhone || loading}
              className="relative overflow-hidden w-full mt-4 py-3.5 bg-success hover:bg-success/90 text-white font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                {loading ? 'Inscription...' : 'Rejoindre le programme'}
                <ArrowRight size={16} />
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
