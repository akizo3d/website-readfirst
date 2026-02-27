import { put } from '@vercel/blob';
import { getAuthedUser, getServerClients } from './_lib';

export default async function handler(req: any, res: any) {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { supabase } = getServerClients();
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  if (req.method === 'GET') {
    const query = String(req.query?.query || '').trim();
    let q = supabase.from('readings').select('*').eq('user_id', user.id).order('last_opened_at', { ascending: false });
    if (query) q = q.ilike('title', `%${query}%`);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ items: data || [] });
  }

  if (req.method === 'POST') {
    const reading = req.body?.reading;
    if (!reading?.id || !reading?.title) return res.status(400).json({ error: 'Invalid reading payload' });

    const blob = await put(`readings/${user.id}/${reading.id}.json`, JSON.stringify(reading), {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    const payload = {
      id: reading.id,
      user_id: user.id,
      title: reading.title,
      source_type: reading.sourceType || 'pdf',
      tags: reading.tags || [],
      language: 'original',
      enhancement_status: reading.enhancedHtml ? 'done' : 'raw',
      progress: reading.progress || 0,
      blob_url: blob.url,
      updated_at: new Date().toISOString(),
      last_opened_at: new Date().toISOString(),
      created_at: reading.createdAt ? new Date(reading.createdAt).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase.from('readings').upsert(payload, { onConflict: 'id' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, id: reading.id });
  }

  if (req.method === 'DELETE') {
    const id = req.body?.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('readings').delete().eq('id', id).eq('user_id', user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
