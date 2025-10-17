export default async function handler(req, res) {
  // Habilita CORS se necessário
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY não está configurada');
    return res.status(500).json({ error: 'Configuração da API ausente' });
  }

  try {
    // Modelo atualizado
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();

    // Verifica se houve erro na resposta da API
    if (!response.ok) {
      console.error('Erro da API Gemini:', data);
      return res.status(response.status).json({ 
        error: 'Erro ao chamar a API Gemini',
        details: data 
      });
    }

    // Verifica se a resposta tem o formato esperado
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Resposta inesperada da API:', data);
      return res.status(500).json({ 
        error: 'Resposta inválida da API Gemini',
        details: data 
      });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Erro no handler:', error);
    res.status(500).json({ 
      error: 'Erro ao chamar a API Gemini',
      message: error.message 
    });
  }
}