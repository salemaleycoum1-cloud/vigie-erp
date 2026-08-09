// Exécute le schéma SQL contre la base Postgres configurée dans .env.local (POSTGRES_URL)
// Usage : npm run db:init

const fs = require('fs');
const path = require('path');
const { sql } = require('@vercel/postgres');

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Exécution du schéma...');
  await sql.query(schema);
  console.log('Base de données initialisée avec succès.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur lors de l\'initialisation :', err);
  process.exit(1);
});
