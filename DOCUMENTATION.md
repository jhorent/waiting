# Liste d'attente — Cabinet de Kinésithérapie

Application web locale (HTML/CSS/JS) de gestion de liste d'attente pour un cabinet de kinésithérapie.  
Aucun serveur requis — fonctionne directement dans le navigateur.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page |
| `style.css` | Styles personnalisés |
| `app.js` | Logique applicative |

**Dépendance externe :** Bootstrap 5.3.3 (chargé via CDN).

---

## Lancement

Ouvrir `index.html` dans un navigateur moderne (Chrome, Edge, Firefox).  
Aucune installation, aucun serveur web nécessaire.

---

## Fonctionnalités

### Formulaire d'ajout / modification

- Champs : Prénom, Nom, Téléphone, Email, Motif, Date d'entrée, Disponible dès le
- Champs obligatoires marqués `*` : Prénom, Nom, Téléphone, Motif, Date d'entrée
- Formatage automatique du téléphone au format `06 11 22 33 44` (espaces insérés à la frappe)
- Champs obligatoires vides mis en surbrillance rouge à la soumission
- Détection des doublons : blocage si même nom+prénom ou même numéro déjà présent
- **Mode édition** : cliquer sur une ligne quelconque remplit le formulaire avec ses données
  - Le bandeau passe en orange avec le titre `Modifier — Prénom Nom`
  - Bouton **Enregistrer** remplace **Ajouter**
  - Bouton **Annuler** permet de revenir au mode création sans sauvegarder
  - Fonctionne sur les deux onglets (liste d'attente et archives)

### Onglet — Liste d'attente

Tableau des patients en cours, trié par date d'entrée décroissante.

| Colonne | Description |
|---|---|
| Date d'entrée | Date d'inscription dans la liste |
| Nom / Prénom | Identité du patient |
| Téléphone | Numéro formaté |
| Email | Facultatif |
| Motif | Raison de la consultation |
| Disponible le | Date de disponibilité souhaitée (facultatif) |
| Statut | Dropdown modifiable (voir statuts) |

**Statuts disponibles :**

| Statut | Couleur |
|---|---|
| En attente | Gris |
| Message laissé | Orange |
| Refusé | Rouge |
| RDV confirmé | Vert |

Le bouton **Archiver** apparaît dans la colonne Statut dès que le statut n'est plus "En attente".  
Un clic déplace immédiatement le patient vers l'onglet Archives avec horodatage.

### Onglet — Archives

Tableau des patients archivés, trié par date d'archivage décroissante.

| Colonne | Description |
|---|---|
| Date d'entrée | Date d'inscription initiale |
| Nom / Prénom | Identité |
| Téléphone / Email | Coordonnées |
| Motif | Raison de la consultation |
| Disponible le | Date souhaitée |
| Statut final | Dropdown modifiable — "En attente" exclu |
| Archivé le | Date et heure de l'archivage |

Le statut peut être modifié dans les archives, mais ne peut jamais repasser à "En attente".

### Recherche

- Champ de recherche unique au-dessus des onglets
- Recherche simultanément dans les deux listes
- Champs couverts : Nom, Prénom, Téléphone, Email, Motif
- Insensible à la casse
- Bascule automatique vers l'onglet avec le plus de résultats
- Compteur `x/total` sur chaque badge d'onglet quand une recherche est active

### Export / Import

Boutons **⬇ Exporter** et **⬆ Importer** dans le header de la zone onglets.

**Export :** produit un fichier `kine_backup_YYYY-MM-DD.json` contenant les deux listes :

```json
{
  "exportDate": "2026-06-28T14:32:00.000Z",
  "patients": [ ... ],
  "archives": [ ... ]
}
```

**Import :** charge un fichier exporté précédemment, demande confirmation, remplace les données actuelles.  
Validation du format : le fichier doit contenir les champs `patients` et `archives`.

### Auto-export

Champ **Auto-export : X min** dans le header (valeur `0` = désactivé).

- La valeur est mémorisée dans le localStorage et restaurée à chaque ouverture
- Si des changements ont eu lieu depuis le dernier export, à chaque intervalle :
  1. Sauvegarde shadow dans le localStorage (clé `kine_shadow_backup`) — toujours fiable
  2. Téléchargement du fichier `kine_backup_YYYY-MM-DD.json`
  3. Notification toast verte en bas à droite avec l'heure
  4. Statut mis à jour : `Dernière sauvegarde : HH:MM`
- Si aucun changement depuis le dernier export, l'intervalle passe sans rien faire

> **Remarque navigateur :** les téléchargements automatiques (sans clic utilisateur) peuvent être bloqués par certains navigateurs en mode strict. La sauvegarde shadow dans le localStorage est toujours effectuée. En cas de blocage du téléchargement, utiliser le bouton **⬇ Exporter** manuellement.

---

## Stockage des données

Toutes les données sont stockées dans le **localStorage du navigateur**.

| Clé | Contenu |
|---|---|
| `kine_patients` | Liste d'attente active (tableau JSON) |
| `kine_patients_archives` | Archives (tableau JSON) |
| `kine_shadow_backup` | Dernière sauvegarde automatique complète |
| `kine_autoexport_minutes` | Intervalle d'auto-export configuré |

**Limites du localStorage :**
- Les données sont liées au navigateur et à l'ordinateur utilisé
- Un effacement du cache navigateur supprime toutes les données
- Inaccessible depuis un autre poste ou navigateur

**Recommandation :** exporter régulièrement (bouton ou auto-export) et stocker le fichier JSON sur un réseau partagé, un cloud (OneDrive, etc.) ou une clé USB. L'import permet une restauration complète sur n'importe quelle machine.

---

## Structure d'un patient (JSON)

```json
{
  "id": 1719571234567,
  "prenom": "Jean",
  "nom": "Dupont",
  "telephone": "06 12 34 56 78",
  "email": "jean@mail.com",
  "motif": "Lombalgie chronique",
  "dateEntree": "2026-06-28",
  "dateDisponibilite": "2026-07-15",
  "statut": "en_attente",
  "dateStatutChange": "2026-06-28T14:32:00.000Z"
}
```

Un patient archivé possède en plus le champ `dateArchivage` (ISO 8601).

---

## Valeurs de statut

| Valeur JSON | Libellé affiché |
|---|---|
| `en_attente` | En attente |
| `message_laisse` | Message laissé |
| `refuse` | Refusé |
| `rdv_confirme` | RDV confirmé |
