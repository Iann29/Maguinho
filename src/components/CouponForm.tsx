import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface CouponProps {
  originalPrice: number;
  onApplyCoupon: (couponData: {
    code: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    finalPrice: number;
    discountAmount: number;
  }) => void;
}

const CouponForm: React.FC<CouponProps> = ({ originalPrice, onApplyCoupon }) => {
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!couponCode.trim()) {
      setError('Digite um código de cupom válido');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Autenticar o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Você precisa estar logado para aplicar um cupom');
        return;
      }

      // Buscar o cupom pelo código
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (couponError || !coupon) {
        setError('Cupom não encontrado');
        return;
      }

      // Verificar se o cupom expirou
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        setError('Este cupom já expirou');
        return;
      }

      // Verificar se o cupom atingiu o limite de uso
      if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
        setError('Este cupom atingiu o limite de uso');
        return;
      }

      // Verificar se o usuário já usou este cupom
      const { data: usages, error: usageError } = await supabase
        .from('coupon_usages')
        .select('*')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id);

      if (usageError) {
        setError('Erro ao verificar uso do cupom');
        return;
      }

      if (usages && usages.length > 0) {
        setError('Você já usou este cupom anteriormente');
        return;
      }

      // Calcular o desconto
      let finalPrice = originalPrice;
      let discountAmount = 0;

      if (coupon.discount_type === 'percent') {
        discountAmount = (originalPrice * coupon.discount_value) / 100;
        finalPrice = Math.max(0, originalPrice - discountAmount);
      } else { // fixed
        discountAmount = coupon.discount_value;
        finalPrice = Math.max(0, originalPrice - discountAmount);
      }

      // Formatar para duas casas decimais
      finalPrice = parseFloat(finalPrice.toFixed(2));
      discountAmount = parseFloat(discountAmount.toFixed(2));

      // Definir o cupom aplicado
      const appliedCouponData = {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type as 'percent' | 'fixed',
        discountValue: coupon.discount_value,
        finalPrice,
        discountAmount
      };

      setAppliedCoupon(appliedCouponData);
      setSuccess(`Cupom ${coupon.code} aplicado com sucesso! Desconto de ${discountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
      
      // Chamar o callback de aplicação do cupom
      onApplyCoupon({
        code: coupon.code,
        discountType: coupon.discount_type as 'percent' | 'fixed',
        discountValue: coupon.discount_value,
        finalPrice,
        discountAmount
      });

    } catch (err) {
      console.error('Erro ao aplicar cupom:', err);
      setError('Erro ao processar o cupom. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setSuccess(null);
    setError(null);
    onApplyCoupon({
      code: '',
      discountType: 'percent',
      discountValue: 0,
      finalPrice: originalPrice,
      discountAmount: 0
    });
  };

  return (
    <div className="p-4 border rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-2">Cupom de desconto</h3>
      
      {!appliedCoupon ? (
        <form onSubmit={handleApplyCoupon} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Digite seu cupom"
              className="px-3 py-2 border rounded flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? 'Aplicando...' : 'Aplicar'}
            </button>
          </div>
          
          {error && (
            <div className="text-red-600 text-sm mt-1">{error}</div>
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-green-50 p-3 rounded">
            <div>
              <span className="font-semibold">{appliedCoupon.code}</span>
              <span className="text-green-700 ml-2">
                -{appliedCoupon.discountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-gray-500 hover:text-red-600"
            >
              Remover
            </button>
          </div>
          
          {success && (
            <div className="text-green-600 text-sm">{success}</div>
          )}
          
          <div className="mt-2 text-sm text-gray-600">
            Preço original: {originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="font-semibold">
            Preço final: {appliedCoupon.finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponForm;
