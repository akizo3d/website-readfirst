import { createClient } from '@supabase/supabase-js';

export function getServerClients() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseUrl && supabaseServiceRole
    ? createClient(supabaseUrl, supabaseServiceRole)
    : null;
  return { supabase };
}

export async function getAuthedUser(req: any) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const { supabase } = getServerClients();
  if (!token || !supabase) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user || null;
}

export function hashText(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

export function validateLength(text: string, max = 30000) {
  return typeof text === 'string' && text.length > 0 && text.length <= max;
}
