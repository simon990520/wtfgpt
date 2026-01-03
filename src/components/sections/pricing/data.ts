export const BILLING_PERIODS = [
  {
    label: 'Monthly',
    key: 'monthly',
    saving: null,
  },
  {
    label: 'Annually',
    key: 'yearly',
    saving: '20%',
  },
] as const;

const AMOUNTS = {
  free: {
    monthly: 0,
    yearly: 0,
  },
  plus: {
    monthly: 15,
    yearly: 144,
  },
  pro: {
    monthly: 40,
    yearly: 384,
  },
  enterprise: {
    monthly: null,
    yearly: null,
  },
};

export type TBILLING_PLAN = (typeof BILLING_PLANS)[number];
export const BILLING_PLANS = [
  {
    name: 'Starter Beta',
    description:
      'Perfecto para probar el poder de WTF en tus conversaciones personales o pequeño negocio.',
    pricing: {
      monthly: {
        amount: AMOUNTS['free']['monthly'],
        formattedPrice: '$0',
        stripeId: null,
      },
      yearly: {
        amount: AMOUNTS['free']['yearly'],
        formattedPrice: '$0',
        stripeId: null,
      },
    },
    features: [
      'Análisis de hasta 500 mensajes/mes',
      'Resúmenes diarios básicos',
      'Identificación de leads básica',
      'Conexión segura WhatsApp',
      'Soporte vía comunidad',
    ],
    cta: 'Empezar Gratis',
    popular: false,
  },
  {
    name: 'Pro Pilot',
    description:
      'Para negocios que no pueden permitirse perder ni una sola oportunidad de venta.',
    pricing: {
      monthly: {
        amount: AMOUNTS['plus']['monthly'],
        formattedPrice: '$' + AMOUNTS['plus']['monthly'],
        stripeId: process.env.NEXT_PUBLIC_PLUS_MONTHLY_PRICE_ID!,
      },
      yearly: {
        amount: AMOUNTS['plus']['yearly'],
        formattedPrice: '$' + AMOUNTS['plus']['yearly'],
        stripeId: process.env.NEXT_PUBLIC_PLUS_YEARLY_PRICE_ID!,
      },
    },
    features: [
      'Análisis ilimitado de mensajes',
      'CRM Inteligente integrado',
      'Reportes de pedidos detallados',
      'Alertas de seguimiento prioritario',
      'Soporte prioritario 24/7',
    ],
    cta: 'Obtener Pro Pilot',
    popular: true,
  },
  {
    name: 'Business Brain',
    description:
      'Inteligencia avanzada para equipos que gestionan cientos de leads al día.',
    pricing: {
      monthly: {
        amount: AMOUNTS['pro']['monthly'],
        formattedPrice: '$' + AMOUNTS['pro']['monthly'],
        stripeId: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID!,
      },
      yearly: {
        amount: AMOUNTS['pro']['yearly'],
        formattedPrice: '$' + AMOUNTS['pro']['yearly'],
        stripeId: process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID!,
      },
    },
    features: [
      'Todo lo de Pro Pilot',
      'Insights multi-número',
      'Integración con CRM externos',
      'Modelos de IA personalizados',
      'Account Manager dedicado',
    ],
    cta: 'Escalar ahora',
    popular: false,
  },
  {
    name: 'Enterprise',
    description:
      'Soluciones a medida para grandes corporaciones y volúmenes masivos.',
    pricing: {
      monthly: {
        amount: AMOUNTS['enterprise']['monthly'],
        formattedPrice: "Hablemos",
        stripeId: null,
      },
      yearly: {
        amount: AMOUNTS['enterprise']['yearly'],
        formattedPrice: "Hablemos",
        stripeId: null,
      },
    },
    features: [
      'Infraestructura dedicada',
      'Máxima seguridad on-premise',
      'Entrenamiento con datos propios',
      'API de IA personalizada',
      'SLA garantizado',
    ],
    cta: 'Contactar Ventas',
    popular: false,
  },
];
