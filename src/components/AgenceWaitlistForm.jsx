import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AgenceWaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');

    const { error } = await supabase
      .from('leads')
      .upsert(
        { email, source: 'agence_waitlist' },
        { onConflict: 'email' }
      );

    setStatus(error ? 'error' : 'success');
  };

  if (status === 'success') {
    return (
      <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center">
        <p className="text-success text-sm font-medium">
          ✅ Vous êtes sur la liste !
        </p>
        <p className="text-text-secondary/60 text-xs mt-1">
          Nous vous contacterons en priorité au lancement.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@agence.com"
        required
        className="w-full px-4 py-3 bg-card-bg border border-border-color rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3 px-6 bg-card-bg border border-primary/30 hover:border-primary hover:bg-primary/10 text-primary font-semibold rounded-xl text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading'
          ? 'Inscription...'
          : "Rejoindre la liste d'attente →"
        }
      </button>
      {status === 'error' && (
        <p className="text-danger text-xs text-center">
          Erreur. Réessayez ou écrivez-nous directement.
        </p>
      )}
    </form>
  );
}
