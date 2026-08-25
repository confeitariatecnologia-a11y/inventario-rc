import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function testDelete() {
  const { data: users, error: fetchError } = await supabase.from('user_accesses').select('*').ilike('email', 'matheus@gmail.com');
  console.log('Users found:', users?.length, fetchError);
  
  if (users && users.length > 0) {
    console.log('Attempting to delete user:', users[0].id);
    const { data, error } = await supabase.from('user_accesses').delete().eq('id', users[0].id).select();
    console.log('Delete result:', data, error);
  }
}

testDelete();
