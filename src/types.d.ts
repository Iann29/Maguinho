// Definição de tipos para o Mercado Pago
interface MercadoPagoInstance {
  checkout: (options: {
    preference: {
      id: string;
    };
    render: {
      container: string;
      label: string;
    };
  }) => void;
}

interface Window {
  MercadoPago: new (publicKey: string, options?: { locale: string }) => MercadoPagoInstance;
}
