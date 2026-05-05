# Guide d'utilisation de Microsoft Clarity

Microsoft Clarity est déjà installé sur Webisafe. Ce guide explique comment l'exploiter au maximum pour améliorer l'UX et la conversion.

---

## 📊 Dashboard Clarity

Accédez à votre dashboard : https://clarity.microsoft.com/

---

## 🔍 Fonctionnalités clés

### 1. Heatmaps (Cartes thermiques)

Les heatmaps montrent où les utilisateurs cliquent, scrollent et passent du temps.

**Comment utiliser :**
- **Click heatmaps** : Identifiez les éléments les plus cliqués et les zones mortes
- **Scroll heatmaps** : Voyez jusqu'où les utilisateurs scrollent sur vos pages
- **Area heatmaps** : Comprenez les zones d'attention visuelle

**Actions recommandées pour Webisafe :**
1. Analysez la page d'accueil : Où cliquent les utilisateurs avant de scanner ?
2. Vérifiez la page de paiement : Les utilisateurs trouvent-ils le bouton de paiement ?
3. Étudiez le dashboard : Quels rapports sont les plus consultés ?

### 2. Session Recordings

Les enregistrements de sessions permettent de voir les actions utilisateur en temps réel.

**Comment utiliser :**
- Filtrer par : Page, durée, type d'appareil, pays
- Rechercher par : URL, événements personnalisés
- Regarder à vitesse x2 pour gagner du temps

**Actions recommandées pour Webisafe :**
1. Regardez les sessions où l'utilisateur abandonne le scan
2. Identifiez les sessions avec des erreurs (rage clicks)
3. Observez les utilisateurs sur mobile pour détecter des problèmes UX

### 3. Funnel Analysis

Créez des entonnoirs pour suivre les conversions.

**Exemple d'entonnoir pour Webisafe :**
```
Page d'accueil → Clic sur "Scanner" → Page d'analyse → Scan complété → Achat rapport
```

**Comment créer :**
1. Allez dans "Funnels" → "Create funnel"
2. Définissez les étapes avec les URLs correspondantes
3. Analysez où les utilisateurs abandonnent

### 4. Insights et Trends

Clarity génère automatiquement des insights sur les comportements anormaux.

**Types d'insights :**
- **Dead clicks** : Clicks sur des éléments non cliquables
- **Excessive scrolling** : Scroll excessif (indique un problème de navigation)
- **Quick backs** : Navigation rapide (indique une mauvaise expérience)
- **Rage clicks** : Clicks rapides et répétitifs (frustration)

**Actions recommandées :**
1. Corrigez les dead clicks en rendant les éléments cliquables
2. Améliorez la navigation si excessive scrolling est détecté
3. Simplifiez les pages avec beaucoup de quick backs

---

## 🎯 Configuration pour Webisafe

### Événements personnalisés

Ajoutez des événements personnalisés pour suivre les actions clés :

```javascript
// Dans vos composants React
import { clarity } from 'react-clarity';

// Suivre un scan initié
clarity.tag('scan_initiated');

// Suivre un scan complété
clarity.tag('scan_completed', { score: 75 });

// Suivre un paiement initié
clarity.tag('payment_initiated');

// Suivre un paiement complété
clarity.tag('payment_completed', { amount: 35000 });
```

### Filtres utiles

Créez des filtres pour segmenter vos utilisateurs :
- **Pays** : CI, SN, ML, etc.
- **Appareil** : Mobile vs Desktop
- **Navigateur** : Chrome, Firefox, Safari
- **Source** : Organic, Direct, Social

---

## 📈 KPIs à surveiller

### Pour la page d'accueil
- **Taux de clic** sur le bouton "Scanner"
- **Temps passé** sur la page
- **Scroll depth** : Pourcentage d'utilisateurs qui scrollent jusqu'au bas

### Pour la page d'analyse
- **Taux d'abandon** pendant le scan
- **Temps de scan moyen**
- **Rage clicks** sur les formulaires

### Pour la page de paiement
- **Taux de conversion** vers le paiement
- **Dead clicks** sur les instructions de paiement
- **Temps passé** avant abandon

### Pour le dashboard
- **Pages les plus visitées**
- **Actions les plus fréquentes**
- **Téléchargements de PDF**

---

## 🔧 Dépannage

### Les enregistrements ne s'affichent pas
- Vérifiez que le Project ID est correct dans `.env.local`
- Attendez 24-48h pour les premiers enregistrements
- Vérifiez que le script n'est pas bloqué par un adblocker

### Les heatmaps sont vides
- Vous avez besoin d'au moins 100 sessions pour des heatmaps significatives
- Vérifiez que les utilisateurs visitent bien les pages analysées

### Les insights ne s'affichent pas
- Les insights nécessitent un volume minimum de sessions (500+)
- Activez les insights dans les paramètres du projet

---

## 📚 Ressources

- Documentation officielle : https://learn.microsoft.com/en-us/clarity/
- Blog Clarity : https://clarity.microsoft.com/blog/
- Communauté : https://github.com/Microsoft/Clarity

---

## 🎓 Meilleures pratiques

1. **Analysez régulièrement** : Consultez Clarity au moins une fois par semaine
2. **Priorisez les problèmes** : Focus sur les dead clicks et rage clicks
3. **Testez les hypothèses** : Utilisez les recordings pour valider vos idées
4. **Partagez les insights** : Communiquez les découvertes avec l'équipe
5. **Suivez l'évolution** : Comparez les métriques avant/après les changements

---

**Dernière mise à jour** : 4 mai 2026
