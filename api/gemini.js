// Usamos module.exports para garantir a compatibilidade com o ambiente da Vercel.
module.exports = async (req, res) => {
  // Habilita CORS
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
    return res.status(500).json({ error: 'Configuração da API ausente no servidor' });
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Erro da API Gemini (Status não-OK):', data);
      return res.status(geminiResponse.status).json({ 
        error: 'Erro na comunicação com a API Gemini',
        details: data 
      });
    }

    // **LÓGICA CENTRAL DA CORREÇÃO**
    // Extrai o texto de forma segura. Se qualquer parte do caminho for nula, o resultado será `undefined`.
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (textContent) {
      // SUCESSO: Envia um objeto simples contendo apenas o texto para o frontend.
      res.status(200).json({ text: textContent });
    } else {
      // FALHA (BLOQUEIO DE SEGURANÇA, ETC): Envia um erro claro para o frontend.
      const finishReason = data?.candidates?.[0]?.finishReason || 'RAZÃO DESCONHECIDA';
      console.error(`Resposta da API bloqueada ou inválida. Razão: ${finishReason}`, data);
      res.status(400).json({
        error: `A API não retornou conteúdo. Motivo: ${finishReason}. Tente um prompt com menos restrições.`,
        details: data
      });
    }

  } catch (error) {
    console.error('Erro no handler da API:', error);
    res.status(500).json({ 
      error: 'Erro interno no servidor ao processar a chamada.',
      message: error.message 
    });
  }
};