import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Configuração dos cabeçalhos CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };

  // Responde a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Log da requisição para diagnóstico
    console.log(`Hook de verificação de email chamado. Método: ${req.method}`);
    
    // Log dos cabeçalhos para diagnóstico
    console.log("Cabeçalhos recebidos:");
    for (const [key, value] of req.headers.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    // Ler o corpo da requisição
    let body = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
        console.log('Dados recebidos:', JSON.stringify(body, null, 2));
      }
    } catch (e) {
      console.log('Corpo vazio ou não é JSON válido');
    }

    // Verificar se o email está presente (opcional)
    const email = body.email || 
                 (body.user && body.user.email) || 
                 (body.record && body.record.email) ||
                 null;
                 
    if (email) {
      console.log(`Email a ser verificado: ${email}`);
      // Aqui você poderia implementar regras de verificação específicas
      // Por exemplo, verificar domínios permitidos, etc.
    } else {
      console.log("Nenhum email encontrado na requisição");
    }

    // Importante: Sempre retornamos 200 para permitir a operação
    // Se quiséssemos bloquear um email específico, retornaríamos 400 ou outro código de erro
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email permitido"
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error('Erro no hook:', error);
    
    // Em caso de erro, ainda retornamos 200 para não bloquear o cadastro
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email permitido (fallback)"
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});