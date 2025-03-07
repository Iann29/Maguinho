import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

// Obter as credenciais do Mercado Pago das variáveis de ambiente
const MP_CLIENT_ID = Deno.env.get('MP_PROD_CLIENT_ID') || ''
const MP_CLIENT_SECRET = Deno.env.get('MP_PROD_CLIENT_SECRET') || ''

console.log('Client ID disponível:', !!MP_CLIENT_ID);
console.log('Client Secret disponível:', !!MP_CLIENT_SECRET);

// Interface para o tipo de cupom
interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  usage_limit: number;
  usage_count: number;
  expires_at: string | null;
}

// Função para validar o cupom
async function validateCoupon(supabase, code: string, userId: string): Promise<{valid: boolean, coupon?: Coupon, message?: string}> {
  if (!code || code.trim() === '') {
    return { valid: false, message: 'Código de cupom vazio' };
  }

  // Verificar se o cupom existe
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  
  if (error || !coupon) {
    return { valid: false, message: 'Cupom inválido ou não encontrado' };
  }

  // Verificar se o cupom expirou
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, message: 'Este cupom já expirou' };
  }

  // Verificar se o cupom atingiu o limite de uso
  if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, message: 'Este cupom atingiu o limite de uso' };
  }

  // Verificar se o usuário já usou este cupom
  const { data: usages, error: usageError } = await supabase
    .from('coupon_usages')
    .select('*')
    .eq('coupon_id', coupon.id)
    .eq('user_id', userId);

  if (usageError) {
    console.error('Erro ao verificar uso do cupom:', usageError);
    return { valid: false, message: 'Erro ao verificar uso do cupom' };
  }

  if (usages && usages.length > 0) {
    return { valid: false, message: 'Você já usou este cupom anteriormente' };
  }

  return { valid: true, coupon };
}

// Função para aplicar desconto baseado no cupom
function applyDiscount(originalPrice: number, coupon: Coupon): number {
  if (coupon.discount_type === 'percent') {
    const discount = (originalPrice * coupon.discount_value) / 100;
    return Math.max(0, originalPrice - discount);
  } else { // fixed
    return Math.max(0, originalPrice - coupon.discount_value);
  }
}

// Função para obter um token de acesso usando client_id e client_secret
async function getAccessToken() {
  try {
    console.log('Tentando obter token de acesso com Client ID e Secret');
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': MP_CLIENT_ID,
        'client_secret': MP_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao obter token de acesso:', errorData);
      throw new Error(errorData.message || 'Erro ao obter token de acesso');
    }

    const data = await response.json();
    console.log('Token de acesso obtido com sucesso');
    return data.access_token;
  } catch (error) {
    console.error('Erro ao obter token de acesso:', error);
    throw error;
  }
}

// Cache para o token de acesso
let cachedToken = null;
let tokenExpiry = 0;

// Função para obter um token válido, seja das variáveis de ambiente, do cache ou gerando um novo
async function getValidToken() {
  // Se temos um token em cache e ele ainda é válido, usamos ele
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) {
    console.log('Usando token em cache');
    return cachedToken;
  }

  // Sempre geramos um novo token usando Client ID e Client Secret
  console.log('Gerando novo token com Client ID e Client Secret');
  const newToken = await getAccessToken();
  
  // Armazenamos o token em cache por 2 horas (7200000 ms)
  cachedToken = newToken;
  tokenExpiry = now + 7200000;
  
  return newToken;
}

serve(async (req) => {
  // Lidar com requisições OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar o método da requisição
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extrair o token de autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorização não fornecido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token de autorização inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Verificar o JWT para obter o usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter dados do corpo da requisição
    const { planId, planName, planPrice, planInterval, userName, couponCode } = await req.json()

    // Validar os dados do plano
    if (!planId || !planPrice || !planInterval) {
      return new Response(JSON.stringify({ error: 'Dados do plano incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Variáveis para controle de cupom e preço
    let finalPrice = planPrice;
    let discountAmount = 0;
    let appliedCoupon = null;
    let couponError = null;

    // Verificar e aplicar cupom, se fornecido
    if (couponCode) {
      console.log(`Validando cupom: ${couponCode} para usuário: ${user.id}`);
      const couponValidation = await validateCoupon(supabase, couponCode, user.id);
      
      if (couponValidation.valid && couponValidation.coupon) {
        appliedCoupon = couponValidation.coupon;
        const originalPrice = planPrice;
        finalPrice = applyDiscount(originalPrice, appliedCoupon);
        discountAmount = originalPrice - finalPrice;
        
        console.log(`Cupom válido: ${appliedCoupon.code}, tipo: ${appliedCoupon.discount_type}, valor: ${appliedCoupon.discount_value}`);
        console.log(`Preço original: ${originalPrice}, preço com desconto: ${finalPrice}, desconto: ${discountAmount}`);
        
        // Incrementar o contador de uso do cupom
        const { error: updateError } = await supabase
          .from('coupons')
          .update({ usage_count: appliedCoupon.usage_count + 1 })
          .eq('id', appliedCoupon.id);
          
        if (updateError) {
          console.error('Erro ao atualizar contador de uso do cupom:', updateError);
        } else {
          console.log(`Contador de uso do cupom ${appliedCoupon.code} incrementado para ${appliedCoupon.usage_count + 1}`);
        }
      } else {
        couponError = couponValidation.message;
        console.log(`Cupom inválido: ${couponError}`);
      }
    }

    // Obter um token válido para o Mercado Pago
    const accessToken = await getValidToken();

    // Criar preferência de pagamento usando fetch diretamente
    console.log('Tentando criar preferência de pagamento com o Mercado Pago');
    console.log('Cabeçalho de autorização: Bearer ' + accessToken.substring(0, 10) + '...');
    
    // Montar o payload com os metadados, incluindo informações do cupom se aplicável
    const payloadMetadata = {
      user_id: user.id,
      plan_id: planId,
      plan_interval: planInterval
    };

    if (appliedCoupon) {
      Object.assign(payloadMetadata, {
        coupon_id: appliedCoupon.id,
        coupon_code: appliedCoupon.code,
        original_price: planPrice,
        discount_amount: discountAmount
      });
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        items: [
          {
            id: planId,
            title: planName || 'Assinatura Maguinho',
            description: `Assinatura ${planInterval} do Maguinho${appliedCoupon ? ` com cupom ${appliedCoupon.code}` : ''}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: finalPrice
          }
        ],
        payer: {
          name: userName || user.email || 'Usuário',
          email: user.email
        },
        back_urls: {
          success: 'https://maguinho.com/dashboard',
          failure: 'https://maguinho.com/subscription',
          pending: 'https://maguinho.com/subscription'
        },
        auto_return: 'approved',
        notification_url: 'https://zssitwbdprfnqglttwhs.supabase.co/functions/v1/payment-webhook-public',
        statement_descriptor: 'MAGUINHO',
        external_reference: user.id,
        metadata: payloadMetadata,
        binary_mode: true, // Apenas aprovado ou rejeitado, sem pendente
        expires: false, // Preferência não expira
        processing_modes: ["aggregator"], // Modo de processamento agregador
        payment_methods: {
          excluded_payment_methods: [], // Não excluir nenhum método de pagamento
          excluded_payment_types: [], // Não excluir nenhum tipo de pagamento
          installments: 1 // Número de parcelas padrão
        }
      })
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Erro do Mercado Pago:', errorData);
      
      // Se o token falhou, limpar o cache e tentar novamente com um novo token
      if (errorData.status === 401) {
        console.log('Token inválido, gerando um novo token');
        cachedToken = null;
        
        const newToken = await getAccessToken();
        
        console.log('Tentando novamente com o novo token');
        // Repetindo o mesmo payload da requisição anterior
        const retryResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`
          },
          body: JSON.stringify({
            items: [
              {
                id: planId,
                title: planName || 'Assinatura Maguinho',
                description: `Assinatura ${planInterval} do Maguinho${appliedCoupon ? ` com cupom ${appliedCoupon.code}` : ''}`,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: finalPrice
              }
            ],
            payer: {
              name: userName || user.email || 'Usuário',
              email: user.email
            },
            back_urls: {
              success: 'https://maguinho.com/dashboard',
              failure: 'https://maguinho.com/subscription',
              pending: 'https://maguinho.com/subscription'
            },
            auto_return: 'approved',
            notification_url: 'https://zssitwbdprfnqglttwhs.supabase.co/functions/v1/payment-webhook-public',
            statement_descriptor: 'MAGUINHO',
            external_reference: user.id,
            metadata: payloadMetadata,
            binary_mode: true,
            expires: false,
            processing_modes: ["aggregator"],
            payment_methods: {
              excluded_payment_methods: [],
              excluded_payment_types: [],
              installments: 1
            }
          })
        });
        
        if (retryResponse.ok) {
          const retryResult = await retryResponse.json();
          console.log('Preferência criada com sucesso após retry:', retryResult.id);
          
          // Registrar a tentativa de pagamento no banco de dados
          const paymentAttemptData = {
            user_id: user.id,
            preference_id: retryResult.id,
            plan_id: planId,
            plan_name: planName,
            plan_price: finalPrice, // Preço com desconto
            plan_interval: planInterval,
            status: 'pending'
          };

          // Adicionar informações do cupom se aplicado
          if (appliedCoupon) {
            Object.assign(paymentAttemptData, {
              coupon_id: appliedCoupon.id,
              coupon_code: appliedCoupon.code,
              original_price: planPrice,
              discount_amount: discountAmount
            });
          }

          await supabase.from('payment_attempts').insert(paymentAttemptData);
          
          return new Response(JSON.stringify({ 
            preferenceId: retryResult.id,
            couponApplied: appliedCoupon ? true : false,
            originalPrice: appliedCoupon ? planPrice : finalPrice,
            finalPrice: finalPrice,
            discountAmount: discountAmount,
            couponCode: appliedCoupon ? appliedCoupon.code : null,
            couponError: couponError
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          const retryErrorData = await retryResponse.json();
          console.error('Erro do Mercado Pago após retry:', retryErrorData);
        }
      }
      
      throw new Error(errorData.message || 'Erro ao criar preferência de pagamento');
    }

    const result = await mpResponse.json();
    console.log('Preferência criada com sucesso:', result.id);

    // Registrar a tentativa de pagamento no banco de dados
    const paymentAttemptData = {
      user_id: user.id,
      preference_id: result.id,
      plan_id: planId,
      plan_name: planName,
      plan_price: finalPrice, // Preço com desconto
      plan_interval: planInterval,
      status: 'pending'
    };

    // Adicionar informações do cupom se aplicado
    if (appliedCoupon) {
      Object.assign(paymentAttemptData, {
        coupon_id: appliedCoupon.id,
        coupon_code: appliedCoupon.code,
        original_price: planPrice,
        discount_amount: discountAmount
      });
    }

    await supabase.from('payment_attempts').insert(paymentAttemptData);

    return new Response(JSON.stringify({
      preferenceId: result.id,
      couponApplied: appliedCoupon ? true : false,
      originalPrice: appliedCoupon ? planPrice : finalPrice,
      finalPrice: finalPrice,
      discountAmount: discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponError: couponError
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error)
    
    return new Response(JSON.stringify({ error: 'Erro ao processar pagamento' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})