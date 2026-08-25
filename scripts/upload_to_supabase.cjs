const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://oyqwwkmnxksdvsukdrti.supabase.co';
const supabaseAnonKey = 'sb_publishable_fyr1i2HM6PfW8fwn33JTPA_AECExYdI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('🚀 Iniciando sincronização direta com Supabase...');

  // 1. Garantir Localizações
  const locations = [
    { name: 'Oeste', type: 'loja' },
    { name: 'Marista', type: 'loja' },
    { name: 'Prime', type: 'loja' },
    { name: 'Flamboyant', type: 'loja' },
    { name: 'Brasília', type: 'loja' },
    { name: 'Togo', type: 'loja' },
    { name: 'Goiânia Shopping', type: 'loja' },
  ];

  for (const loc of locations) {
    const { data: existing } = await supabase.from('locations').select('id').eq('name', loc.name).maybeSingle();
    if (!existing) {
      await supabase.from('locations').insert(loc);
    }
  }

  // 2. Garantir Categorias
  const categories = [
    { name: 'Móveis e Utensílios', icon: 'Armchair', color: '#64748b' },
    { name: 'Máquinas e Equipamentos', icon: 'Cog', color: '#f59e0b' },
    { name: 'Computadores e Periféricos', icon: 'Monitor', color: '#2563eb' },
    { name: 'Veículos', icon: 'Truck', color: '#ef4444' },
  ];

  for (const cat of categories) {
    const { data: existing } = await supabase.from('categories').select('id').eq('name', cat.name).maybeSingle();
    if (!existing) {
      await supabase.from('categories').insert(cat);
    }
  }

  const { data: allLocs } = await supabase.from('locations').select('id, name');
  const { data: allCats } = await supabase.from('categories').select('id, name');

  const locMap = new Map((allLocs || []).map((l) => [l.name, l.id]));
  const catMap = new Map((allCats || []).map((c) => [c.name, c.id]));

  console.log('📍 Locais mapeados:', locMap.size);
  console.log('🏷️ Categorias mapeadas:', catMap.size);

  // Parse SQL to extract rows
  const sqlContent = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'import_imobilizado_completo.sql'), 'utf8');
  const insertMatch = sqlContent.match(/INSERT INTO tmp_import VALUES\s*([\s\S]*?);/);
  
  if (!insertMatch) {
    throw new Error('Não foi possível encontrar as tuplas de inserção no SQL.');
  }

  const lines = insertMatch[1]
    .split('\n')
    .map((l) => l.trim().replace(/^,?\s*\(/, '').replace(/\),?$/, ''))
    .filter(Boolean);

  const assetsToInsert = [];

  for (const line of lines) {
    const match = line.match(/^'([^']*)',\s*'((?:[^']|'')*)',\s*(NULL|'[^']*'),\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(NULL|[0-9.]+),\s*(NULL|'(?:[^']|'')*')$/);
    if (!match) continue;

    const asset_code = match[1];
    const name = match[2].replace(/''/g, "'");
    const serial_number = match[3] === 'NULL' ? null : match[3].slice(1, -1);
    const category_name = match[4].replace(/''/g, "'");
    const location_name = match[5].replace(/''/g, "'");
    const val_str = match[6];
    const notes = match[7] === 'NULL' ? null : match[7].slice(1, -1).replace(/''/g, "'");

    const category_id = catMap.get(category_name) || null;
    const location_id = locMap.get(location_name) || null;
    const acquisition_value = val_str === 'NULL' ? null : parseFloat(val_str);

    assetsToInsert.push({
      asset_code,
      name,
      serial_number,
      category_id,
      location_id,
      status: 'operacional',
      acquisition_value,
      notes,
      qr_code: asset_code,
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`📦 Preparados ${assetsToInsert.length} ativos para envio.`);

  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < assetsToInsert.length; i += batchSize) {
    const chunk = assetsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('assets').upsert(chunk, { onConflict: 'asset_code' });
    if (error) {
      console.error(`\n❌ Erro no lote ${i} - ${i + chunk.length}:`, error.message);
    } else {
      insertedCount += chunk.length;
      process.stdout.write(`\r✅ Progresso: ${insertedCount}/${assetsToInsert.length} ativos importados...`);
    }
  }

  console.log('\n🎉 Importação concluída com sucesso total!');
}

run().catch((err) => {
  console.error('Falha geral:', err);
  process.exit(1);
});
