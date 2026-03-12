export function handleError(res, error) {
  console.error('[API Error]', error);
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Record duplicato' });
  }
  if (error.code === '23503') {
    return res.status(400).json({ error: 'Riferimento non valido' });
  }
  if (error.code === '22P02') {
    return res.status(400).json({ error: 'ID non valido' });
  }
  return res.status(500).json({ error: 'Errore interno del server' });
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed);
  return res.status(405).json({ error: 'Metodo non consentito' });
}
