// --- Data Types ---
export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  description: string;
  stock: { [warehouseId: number]: number };
  minStock: number;
  averageLandedCost: number;
  imageUrl: string;
  totalStock?: number; // Added for easier export/display
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
}

export interface Customer {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
}

export interface Warehouse {
  id: number;
  name: string;
  location: string;
  type: 'Main' | 'Secondary'; // Added type field
}

export interface OrderItem {
  productId: number;
  qty: number;
  price: number;
  currency?: string; // For PO items
  landedCostPerUnit?: number; // For PO items (in AZN)
}

export interface PurchaseOrder {
  id: number;
  contactId: number; // Supplier ID
  orderDate: string;
  warehouseId: number;
  status: 'Draft' | 'Ordered' | 'Received';
  items: OrderItem[];
  currency: 'AZN' | 'USD' | 'EUR' | 'RUB';
  exchangeRate?: number; // Manual rate if entered
  transportationFees: number;
  transportationFeesCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB';
  customFees: number;
  customFeesCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB';
  additionalFees: number;
  additionalFeesCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB';
  total: number; // Total Landed Cost in AZN
}

export interface SellOrder {
  id: number;
  contactId: number; // Customer ID
  orderDate: string;
  warehouseId: number;
  status: 'Draft' | 'Confirmed' | 'Shipped';
  items: OrderItem[];
  vatPercent: number;
  total: number; // Total in AZN (incl. VAT)
  productMovementId?: number; // New field to link to a generated product movement
}

export interface Payment {
  id: number;
  orderId: number; // Linked order ID, 0 for manual expense
  paymentCategory?: 'products' | 'fees' | 'manual'; // New field to specify what the payment is for
  manualDescription?: string; // For manual expenses
  date: string;
  amount: number;
  method: string;
}

export interface ProductMovement {
  id: number;
  sourceWarehouseId: number;
  destWarehouseId: number;
  items: { productId: number; quantity: number }[];
  date: string;
}

export interface CurrencyRates {
  USD: number;
  EUR: number;
  RUB: number;
  AZN: number;
}

export interface Settings {
  companyName: string;
  companyLogo: string;
  theme: 'light' | 'dark';
  defaultVat: number;
  defaultMarkup: number;
  currencyRates: CurrencyRates;
}