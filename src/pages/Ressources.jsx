import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Clock } from 'lucide-react';
import { ARTICLES } from '../data/articles';

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function Ressources() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Retour à l'accueil
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            <BookOpen size={14} /> Ressources Webisafe
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Articles vérifiés sur la <span className="shiny-text">performance web</span> en Afrique de l'Ouest
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Analyses concrètes, sources publiques citées, et recommandations adaptées au marché ivoirien.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ARTICLES.map((article, index) => (
            <motion.article
              key={article.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="bg-card-bg border border-border-color rounded-2xl p-6 flex flex-col hover:border-primary/40 transition-colors"
            >
              <span className="inline-block self-start text-xs font-semibold px-3 py-1 rounded-full mb-3 bg-primary/10 text-primary">
                {article.category}
              </span>
              <h2 className="text-xl font-bold text-white mb-3 leading-snug">{article.title}</h2>
              <p className="text-text-secondary text-sm flex-grow mb-4 leading-relaxed">{article.excerpt}</p>
              <div className="flex items-center gap-3 text-xs text-text-secondary/70 mb-4">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(article.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {article.readingTime}
                </span>
              </div>
              <Link
                to={`/ressources/${article.slug}`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-sm rounded-full transition-colors"
              >
                Lire l'article <ArrowRight size={14} />
              </Link>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center text-text-secondary/60 text-xs"
        >
          Tous les articles citent leurs sources (Google, Mozilla, OWASP, ANSSI, Schema.org, Statcounter).
          Aucune donnée ni statistique inventée.
        </motion.div>
      </div>
    </div>
  );
}
