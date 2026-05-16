import { motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, ExternalLink, Tag } from 'lucide-react';
import { getArticleBySlug } from '../data/articles';

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function Article() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const article = getArticleBySlug(slug);

  if (!article) {
    return (
      <div className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Article introuvable</h1>
          <p className="text-text-secondary mb-8">
            Cet article n'existe pas ou a été déplacé. Consultez la liste complète des ressources.
          </p>
          <Link
            to="/ressources"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-hover transition-colors"
          >
            <ArrowLeft size={16} /> Voir toutes les ressources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <article className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/ressources')}
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Toutes les ressources
        </button>

        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Tag size={12} /> {article.category}
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">{article.title}</h1>
          <p className="text-lg text-text-secondary leading-relaxed mb-5">{article.excerpt}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary/70">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} /> Publié le {formatDate(article.publishedAt)}
            </span>
            {article.updatedAt && article.updatedAt !== article.publishedAt && (
              <span className="inline-flex items-center gap-1.5">
                · Mis à jour le {formatDate(article.updatedAt)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} /> {article.readingTime} de lecture
            </span>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {article.sections.map((section, index) => (
            <section key={index}>
              <h2 className="text-xl font-bold text-white mb-3">{section.heading}</h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                {section.paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </motion.div>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 p-6 rounded-2xl border border-border-color bg-card-bg"
        >
          <h2 className="text-base font-bold text-white mb-3">Sources & références</h2>
          <ul className="space-y-2">
            {article.sources.map((source, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-text-secondary">
                <ExternalLink size={14} className="mt-0.5 flex-shrink-0 text-primary" />
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="hover:text-primary transition-colors break-words"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-text-secondary/60">
            Toutes les sources sont publiques et accessibles. Aucune donnée propriétaire Webisafe n'est citée
            sans mention explicite.
          </p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 rounded-2xl p-8"
        >
          <h3 className="text-xl font-bold text-white mb-2">Auditez votre site en 60 secondes</h3>
          <p className="text-text-secondary mb-5 text-sm">
            Mesurez concrètement les points abordés dans cet article sur votre propre domaine.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-hover transition-colors"
          >
            Lancer un audit gratuit
          </Link>
        </motion.div>
      </article>
    </div>
  );
}
