import {
  CashClosureRecord,
  DeliveryDriver,
  Order,
  PaymentMethod,
  Product,
  RoleCredentials,
} from '../types/restaurant';
import burgerBbqImg from '../assets/images/product_burger_bbq_1794677105743.jpg';
import burgerClassicImg from '../assets/images/product_burger_classic_1794677105832.jpg';
import friesLoadedImg from '../assets/images/product_fries_loaded_1794677106406.jpg';
import hotdogGourmetImg from '../assets/images/product_hotdog_gourmet_1794677105927.jpg';

export const BRAND_LOGO_URL = '/assets/aistudio/Screenshot_20261114-124540_f539c348.jpg';
export const LOGIN_BG_URL = '/assets/aistudio/bca7550cadd5d3c0bb81abe7d2c72a36_5d945dad.jpg';

// Official BCV reference exchange rate (Bs. per 1 USD), synced automatically with BCV API on load
export const DEFAULT_BCV_RATE = 64.85;

export const INITIAL_CREDENTIALS: RoleCredentials = {
  gerencia: 'admin123',
  mesera: 'mesera123',
  cocina: 'cocina123',
};

export const PAGO_MOVIL_BANKS: string[] = [
  'Banesco (0134)',
  'Banco de Venezuela (0102)',
  'Mercantil (0105)',
  'BBVA Provincial (0108)',
  'BNC - Banco Nacional de Crédito (0191)',
  'Bancamiga (0172)',
  'Bancaribe (0114)',
  'Banco Exterior (0115)',
  'Banco Plaza (0138)',
  'Banplus (0174)',
];

export const INITIAL_DRIVERS: DeliveryDriver[] = [
  {
    id: 'drv-1',
    name: 'José Gregorio Morales',
    idNumber: 'V-23.410.892',
    phone: '584145553210',
    vehicleType: 'Moto',
    vehiclePlate: 'Empire Horse · Placa AE4K91',
    zone: 'Las Mercedes / Altamira / Chacao',
    available: true,
  },
  {
    id: 'drv-2',
    name: 'Luis Eduardo Pérez',
    idNumber: 'V-26.901.145',
    phone: '584248881122',
    vehicleType: 'Moto',
    vehiclePlate: 'Bera SBR · Placa AB9M22',
    zone: 'El Rosal / Sabana Grande / Centro',
    available: true,
  },
];

export const PRESET_PRODUCT_IMAGES: { label: string; url: string }[] = [
  {
    label: 'Hamburguesa Doble Clásica',
    url: burgerClassicImg,
  },
  {
    label: 'Hamburguesa BBQ Crispy',
    url: burgerBbqImg,
  },
  {
    label: 'Perro Caliente Gourmet',
    url: hotdogGourmetImg,
  },
  {
    label: 'Papas Fritas Cargadas',
    url: friesLoadedImg,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Gordis Doble Smash',
    category: 'Hamburguesa',
    description:
      'Doble carne smash de res sellada a la plancha, doble queso cheddar fundido, cebolla caramelizada, lechuga fresca y salsa secreta de la casa en pan brioche tostado.',
    price: 9.5,
    imageUrl: burgerClassicImg,
    available: true,
  },
  {
    id: 'prod-2',
    name: 'BBQ Bacon & Crispy Rings',
    category: 'Hamburguesa',
    description:
      'Medallón artesanal de 180g, tocineta ahumada crujiente, aros de cebolla dorados, queso cheddar madurado, cebolla morada y baño de salsa BBQ ahumada.',
    price: 11.0,
    imageUrl: burgerBbqImg,
    available: true,
  },
  {
    id: 'prod-3',
    name: 'Gordis Clásica de la Casa',
    category: 'Hamburguesa',
    description:
      'Carne de res jugosa a la parrilla, queso americano, tomate fresco, pepinillos encurtidos, lechuga crujiente y aderezo tártaro artesanal.',
    price: 7.5,
    imageUrl: burgerClassicImg,
    available: true,
  },
  {
    id: 'prod-4',
    name: 'Perro Caliente Bacon Cheddar',
    category: 'Perro Caliente',
    description:
      'Salchicha alemana premium en pan brioche dorado a la mantequilla, lluvia de tocineta crocante, cebolla caramelizada, salsa cheddar tibia y papas hilo.',
    price: 6.5,
    imageUrl: hotdogGourmetImg,
    available: true,
  },
  {
    id: 'prod-5',
    name: 'Perro Caliente Callejero XL',
    category: 'Perro Caliente',
    description:
      'Salchicha jumbo a la plancha, repollo rallado fino, maíz dulce, queso blanco rallado, papas trituradas y trío de salsas clásicas.',
    price: 5.0,
    imageUrl: hotdogGourmetImg,
    available: true,
  },
  {
    id: 'prod-6',
    name: 'Papas Gordis Cargadas',
    category: 'Papas Fritas',
    description:
      'Porción generosa de papas fritas corte rústico bañadas en crema de queso cheddar fundido, trozos de tocineta ahumada y cebollín fresco picado.',
    price: 6.0,
    imageUrl: friesLoadedImg,
    available: true,
  },
  {
    id: 'prod-7',
    name: 'Papas Fritas Clásicas',
    category: 'Papas Fritas',
    description:
      'Papas crujientes doradas al punto exacto con sal marina en escamas y acompañadas de salsa tártara o kétchup de la casa.',
    price: 3.5,
    imageUrl: friesLoadedImg,
    available: true,
  },
];

// Only Zelle requires capture upload (requiresProof: true)
export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-pago-movil',
    name: 'Pago Móvil',
    details: 'Banesco (0134) · V-24.890.112 · Tel: 0414-555-8910',
    requiresProof: false,
    enabled: true,
  },
  {
    id: 'pm-zelle',
    name: 'Zelle',
    details: 'pagos@gordisburguer.com · Titular: Gordis Burguer C.A.',
    requiresProof: true,
    enabled: true,
  },
  {
    id: 'pm-efectivo',
    name: 'Efectivo ($ / Bs)',
    details: 'Pago en caja o al motorizado en Dólares ($) o Bolívares (Bs).',
    requiresProof: false,
    enabled: true,
  },
  {
    id: 'pm-tarjeta',
    name: 'Tarjeta / Punto de Venta',
    details: 'Débito y crédito nacional/internacional en mostrador o mesa.',
    requiresProof: false,
    enabled: true,
  },
];

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    code: '#GB-101',
    source: 'mesera',
    modality: 'sitio',
    tableNumber: 3,
    items: [
      {
        productId: 'prod-1',
        name: 'Gordis Doble Smash',
        price: 9.5,
        quantity: 2,
        notes: '1 sin cebolla caramelizada',
      },
      {
        productId: 'prod-6',
        name: 'Papas Gordis Cargadas',
        price: 6.0,
        quantity: 1,
      },
    ],
    total: 25.0,
    bcvRateAtOrder: DEFAULT_BCV_RATE,
    paymentMethodId: 'pm-tarjeta',
    paymentMethodName: 'Tarjeta / Punto de Venta',
    payments: [
      {
        id: 'pay-101-1',
        methodId: 'pm-tarjeta',
        methodName: 'Tarjeta / Punto de Venta',
        amountUsd: 25.0,
        amountBs: Number((25.0 * DEFAULT_BCV_RATE).toFixed(2)),
      },
    ],
    confirmedForClosure: false,
    status: 'en_cocina',
    createdAt: minsAgo(9),
    updatedAt: minsAgo(6),
    notes: 'Servir las papas bien calientes junto a las burgers.',
  },
  {
    id: 'ord-102',
    code: '#GB-102',
    source: 'menu_publico',
    modality: 'delivery',
    customerName: 'Carlos Mendoza',
    customerPhone: '584128893210',
    deliveryAddress: 'Av. Principal Las Mercedes, Res. El Mirador Piso 4',
    items: [
      {
        productId: 'prod-2',
        name: 'BBQ Bacon & Crispy Rings',
        price: 11.0,
        quantity: 1,
      },
      {
        productId: 'prod-4',
        name: 'Perro Caliente Bacon Cheddar',
        price: 6.5,
        quantity: 2,
      },
    ],
    total: 24.0,
    bcvRateAtOrder: DEFAULT_BCV_RATE,
    paymentMethodId: 'pm-pago-movil',
    paymentMethodName: 'Pago Móvil + Efectivo ($)',
    pagoMovilDetails: {
      bank: 'Banesco (0134)',
      amount: 14.0,
      referenceLast6: '489821',
    },
    cashCurrency: 'USD',
    payments: [
      {
        id: 'pay-102-1',
        methodId: 'pm-pago-movil',
        methodName: 'Pago Móvil',
        amountUsd: 14.0,
        amountBs: Number((14.0 * DEFAULT_BCV_RATE).toFixed(2)),
        pagoMovilDetails: {
          bank: 'Banesco (0134)',
          amount: 14.0,
          referenceLast6: '489821',
        },
      },
      {
        id: 'pay-102-2',
        methodId: 'pm-efectivo',
        methodName: 'Efectivo ($ / Bs)',
        amountUsd: 10.0,
        amountBs: Number((10.0 * DEFAULT_BCV_RATE).toFixed(2)),
        cashCurrency: 'USD',
      },
    ],
    confirmedForClosure: false,
    status: 'pendiente',
    createdAt: minsAgo(4),
    updatedAt: minsAgo(4),
  },
  {
    id: 'ord-103',
    code: '#GB-103',
    source: 'mesera',
    modality: 'sitio',
    tableNumber: 7,
    items: [
      {
        productId: 'prod-3',
        name: 'Gordis Clásica de la Casa',
        price: 7.5,
        quantity: 2,
      },
      {
        productId: 'prod-7',
        name: 'Papas Fritas Clásicas',
        price: 3.5,
        quantity: 2,
      },
    ],
    total: 22.0,
    bcvRateAtOrder: DEFAULT_BCV_RATE,
    paymentMethodId: 'pm-efectivo',
    paymentMethodName: 'Efectivo (Bs)',
    cashCurrency: 'VES',
    payments: [
      {
        id: 'pay-103-1',
        methodId: 'pm-efectivo',
        methodName: 'Efectivo ($ / Bs)',
        amountUsd: 22.0,
        amountBs: Number((22.0 * DEFAULT_BCV_RATE).toFixed(2)),
        cashCurrency: 'VES',
      },
    ],
    confirmedForClosure: true,
    confirmedForClosureAt: minsAgo(15),
    status: 'servido',
    createdAt: minsAgo(35),
    updatedAt: minsAgo(18),
  },
  {
    id: 'ord-104',
    code: '#GB-104',
    source: 'menu_publico',
    modality: 'delivery',
    customerName: 'Valeria Rojas',
    customerPhone: '584243117740',
    deliveryAddress: 'Calle Los Cedros, Edif. Altamira Sur Apto 2B',
    items: [
      {
        productId: 'prod-1',
        name: 'Gordis Doble Smash',
        price: 9.5,
        quantity: 1,
      },
      {
        productId: 'prod-6',
        name: 'Papas Gordis Cargadas',
        price: 6.0,
        quantity: 1,
      },
    ],
    total: 15.5,
    bcvRateAtOrder: DEFAULT_BCV_RATE,
    paymentMethodId: 'pm-zelle',
    paymentMethodName: 'Zelle',
    payments: [
      {
        id: 'pay-104-1',
        methodId: 'pm-zelle',
        methodName: 'Zelle',
        amountUsd: 15.5,
        amountBs: Number((15.5 * DEFAULT_BCV_RATE).toFixed(2)),
      },
    ],
    paymentProofName: 'zelle_valeria_1550.png',
    confirmedForClosure: true,
    confirmedForClosureAt: minsAgo(10),
    status: 'en_camino',
    assignedDriverId: 'drv-1',
    assignedDriverName: 'José Gregorio Morales',
    assignedDriverPhone: '584145553210',
    assignedDriverVehicle: 'Moto · Empire Horse · Placa AE4K91',
    dispatchedAt: minsAgo(5),
    createdAt: minsAgo(22),
    updatedAt: minsAgo(5),
  },
];

export const INITIAL_CLOSURES: CashClosureRecord[] = [];
