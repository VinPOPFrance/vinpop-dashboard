-- =============================================================================
--  Schema `dashboard` : les donnees saisies a la main dans le dashboard.
-- =============================================================================
--
--  Ce schema est volontairement separe de `public` et de `shopify`, qui sont
--  ecrits par Airbyte. Airbyte peut recreer, tronquer ou remplacer ses tables a
--  chaque synchronisation : y ajouter quoi que ce soit reviendrait a le perdre.
--  Le dashboard n ecrit QUE dans ce schema, et ne lit les schemas Airbyte qu en
--  lecture seule.
--
--  Script idempotent : il peut etre rejoue sans detruire les donnees saisies.
--  Execution : psql "$DATABASE_URL" -f scripts/create-dashboard-schema.sql
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS dashboard;

COMMENT ON SCHEMA dashboard IS
  'Donnees saisies dans le dashboard VinPop. Jamais ecrit par Airbyte.';

-- -----------------------------------------------------------------------------
--  Charges : fixes mensuelles et variables unitaires.
-- -----------------------------------------------------------------------------
--  `kind` distingue les deux natures de charge, parce qu elles n entrent pas au
--  meme endroit dans le calcul du point d equilibre :
--    - 'fixed'    : montant mensuel, independant du volume vendu (entrepot,
--                   salaires, abonnements). Denominateur du break-even.
--    - 'variable' : cout par bouteille vendue (achat du vin, laboratoire,
--                   packaging, expedition). Se retranche du prix de vente pour
--                   donner la marge sur cout variable.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard.cost_settings (
  id           bigserial PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('fixed', 'variable')),
  label        text NOT NULL,
  amount       numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  -- Unite du montant, pour l affichage : 'per_month' ou 'per_bottle'.
  unit         text NOT NULL CHECK (unit IN ('per_month', 'per_bottle')),
  sort_order   integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- Un meme poste ne doit exister qu une fois par nature de charge.
  CONSTRAINT cost_settings_unique_label UNIQUE (kind, label)
);

COMMENT ON TABLE dashboard.cost_settings IS
  'Charges fixes mensuelles et charges variables par bouteille, saisies a la main.';

-- -----------------------------------------------------------------------------
--  Hypotheses de calcul.
-- -----------------------------------------------------------------------------
--  Table cle / valeur : ces parametres sont peu nombreux, scalaires, et
--  amenes a evoluer. Une colonne par hypothese obligerait a migrer le schema a
--  chaque ajout.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard.forecast_assumptions (
  key          text PRIMARY KEY,
  value        numeric(12, 2) NOT NULL DEFAULT 0,
  label        text NOT NULL,
  unit         text NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE dashboard.forecast_assumptions IS
  'Hypotheses scalaires du modele financier (prix de vente moyen, etc.).';

-- -----------------------------------------------------------------------------
--  Postes par defaut.
-- -----------------------------------------------------------------------------
--  Inseres a 0 : ils donnent au formulaire sa structure sans inventer de
--  montants. `ON CONFLICT DO NOTHING` protege les valeurs deja saisies lors d un
--  reexecution du script.
-- -----------------------------------------------------------------------------
INSERT INTO dashboard.cost_settings (kind, label, amount, unit, sort_order) VALUES
  ('fixed',    'Location entrepot',        0, 'per_month',  10),
  ('fixed',    'Salaires',                 0, 'per_month',  20),
  ('fixed',    'Abonnements logiciels',    0, 'per_month',  30),
  ('fixed',    'Frais fixes divers',       0, 'per_month',  40),
  ('variable', 'Achat du vin (COGS)',      0, 'per_bottle', 10),
  ('variable', 'Frais de laboratoire',     0, 'per_bottle', 20),
  ('variable', 'Packaging',                0, 'per_bottle', 30),
  ('variable', 'Expedition',               0, 'per_bottle', 40)
ON CONFLICT (kind, label) DO NOTHING;

INSERT INTO dashboard.forecast_assumptions (key, value, label, unit) VALUES
  ('average_selling_price_per_bottle', 0, 'Prix de vente moyen par bouteille', 'eur'),
  ('bottles_per_box',                  0, 'Bouteilles par Smart Wine Box',     'bottles')
ON CONFLICT (key) DO NOTHING;
