export type UserRole = 'gerencia' | 'mesera' | 'cocina';

export type ActiveModule = 'login' | 'gerencia' | 'mesera' | 'cocina' | 'menu_publico';

export type ProductCategory = 'Hamburguesa' | 'Perro Caliente' | 'Papas Fritas';

export type OrderModality = 'sitio' | 'llevar' | 'delivery';

export type OrderStatus =
  | 'pendiente'
  | 'en_cocina'
  | 'listo'
  | 'servido'
  | 'en_camino'
  | 'cancelado';

export type OrderSource = 'mesera' | 'menu_publico';

export interface RoleCredentials {
  gerencia: string;
  mesera: string;
  cocina: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  imageUrl: string;
  available: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  details: string;
  requiresProof: boolean;
  enabled: boolean;
}

export interface PagoMovilDetails {
  bank: string;
  amount: number;
  referenceLast6: string;
}

export interface DeliveryDriver {
  id: string;
  name: string;
  idNumber: string;
  phone: string;
  vehicleType: 'Moto' | 'Bicicleta' | 'Auto';
  vehiclePlate: string;
  zone?: string;
  available: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  code: string;
  source: OrderSource;
  modality: OrderModality;
  tableNumber?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  items: OrderItem[];
  total: number;
  paymentMethodId: string;
  paymentMethodName: string;
  pagoMovilDetails?: PagoMovilDetails;
  paymentProofName?: string;
  paymentProofUrl?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  closedInShiftId?: string;
  // Delivery assignment
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverVehicle?: string;
  dispatchedAt?: string;
  // Post-confirmation modification tracking for Cocina alert
  isModifiedAfterConfirm?: boolean;
  modifiedAt?: string;
  modificationSummary?: string;
  modificationAcknowledgedByKitchen?: boolean;
}

export interface CashClosureRecord {
  id: string;
  closedAt: string;
  totalSales: number;
  orderCount: number;
  byMethod: Record<string, number>;
  closedBy: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}
