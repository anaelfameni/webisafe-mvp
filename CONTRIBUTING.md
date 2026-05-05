# Guide de Contribution Webisafe

Merci de votre intérêt pour contribuer à Webisafe ! Ce guide vous aidera à démarrer.

---

## 📋 Table des matières

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Processus de développement](#processus-de-développement)
- [Standards de code](#standards-de-code)
- [Tests](#tests)
- [Soumission de PR](#soumission-de-pr)

---

## 🤝 Code de conduite

En participant à ce projet, vous acceptez de respecter notre code de conduite :

- **Respectez** tous les contributeurs
- **Soyez constructif** dans vos commentaires et feedback
- **Acceptez** les critiques constructives
- **Focus** sur ce qui est le mieux pour la communauté
- **Montrez de l'empathie** envers les autres contributeurs

---

## 🚀 Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé
2. Utilisez le template de bug issue
3. Fournissez autant de détails que possible :
   - Steps to reproduce
   - Comportement attendu vs réel
   - Screenshots si applicable
   - Environnement (OS, navigateur, version)

### Suggérer une fonctionnalité

1. Vérifiez que la fonctionnalité n'a pas déjà été demandée
2. Utilisez le template de feature request
3. Expliquez pourquoi cette fonctionnalité serait utile
4. Décrivez le cas d'usage

### Contribuer du code

1. Fork le repository
2. Créez une branche pour votre feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 🛠️ Processus de développement

### Setup du projet

```bash
# Cloner le repository
git clone https://github.com/your-username/webisafe.git
cd webisafe

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local

# Configurer les variables d'environnement
# Voir README.md pour les détails

# Lancer le serveur de développement
npm run dev
```

### Workflow de branche

- `main` : Branche principale pour la production
- `develop` : Branche de développement
- `feature/*` : Nouvelles fonctionnalités
- `bugfix/*` : Corrections de bugs
- `hotfix/*` : Corrections urgentes en production

### Commit conventionnel

Utilisez des messages de commit clairs et descriptifs :

```
feat: add payment integration with Wave
fix: resolve authentication issue on mobile
docs: update README with new setup instructions
style: format code with Prettier
refactor: simplify scan logic in api/scan.js
test: add E2E tests for contact form
chore: update dependencies
```

---

## 📝 Standards de code

### JavaScript/React

- Utilisez des composants fonctionnels avec hooks
- Préférez les arrow functions
- Utilisez le destructuring
- Évitez les mutations directes de state
- Utilisez les composants accessibles (AccessibleForm.jsx)

```jsx
// ✅ Bon
const MyComponent = ({ title, onAction }) => {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => onAction(count)}>Action</button>
    </div>
  );
};

// ❌ Mauvais
class MyComponent extends React.Component {
  render() {
    return <div><h1>{this.props.title}</h1></div>;
  }
}
```

### Styling

- Utilisez TailwindCSS
- Préférez les classes utilitaires aux CSS personnalisés
- Utilisez les couleurs définies dans tailwind.config.js
- Respectez le thème sombre existant

```jsx
// ✅ Bon
<div className="bg-card-bg text-text-primary p-4 rounded-lg">

// ❌ Mauvais
<div style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>
```

### Validation

- Utilisez Zod pour la validation des formulaires
- Utilisez DOMPurify pour la sanitization HTML
- Validez toutes les entrées utilisateur

```javascript
import { contactSchema } from './utils/validationSchemas';
import { sanitizeText } from './utils/sanitize';

const validatedData = contactSchema.parse(formData);
const cleanMessage = sanitizeText(validatedData.message);
```

### Accessibilité

- Utilisez les composants AccessibleForm
- Ajoutez des labels ARA aux formulaires
- Assurez-vous du contraste des couleurs
- Supportez la navigation clavier

```jsx
import { FormField, AccessibleInput } from './components/AccessibleForm';

<FormField label="Email" required>
  <AccessibleInput type="email" placeholder="votre@email.com" />
</FormField>
```

---

## 🧪 Tests

### Tests E2E avec Playwright

Les tests E2E sont situés dans le dossier `e2e/`.

```bash
# Lancer tous les tests
npx playwright test

# Lancer en mode UI
npx playwright test --ui

# Lancer un fichier spécifique
npx playwright test e2e/home.spec.js
```

### Écrire un nouveau test

```javascript
import { test, expect } from '@playwright/test';

test.describe('Ma nouvelle fonctionnalité', () => {
  test('doit faire quelque chose', async ({ page }) => {
    await page.goto('/');
    // Votre test ici
  });
});
```

---

## 📤 Soumission de PR

### Checklist avant de soumettre

- [ ] Le code suit les standards de style
- [ ] Les tests passent (`npm run test:e2e`)
- [ ] Le build réussit (`npm run build`)
- [ ] Les commentaires JSDoc sont ajoutés pour les fonctions complexes
- [ ] La documentation est mise à jour si nécessaire
- [ ] Les variables d'environnement ne sont pas exposées
- [ ] L'accessibilité est prise en compte
- [ ] Le commit message suit les conventions

### Template de PR

```markdown
## Description
Brève description des changements

## Type de changement
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Tests
Description des tests ajoutés ou modifiés

## Checklist
- [ ] J'ai lu le guide de contribution
- [ ] Le code suit les standards
- [ ] Les tests passent
- [ ] La documentation est mise à jour
```

---

## 🎯 Priorités

Les contributions sont priorisées selon :

1. **Bug critiques** : Sécurité, data loss, crash
2. **Bugs majeurs** : Fonctionnalités cassées
3. **Nouvelles fonctionnalités** : Selon la roadmap
4. **Améliorations** : UX, performance, accessibilité
5. **Documentation** : Mise à jour des docs
6. **Refactoring** : Amélioration du code existant

---

## 📞 Contact

Pour toute question :
- Ouvrez une issue sur GitHub
- Contactez : support@webisafe.ci
- Discord : [lien vers serveur Discord]

---

Merci de contribuer à Webisafe ! 🎉
