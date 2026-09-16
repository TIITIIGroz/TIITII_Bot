const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // ou SUPABASE_ANON_KEY selon tes variables sur Render

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
