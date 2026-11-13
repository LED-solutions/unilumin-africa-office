/* Unilumin Africa Office — définitions partagées (serveur + navigateur).
   Aucune donnée client ici : uniquement la structure, les états et les règles. */

export const APP_VERSION = '1.1.0';

export const FAMILIES = {
  'À faire':        { fr: 'À faire / pas commencé', en: 'To do / not started', bg: '#F1F5F9', fg: '#475569' },
  'En préparation': { fr: 'En préparation', en: 'In preparation', bg: '#FEF9C3', fg: '#854D0E' },
  'En attente':     { fr: 'En attente client / validation', en: 'Waiting for client / approval', bg: '#FFEDD5', fg: '#9A3412' },
  'En cours':       { fr: 'En cours / confirmé', en: 'In progress / confirmed', bg: '#DBEAFE', fg: '#1E40AF' },
  'Terminé':        { fr: 'Terminé / gagné', en: 'Done / won', bg: '#DCFCE7', fg: '#166534' },
  'Perdu':          { fr: 'Perdu / annulé', en: 'Lost / cancelled', bg: '#FEE2E2', fg: '#991B1B' }
};

/* États par liste → famille (couleur). Même ordre que dans le Google Sheet. */
export const STATES = {
  com: [['À confirmer','À faire'],['En pause','À faire'],['Repérage / étude','En préparation'],
        ['Dossier tech. en préparation','En préparation'],['Dossier tech. envoyé','En attente'],
        ['Devis en préparation','En préparation'],['Devis en validation interne','En préparation'],
        ['Offre envoyée – attente client','En attente'],['En négociation','En attente'],['BC reçu','En cours'],
        ['En production','En cours'],['Test atelier','En cours'],['Expédié','En cours'],['En installation','En cours'],
        ['En cours','En cours'],['Livré / Installé','Terminé'],['Clôturé','Terminé'],['Perdu / Rejeté','Perdu'],['Annulé','Perdu']],
  ev:  [['À confirmer','À faire'],['Dossier tech. en préparation','En préparation'],['Dossier tech. envoyé','En attente'],
        ['Devis en préparation','En préparation'],['Devis envoyé','En attente'],['En attente client','En attente'],
        ['Confirmé','En cours'],['En cours','En cours'],['Terminé','Terminé'],['Annulé','Perdu']],
  ao:  [['À surveiller / non lancé','À faire'],['À l\'étude','En préparation'],['Dossier en préparation','En préparation'],
        ['Déposé – attente résultat','En attente'],['Remporté','Terminé'],['Livré / Clôturé','Terminé'],['Perdu','Perdu'],['Abandonné','Perdu']],
  sav: [['Planifié','À faire'],['À réparer','À faire'],['Nouveau / à diagnostiquer','À faire'],['Diagnostiqué','En préparation'],
        ['Devis envoyé – attente client','En attente'],['En attente pièces','En attente'],['En cours','En cours'],
        ['En réparation','En cours'],['En test','En cours'],['Terminé','Terminé'],['Rendu au client','Terminé'],['Irréparable','Perdu']],
  hq:  [['Nouveau','À faire'],['Contacté','En préparation'],['En discussion','En attente'],['Accepté – transféré','Terminé'],['Refusé / sans suite','Perdu']]
};

export const VERY_HIGH = '🔥 Très haute';
export const STATIC_LISTS = {
  prio: [VERY_HIGH, 'Haute', 'Moyenne', 'Basse'],
  on: ['Oui', 'Non'],
  io: ['Indoor', 'Outdoor', 'Indoor + Outdoor'],
  savt: ['Intervention sur site', 'Assistance en ligne', 'Réparation atelier', 'Réclamation', 'Stock interne'],
  situ: ['Confirmé', 'En attente', 'Pas nécessaire'],
  cat: ['Écran LED', 'Totem / kiosque', 'Présentoir / desk', 'TV / affichage', 'Autre'],
  unit: ['Cabinet', 'Pièce']
};
/* Listes de suggestions : modifiables par l'équipe (on peut aussi taper autre chose) */
export const DEFAULT_SUGG = {
  lieux: ['Online'],
  pays: ['Algérie','Libye','Maroc','Mauritanie','Égypte','Bénin','Côte d\'Ivoire','Sénégal','Mali','Burkina Faso','Niger','Togo',
         'Cameroun','Gabon','Congo','RD Congo','Guinée','Tchad','France','Arabie saoudite','Émirats arabes unis','Qatar'],
  pitch: ['P1.25','P1.5','P1.86','P2','P2.5','P2.6','P2.9','P3.9','P4','P4.8','P5','P6','P8','P10'],
  next: ['Envoyer le devis','Relancer le client','Préparer la simulation','Repérage sur site','Réunion avec le client',
         'Validation interne','Attente du bon de commande','Commander le matériel','Test atelier',
         'Livraison / installation','Facturation','Confirmer les sous-traitants','Préparer le dossier AO'],
  heures: (() => { const h = []; for (let i = 6; i <= 23; i++) { h.push(i + 'h'); h.push(i + 'h30'); } return h; })(),
  st: []
};
export const ONLINE = 'Online';
export const SAV_ONLINE_TYPE = 'Assistance en ligne';

/* Les 6 types de dossiers */
export const KINDS = {
  proj: { icon: '📺', fr: 'Projets', en: 'Projects', sfr: 'Projet', sen: 'Project', color: '#2563EB', states: 'com', dateKey: 'liv', devis: true,
          compact: ['name', 'resp', 'prio', 'etat', 'devis', 'ddevis', 'liv', 'next'] },
  ev:   { icon: '🎤', fr: 'Events', en: 'Events', sfr: 'Event', sen: 'Event', color: '#0F9D76', states: 'ev', dateKey: 'deb', byDate: true,
          compact: ['name', 'lieu', 'resp', 'prio', 'etat', 'deb', 'fin', 'mont', 'dem', 'stock', 'next'] },
  ao:   { icon: '📄', fr: 'Appels d\'offres', en: 'Tenders', sfr: 'Appel d\'offres', sen: 'Tender', color: '#D97706', states: 'ao', dateKey: 'depot',
          compact: ['name', 'resp', 'prio', 'etat', 'depot', 'jr', 'next'] },
  ex:   { icon: '✈️', fr: 'Export', en: 'Export', sfr: 'Export', sen: 'Export', color: '#7C3AED', states: 'com', dateKey: 'liv', devis: true,
          compact: ['name', 'pays', 'resp', 'prio', 'etat', 'devis', 'liv', 'next'] },
  sav:  { icon: '🔧', fr: 'SAV', en: 'After-sales', sfr: 'SAV', sen: 'After-sales', color: '#DC2626', states: 'sav', dateKey: 'ech',
          compact: ['name', 'type', 'lieu', 'resp', 'prio', 'etat', 'ech', 'next'] },
  hq:   { icon: '📞', fr: 'Contacts siège', en: 'HQ contacts', sfr: 'Contact siège', sen: 'HQ contact', color: '#B91C1C', states: 'hq', dateKey: 'recu',
          compact: ['name', 'contact', 'pays', 'resp', 'etat', 'recu', 'transfert', 'next'] }
};
export const KIND_ORDER = ['proj', 'ev', 'ao', 'ex', 'sav', 'hq'];

/* Champs (repris du Google Sheet, même ordre et mêmes groupes) */
export const FIELDS = {"proj": [{"k": "name", "fr": "Client / Projet", "en": "Client / Project", "t": "text", "g": ["Dossier", "File"], "req": true}, {"k": "desc", "fr": "Description", "en": "Description", "t": "long", "g": ["Dossier", "File"]}, {"k": "resp", "fr": "Responsable", "en": "Owner", "t": "list", "g": ["Dossier", "File"], "list": "team"}, {"k": "avec", "fr": "Avec", "en": "With", "t": "multi", "g": ["Dossier", "File"], "list": "team"}, {"k": "prio", "fr": "Priorité", "en": "Priority", "t": "list", "g": ["Dossier", "File"], "list": "prio"}, {"k": "etat", "fr": "État", "en": "Status", "t": "list", "g": ["Dossier", "File"], "list": "com"}, {"k": "l", "fr": "Largeur (m)", "en": "Width (m)", "t": "num", "g": ["Écran LED demandé", "Requested LED screen"]}, {"k": "h", "fr": "Hauteur (m)", "en": "Height (m)", "t": "num", "g": ["Écran LED demandé", "Requested LED screen"]}, {"k": "surf", "fr": "Surface m² (auto)", "en": "Area m² (auto)", "t": "text", "g": ["Écran LED demandé", "Requested LED screen"], "auto": true}, {"k": "io", "fr": "Indoor / Outdoor", "en": "Indoor / Outdoor", "t": "list", "g": ["Écran LED demandé", "Requested LED screen"], "list": "io"}, {"k": "first", "fr": "1er contact", "en": "First contact", "t": "date", "g": ["Offre", "Offer"]}, {"k": "devis", "fr": "Devis", "en": "Quote", "t": "list", "g": ["Offre", "Offer"], "list": "on"}, {"k": "ddevis", "fr": "Envoi devis", "en": "Quote sent", "t": "date", "g": ["Offre", "Offer"]}, {"k": "bc", "fr": "BC", "en": "PO", "t": "list", "g": ["Offre", "Offer"], "list": "on"}, {"k": "dbc", "fr": "Date BC", "en": "PO date", "t": "date", "g": ["Offre", "Offer"]}, {"k": "rep", "fr": "Repérage (mesures)", "en": "Site survey (measures)", "t": "date", "g": ["Planning", "Schedule"]}, {"k": "constr", "fr": "Construction (début)", "en": "Build start", "t": "date", "g": ["Planning", "Schedule"]}, {"k": "test", "fr": "Test atelier", "en": "Workshop test", "t": "date", "g": ["Planning", "Schedule"]}, {"k": "liv", "fr": "Installation / livraison", "en": "Installation / delivery", "t": "date", "g": ["Planning", "Schedule"]}, {"k": "next", "fr": "Prochaine action", "en": "Next action", "t": "long", "g": ["Suivi", "Follow-up"], "sugg": "next"}, {"k": "com", "fr": "Commentaires", "en": "Comments", "t": "long", "g": ["Suivi", "Follow-up"]}, {"k": "contact", "fr": "Contact client", "en": "Client contact", "t": "text", "g": ["Suivi", "Follow-up"]}, {"k": "tel", "fr": "Téléphone", "en": "Phone", "t": "tel", "g": ["Suivi", "Follow-up"]}, {"k": "majd", "fr": "MAJ le", "en": "Updated on", "t": "date", "g": ["Suivi", "Follow-up"], "auto": true}, {"k": "majp", "fr": "MAJ par", "en": "Updated by", "t": "list", "g": ["Suivi", "Follow-up"], "list": "team", "auto": true}], "ev": [{"k": "name", "fr": "Client / Événement", "en": "Client / Event", "t": "text", "g": ["Événement", "Event"], "req": true}, {"k": "lieu", "fr": "Lieu", "en": "Venue", "t": "text", "g": ["Événement", "Event"], "sugg": "lieux"}, {"k": "resp", "fr": "Responsable", "en": "Owner", "t": "list", "g": ["Événement", "Event"], "list": "team"}, {"k": "eq", "fr": "Équipe terrain", "en": "Field team", "t": "multi", "g": ["Événement", "Event"], "list": "team"}, {"k": "prio", "fr": "Priorité", "en": "Priority", "t": "list", "g": ["Événement", "Event"], "list": "prio"}, {"k": "etat", "fr": "État", "en": "Status", "t": "list", "g": ["Événement", "Event"], "list": "ev"}, {"k": "deb", "fr": "Début event", "en": "Event start", "t": "date", "g": ["Dates", "Dates"]}, {"k": "fin", "fr": "Fin event (auto = début)", "en": "Event end (auto = start)", "t": "date", "g": ["Dates", "Dates"]}, {"k": "mont", "fr": "Montage (auto = J-1)", "en": "Set-up (auto = D-1)", "t": "date", "g": ["Dates", "Dates"]}, {"k": "hm", "fr": "Heure montage", "en": "Set-up time", "t": "time", "g": ["Dates", "Dates"], "sugg": "heures"}, {"k": "dem", "fr": "Démontage (auto = fin)", "en": "Dismantle (auto = end)", "t": "date", "g": ["Dates", "Dates"]}, {"k": "hd", "fr": "Heure démontage", "en": "Dismantle time", "t": "time", "g": ["Dates", "Dates"], "sugg": "heures"}, {"k": "rep", "fr": "Repérage", "en": "Site survey", "t": "date", "g": ["Dates", "Dates"]}, {"k": "l1", "fr": "Écran 1 largeur (m)", "en": "Screen 1 width (m)", "t": "num", "g": ["Écran LED demandé", "Requested LED screen"]}, {"k": "h1", "fr": "Écran 1 hauteur (m)", "en": "Screen 1 height (m)", "t": "num", "g": ["Écran LED demandé", "Requested LED screen"]}, {"k": "l2", "fr": "Écran 2 largeur (m)", "en": "Screen 2 width (m)", "t": "num", "g": ["Écran LED demandé", "Requested LED screen"]}, {"k": "h2", "fr": "Écran 2 hauteur (m)", "en": "Screen 2 height (m)", "t": "num", "g": ["Écran LED demandé", "Requested LED screen"]}, {"k": "surf", "fr": "Surface totale m² (auto)", "en": "Total area m² (auto)", "t": "text", "g": ["Écran LED demandé", "Requested LED screen"], "auto": true}, {"k": "io", "fr": "Indoor / Outdoor", "en": "Indoor / Outdoor", "t": "list", "g": ["Écran LED demandé", "Requested LED screen"], "list": "io"}, {"k": "m1", "fr": "Article 1", "en": "Item 1", "t": "list", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"], "list": "stockitems"}, {"k": "q1", "fr": "Qté 1 (auto écran 1)", "en": "Qty 1 (auto screen 1)", "t": "num", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"]}, {"k": "m2", "fr": "Article 2", "en": "Item 2", "t": "list", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"], "list": "stockitems"}, {"k": "q2", "fr": "Qté 2 (auto écran 2)", "en": "Qty 2 (auto screen 2)", "t": "num", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"]}, {"k": "m3", "fr": "Article 3", "en": "Item 3", "t": "list", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"], "list": "stockitems"}, {"k": "q3", "fr": "Qté 3", "en": "Qty 3", "t": "num", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"]}, {"k": "m4", "fr": "Article 4", "en": "Item 4", "t": "list", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"], "list": "stockitems"}, {"k": "q4", "fr": "Qté 4", "en": "Qty 4", "t": "num", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"]}, {"k": "stock", "fr": "Statut stock", "en": "Stock status", "t": "long", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"], "auto": true}, {"k": "autre", "fr": "Autre matériel / détails", "en": "Other equipment / details", "t": "long", "g": ["Matériel de notre stock (en cabinets / pièces)", "Equipment from our stock (cabinets / pieces)"]}, {"k": "st", "fr": "Sous-traitants", "en": "Subcontractors", "t": "multi", "g": ["Sous-traitance", "Subcontracting"], "list": "st"}, {"k": "sts", "fr": "Situation", "en": "Status", "t": "list", "g": ["Sous-traitance", "Subcontracting"], "list": "situ"}, {"k": "next", "fr": "Prochaine action", "en": "Next action", "t": "long", "g": ["Suivi", "Follow-up"], "sugg": "next"}, {"k": "com", "fr": "Commentaires", "en": "Comments", "t": "long", "g": ["Suivi", "Follow-up"]}, {"k": "contact", "fr": "Contact client", "en": "Client contact", "t": "text", "g": ["Suivi", "Follow-up"]}, {"k": "tel", "fr": "Téléphone", "en": "Phone", "t": "tel", "g": ["Suivi", "Follow-up"]}, {"k": "last", "fr": "Dernier contact", "en": "Last contact", "t": "date", "g": ["Suivi", "Follow-up"]}, {"k": "majd", "fr": "MAJ le", "en": "Updated on", "t": "date", "g": ["Suivi", "Follow-up"], "auto": true}, {"k": "majp", "fr": "MAJ par", "en": "Updated by", "t": "list", "g": ["Suivi", "Follow-up"], "list": "team", "auto": true}], "ao": [{"k": "name", "fr": "Organisme", "en": "Organisation", "t": "text", "g": ["Dossier", "File"], "req": true}, {"k": "obj", "fr": "Objet / matériel", "en": "Scope / equipment", "t": "long", "g": ["Dossier", "File"]}, {"k": "resp", "fr": "Responsable", "en": "Owner", "t": "list", "g": ["Dossier", "File"], "list": "team"}, {"k": "avec", "fr": "Avec", "en": "With", "t": "multi", "g": ["Dossier", "File"], "list": "team"}, {"k": "prio", "fr": "Priorité", "en": "Priority", "t": "list", "g": ["Dossier", "File"], "list": "prio"}, {"k": "etat", "fr": "État", "en": "Status", "t": "list", "g": ["Dossier", "File"], "list": "ao"}, {"k": "sortie", "fr": "Sortie de l'AO", "en": "Published", "t": "date", "g": ["Échéances", "Deadlines"]}, {"k": "depot", "fr": "Date limite de dépôt", "en": "Submission deadline", "t": "date", "g": ["Échéances", "Deadlines"]}, {"k": "jr", "fr": "Jours restants", "en": "Days left", "t": "text", "g": ["Échéances", "Deadlines"], "auto": true}, {"k": "rep", "fr": "Repérage", "en": "Site survey", "t": "date", "g": ["Échéances", "Deadlines"]}, {"k": "liv", "fr": "Livraison", "en": "Delivery", "t": "date", "g": ["Échéances", "Deadlines"]}, {"k": "st", "fr": "Sous-traitants par lot", "en": "Subcontractors per lot", "t": "multi", "g": ["Sous-traitance", "Subcontracting"], "list": "st"}, {"k": "stn", "fr": "Lots non confirmés", "en": "Unconfirmed lots", "t": "long", "g": ["Sous-traitance", "Subcontracting"]}, {"k": "next", "fr": "Prochaine action", "en": "Next action", "t": "long", "g": ["Suivi", "Follow-up"], "sugg": "next"}, {"k": "com", "fr": "Commentaires", "en": "Comments", "t": "long", "g": ["Suivi", "Follow-up"]}, {"k": "contact", "fr": "Contact client", "en": "Client contact", "t": "text", "g": ["Suivi", "Follow-up"]}, {"k": "tel", "fr": "Téléphone", "en": "Phone", "t": "tel", "g": ["Suivi", "Follow-up"]}, {"k": "last", "fr": "Dernier contact", "en": "Last contact", "t": "date", "g": ["Suivi", "Follow-up"]}, {"k": "majd", "fr": "MAJ le", "en": "Updated on", "t": "date", "g": ["Suivi", "Follow-up"], "auto": true}, {"k": "majp", "fr": "MAJ par", "en": "Updated by", "t": "list", "g": ["Suivi", "Follow-up"], "list": "team", "auto": true}], "ex": [{"k": "name", "fr": "Projet", "en": "Project", "t": "text", "g": ["Dossier", "File"], "req": true}, {"k": "pays", "fr": "Pays", "en": "Country", "t": "text", "g": ["Dossier", "File"], "sugg": "pays"}, {"k": "desc", "fr": "Description", "en": "Description", "t": "long", "g": ["Dossier", "File"]}, {"k": "resp", "fr": "Responsable", "en": "Owner", "t": "list", "g": ["Dossier", "File"], "list": "team"}, {"k": "avec", "fr": "Avec", "en": "With", "t": "multi", "g": ["Dossier", "File"], "list": "team"}, {"k": "prio", "fr": "Priorité", "en": "Priority", "t": "list", "g": ["Dossier", "File"], "list": "prio"}, {"k": "etat", "fr": "État", "en": "Status", "t": "list", "g": ["Dossier", "File"], "list": "com"}, {"k": "first", "fr": "1er contact", "en": "First contact", "t": "date", "g": ["Offre", "Offer"]}, {"k": "devis", "fr": "Devis", "en": "Quote", "t": "list", "g": ["Offre", "Offer"], "list": "on"}, {"k": "ddevis", "fr": "Envoi devis", "en": "Quote sent", "t": "date", "g": ["Offre", "Offer"]}, {"k": "sign", "fr": "Signature contrat", "en": "Contract signed", "t": "date", "g": ["Offre", "Offer"]}, {"k": "bc", "fr": "BC", "en": "PO", "t": "list", "g": ["Offre", "Offer"], "list": "on"}, {"k": "dbc", "fr": "Date BC", "en": "PO date", "t": "date", "g": ["Offre", "Offer"]}, {"k": "exp", "fr": "Expédition", "en": "Shipping", "t": "date", "g": ["Logistique", "Logistics"]}, {"k": "liv", "fr": "Livraison / installation", "en": "Delivery / install", "t": "date", "g": ["Logistique", "Logistics"]}, {"k": "next", "fr": "Prochaine action", "en": "Next action", "t": "long", "g": ["Suivi", "Follow-up"], "sugg": "next"}, {"k": "com", "fr": "Commentaires", "en": "Comments", "t": "long", "g": ["Suivi", "Follow-up"]}, {"k": "contact", "fr": "Contact client", "en": "Client contact", "t": "text", "g": ["Suivi", "Follow-up"]}, {"k": "tel", "fr": "Téléphone", "en": "Phone", "t": "tel", "g": ["Suivi", "Follow-up"]}, {"k": "majd", "fr": "MAJ le", "en": "Updated on", "t": "date", "g": ["Suivi", "Follow-up"], "auto": true}, {"k": "majp", "fr": "MAJ par", "en": "Updated by", "t": "list", "g": ["Suivi", "Follow-up"], "list": "team", "auto": true}], "sav": [{"k": "name", "fr": "Client", "en": "Client", "t": "text", "g": ["Dossier", "File"], "req": true}, {"k": "type", "fr": "Type", "en": "Type", "t": "list", "g": ["Dossier", "File"], "list": "savt"}, {"k": "lieu", "fr": "Lieu", "en": "Place", "t": "text", "g": ["Dossier", "File"], "sugg": "lieux"}, {"k": "resp", "fr": "Technicien / responsable", "en": "Technician / owner", "t": "list", "g": ["Dossier", "File"], "list": "team"}, {"k": "avec", "fr": "Avec", "en": "With", "t": "multi", "g": ["Dossier", "File"], "list": "team"}, {"k": "prio", "fr": "Priorité", "en": "Priority", "t": "list", "g": ["Dossier", "File"], "list": "prio"}, {"k": "etat", "fr": "État", "en": "Status", "t": "list", "g": ["Dossier", "File"], "list": "sav"}, {"k": "recu", "fr": "Réception / signalement", "en": "Received / reported", "t": "date", "g": ["Dates", "Dates"]}, {"k": "ech", "fr": "Échéance", "en": "Due date", "t": "date", "g": ["Dates", "Dates"]}, {"k": "ecran", "fr": "Écran / module", "en": "Screen / module", "t": "text", "g": ["Matériel", "Equipment"]}, {"k": "pitch", "fr": "Pitch", "en": "Pitch", "t": "text", "g": ["Matériel", "Equipment"], "sugg": "pitch"}, {"k": "art", "fr": "Article du stock (si stock interne)", "en": "Stock item (if internal)", "t": "list", "g": ["Matériel", "Equipment"], "list": "stockitems"}, {"k": "qte", "fr": "Qté cabinets", "en": "Cabinets", "t": "num", "g": ["Matériel", "Equipment"]}, {"k": "pd", "fr": "Pixels défectueux", "en": "Dead pixels", "t": "num", "g": ["Matériel", "Equipment"]}, {"k": "pr", "fr": "Pixels remplacés", "en": "Pixels replaced", "t": "num", "g": ["Matériel", "Equipment"]}, {"k": "test", "fr": "Résultat du test", "en": "Test result", "t": "long", "g": ["Matériel", "Equipment"]}, {"k": "next", "fr": "Prochaine action", "en": "Next action", "t": "long", "g": ["Suivi", "Follow-up"], "sugg": "next"}, {"k": "rem", "fr": "Remarques", "en": "Notes", "t": "long", "g": ["Suivi", "Follow-up"]}, {"k": "contact", "fr": "Contact client", "en": "Client contact", "t": "text", "g": ["Suivi", "Follow-up"]}, {"k": "tel", "fr": "Téléphone", "en": "Phone", "t": "tel", "g": ["Suivi", "Follow-up"]}, {"k": "majd", "fr": "MAJ le", "en": "Updated on", "t": "date", "g": ["Suivi", "Follow-up"], "auto": true}, {"k": "majp", "fr": "MAJ par", "en": "Updated by", "t": "list", "g": ["Suivi", "Follow-up"], "list": "team", "auto": true}]};

FIELDS.hq = [
  { k: 'name', fr: 'Client / société', en: 'Client / company', t: 'text', g: ['Contact', 'Contact'], req: true },
  { k: 'contact', fr: 'Personne à contacter', en: 'Contact person', t: 'text', g: ['Contact', 'Contact'] },
  { k: 'tel', fr: 'Téléphone', en: 'Phone', t: 'tel', g: ['Contact', 'Contact'] },
  { k: 'email', fr: 'E-mail', en: 'E-mail', t: 'text', g: ['Contact', 'Contact'] },
  { k: 'pays', fr: 'Pays / ville', en: 'Country / city', t: 'text', g: ['Contact', 'Contact'], sugg: 'pays' },
  { k: 'demande', fr: 'Ce qu\'il veut', en: 'Request', t: 'long', g: ['Demande', 'Request'] },
  { k: 'besoin', fr: 'Type de besoin', en: 'Need', t: 'list', list: 'hqdest', g: ['Demande', 'Request'] },
  { k: 'recu', fr: 'Reçu le', en: 'Received', t: 'date', g: ['Demande', 'Request'] },
  { k: 'resp', fr: 'Responsable', en: 'Owner', t: 'list', list: 'team', g: ['Suivi', 'Follow-up'] },
  { k: 'etat', fr: 'État', en: 'Status', t: 'list', list: 'hq', g: ['Suivi', 'Follow-up'] },
  { k: 'transfert', fr: 'Transféré vers', en: 'Moved to', t: 'text', g: ['Suivi', 'Follow-up'], auto: true },
  { k: 'next', fr: 'Prochaine action', en: 'Next action', t: 'long', g: ['Suivi', 'Follow-up'], sugg: 'next' },
  { k: 'com', fr: 'Commentaires', en: 'Comments', t: 'long', g: ['Suivi', 'Follow-up'] },
  { k: 'majd', fr: 'MAJ le', en: 'Updated', t: 'date', g: ['Suivi', 'Follow-up'], auto: true },
  { k: 'majp', fr: 'MAJ par', en: 'Updated by', t: 'list', list: 'team', g: ['Suivi', 'Follow-up'], auto: true }
];
export const HQ_DEST = ['proj', 'ev', 'ao', 'ex'];
export const HQ_INIT_STATE = { proj: 'À confirmer', ev: 'À confirmer', ao: 'À l\'étude', ex: 'À confirmer' };

export function field(kind, k) { return (FIELDS[kind] || []).find(f => f.k === k); }
export function label(f, lang) { return lang === 'en' ? f.en : f.fr; }

/* ---------- Dates : texte 'AAAA-MM-JJ' (pas d'heure → aucun décalage de fuseau) ---------- */
export function todayStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
export function addDays(s, n) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function daysBetween(a, b) { // b - a en jours
  if (!a || !b) return null;
  const A = Date.UTC(...a.split('-').map((v, i) => i === 1 ? v - 1 : +v));
  const B = Date.UTC(...b.split('-').map((v, i) => i === 1 ? v - 1 : +v));
  return Math.round((B - A) / 86400000);
}
export function fmtDate(s) { if (!s) return ''; const [y, m, d] = s.split('-'); return d + '/' + m + '/' + y; }
export function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
/* « 8h », « 08:30 », « 8h30 » → minutes depuis minuit */
export function parseHour(v) {
  const m = String(v || '').match(/(\d{1,2})\s*[h:H.]?\s*(\d{2})?/);
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

/* ---------- Règles ---------- */
export function family(kind, etat) {
  const list = STATES[KINDS[kind].states] || [];
  const f = list.find(s => s[0] === etat);
  return f ? f[1] : '';
}
export function isClosed(fam) { return fam === 'Terminé' || fam === 'Perdu'; }

export const DEVIS_OPEN = ['', 'À confirmer', 'Repérage / étude', 'Devis en préparation', 'Devis en validation interne', 'En cours'];

/* Valeurs calculées (comme les formules du sheet) : rien n'est stocké pour ces champs. */
export function computed(kind, d) {
  const c = {};
  c.fam = family(kind, d.etat);
  if (kind === 'ev') {
    c.fin = d.fin || d.deb || '';
    c.mont = d.mont || (d.deb ? addDays(d.deb, -1) : '');
    c.dem = d.dem || c.fin;
    const s = (num(d.l1) * num(d.h1)) + (num(d.l2) * num(d.h2));
    c.surf = s ? round2(s) : '';
  }
  if (kind === 'proj') { const s = num(d.l) * num(d.h); c.surf = s ? round2(s) : ''; }
  if (kind === 'ao' && d.depot) c.jr = daysBetween(todayStr(), d.depot);
  c.devisPending = !!KINDS[kind].devis && d.devis !== 'Oui' && !d.ddevis && !d.liv && DEVIS_OPEN.includes(d.etat || '');
  return c;
}
function num(v) { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; }
function round2(n) { return Math.round(n * 100) / 100; }

/* Priorité automatique (appliquée à l'enregistrement) */
export function autoPriority(kind, d) {
  const fam = family(kind, d.etat);
  if (isClosed(fam)) return '';
  if (KINDS[kind].devis) {
    const c = computed(kind, d);
    if (c.devisPending) return VERY_HIGH;
    if (d.prio === VERY_HIGH) return 'Haute';
  }
  return d.prio || '';
}

/* Tri : actifs en haut (🔥 → Basse), terminés / perdus en bas ; Events par date, seuls les 🔥 restent en haut */
export function sortKey(kind, d) {
  const c = computed(kind, d);
  const rank = Math.max(0, STATIC_LISTS.prio.indexOf(d.prio)) + (STATIC_LISTS.prio.includes(d.prio) ? 1 : 5);
  const closed = isClosed(c.fam);
  const date = (kind === 'ev' ? d.deb : (d[KINDS[kind].dateKey] || '')) || '9999-12-31';
  if (kind === 'ev') return [closed ? 2 : (d.prio === VERY_HIGH ? 0 : 1), date, d.name || ''];
  return [closed ? 3 : (c.devisPending ? 0 : 1), closed ? 0 : rank, date, d.name || ''];
}
export function compareKeys(a, b) {
  for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; }
  return 0;
}

/* Couleurs d'alerte d'une ligne */
export function rowFlags(kind, d, all) {
  const c = computed(kind, d), today = todayStr(), f = {};
  if (!isClosed(c.fam) && d.majd && daysBetween(d.majd, today) > 7) f.stale = true;          // nom rouge
  if (['proj', 'ex', 'ao'].includes(kind) && d.name) {                                       // nom orange = doublon
    const n = norm(d.name);
    f.dup = all.filter(x => x.kind === kind && !x.deleted_at && norm(x.data.name) === n).length > 1;
  }
  if (KINDS[kind].devis && c.fam === 'En attente' && d.ddevis && daysBetween(d.ddevis, today) > 10) f.noAnswer = true;
  if (kind === 'ev' && ['À faire', 'En attente'].includes(c.fam) && d.deb) {
    const j = daysBetween(today, d.deb); if (j !== null && j >= 0 && j < 7) f.evSoon = true;
  }
  if (kind === 'sav' && d.ech && !isClosed(c.fam) && d.ech < today) f.late = true;
  return f;
}
export function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }

/* Sources de l'Agenda / Calendrier (même logique que l'onglet Planning) */
export const PLANNING = [
  ['proj', 'rep', '📍', 'Repérage (mesures)', 'Site survey (measures)', 'rep', null, null],
  ['proj', 'constr', '🏗️', 'Construction (début)', 'Build start', 'proj', null, null],
  ['proj', 'test', '🧪', 'Test atelier', 'Workshop test', 'proj', null, null],
  ['proj', 'liv', '📺', 'Installation / livraison', 'Installation / delivery', 'proj', null, null],
  ['ev', 'rep', '📍', 'Repérage', 'Site survey', 'rep', 'lieu', null],
  ['ev', 'mont', '🚚', 'Montage', 'Set-up', 'montage', 'lieu', 'hm'],
  ['ev', 'deb', '🎤', 'Événement', 'Event', 'ev', 'lieu', null],
  ['ev', 'dem', '↩️', 'Démontage', 'Dismantle', 'montage', 'lieu', 'hd'],
  ['ao', 'depot', '📄', 'Dépôt du dossier', 'Submission deadline', 'ao', null, null],
  ['ao', 'rep', '📍', 'Repérage AO', 'Tender site survey', 'rep', null, null],
  ['ao', 'liv', '📄', 'Livraison AO', 'Tender delivery', 'ao', null, null],
  ['ex', 'exp', '✈️', 'Expédition', 'Shipping', 'ex', 'pays', null],
  ['ex', 'liv', '✈️', 'Livraison / installation', 'Delivery / installation', 'ex', 'pays', null],
  ['sav', 'ech', '🔧', 'Échéance SAV', 'After-sales due', 'sav', 'lieu', null]
];
export const PLANNING_FILTERS = [
  ['proj', '📺', 'Projets', 'Projects'], ['ev', '🎤', 'Events', 'Events'], ['montage', '🚚', 'Montage / démontage', 'Set-up / dismantle'],
  ['rep', '📍', 'Repérages', 'Site surveys'], ['ao', '📄', 'Appels d\'offres', 'Tenders'], ['sav', '🔧', 'SAV', 'After-sales'],
  ['ex', '✈️', 'Export', 'Export']
];
/* Liste des éléments datés d'un ensemble de dossiers (annulés exclus) */
export function planningItems(dossiers) {
  const out = [];
  for (const x of dossiers) {
    if (x.deleted_at || x.kind === 'hq') continue;
    const d = x.data, c = computed(x.kind, d);
    if (c.fam === 'Perdu') continue;
    for (const [kind, key, icon, fr, en, filter, lieuKey, hourKey] of PLANNING) {
      if (kind !== x.kind) continue;
      const date = c[key] !== undefined && ['fin', 'mont', 'dem'].includes(key) ? c[key] : d[key];
      if (!isDate(date)) continue;
      let quoi = fr, quoiEn = en;
      if (key === 'deb' && c.fin && c.fin !== d.deb) { quoi += ' jusqu\'au ' + fmtDate(c.fin).slice(0, 5); quoiEn += ' until ' + fmtDate(c.fin).slice(0, 5); }
      const hour = hourKey ? d[hourKey] : '';
      out.push({ id: x.id, kind, key, icon, quoi, quoiEn, filter, date, hour: hour || '', min: parseHour(hour),
                 name: d.name, lieu: lieuKey ? d[lieuKey] || '' : '', resp: d.resp || '', team: [d.avec, d.eq].filter(Boolean).join(', '),
                 etat: d.etat || '', fam: c.fam, majd: d.majd || '' });
    }
  }
  return out;
}
