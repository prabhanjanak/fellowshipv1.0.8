import pg from 'pg';

async function main() {
  const connectionString = "postgresql://postgres:admin@localhost:5432/fellowship_db";
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Connected to database. Starting ultra-robust specialty cleanup...");

  // Keep only the 8 standard specialties: IDs 15, 16, 17, 18, 19, 20, 21, 22
  const standardIds = [15, 16, 17, 18, 19, 20, 21, 22];

  // Fetch all specialties from the database
  const specRes = await client.query("SELECT id, name FROM specialities");
  const specialitiesMap = {};
  for (const row of specRes.rows) {
    specialitiesMap[row.id] = row.name;
  }

  console.log("Found specialties in database:");
  console.table(specRes.rows);

  function getStandardId(specId, name) {
    if (standardIds.includes(Number(specId))) {
      return Number(specId);
    }
    if (!name) return null;
    const normName = name.toLowerCase().trim();
    if (normName.includes('vitreo-retina') || normName.includes('vitreo retina')) return 22;
    if (normName.includes('pediatric retina')) return 22; // Retina specialty
    if (normName.includes('medical retina')) return 18;
    if (normName.includes('pediatric ophthalmology') || normName.includes('pediatric')) return 20;
    if (normName.includes('cornea & anterior segment') || normName.includes('cornea') || normName.includes('ocular surface')) return 15;
    if (normName.includes('glaucoma')) return 16;
    if (normName.includes('iol')) return 17;
    if (normName.includes('oculoplasty')) return 19;
    if (normName.includes('phaco') || normName.includes('refractive')) return 21;
    return null;
  }

  // 7 dependent tables containing speciality_id
  const tables = [
    'allocations',
    'applications',
    'batch_candidates',
    'candidate_preferences',
    'doctor_assignments',
    'interview_panels',
    'interview_scores'
  ];

  for (const table of tables) {
    console.log(`Processing table: ${table}...`);

    // Fetch all rows from this table where speciality_id is not in our standard set
    const rowsRes = await client.query(`
      SELECT id, speciality_id 
      FROM ${table} 
      WHERE speciality_id IS NOT NULL AND speciality_id NOT IN (15, 16, 17, 18, 19, 20, 21, 22)
    `);

    console.log(`Found ${rowsRes.rows.length} rows to check in table "${table}".`);

    for (const row of rowsRes.rows) {
      const currentSpecId = row.speciality_id;
      const specName = specialitiesMap[currentSpecId];
      const targetId = getStandardId(currentSpecId, specName);

      if (targetId !== null) {
        // Try updating to the target standard ID
        try {
          await client.query(`UPDATE ${table} SET speciality_id = $1 WHERE id = $2`, [targetId, row.id]);
          console.log(`Updated row ${row.id} in "${table}" from spec ${currentSpecId} (${specName}) -> ${targetId}`);
        } catch (err) {
          if (err.code === '23505') {
            // Unique key violation -> this row is a duplicate, delete it safely
            console.log(`Unique key violation on row ${row.id} in "${table}" when updating to ${targetId}. Deleting duplicate row...`);
            await client.query(`DELETE FROM ${table} WHERE id = $1`, [row.id]);
          } else {
            console.error(`Unexpected error updating row ${row.id} in "${table}":`, err.message);
            throw err;
          }
        }
      } else {
        // No standard specialty mapping -> delete referencing row
        console.log(`No mapping for spec ${currentSpecId} (${specName}). Deleting row ${row.id} in "${table}"...`);
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [row.id]);
      }
    }
  }

  // Finally, delete all non-standard specialties from the specialities table
  console.log("Deleting non-standard specialties from the specialities table...");
  const deleteRes = await client.query(`
    DELETE FROM specialities 
    WHERE id NOT IN (15, 16, 17, 18, 19, 20, 21, 22)
  `);
  console.log(`Deleted ${deleteRes.rowCount} non-standard specialties.`);

  // Confirm remaining specialties in the DB
  const finalRes = await client.query("SELECT id, name, code FROM specialities ORDER BY id");
  console.log("REMAINING SPECIALITIES:");
  console.table(finalRes.rows);

  await client.end();
  console.log("Cleanup completed successfully!");
}

main().catch(console.error);
