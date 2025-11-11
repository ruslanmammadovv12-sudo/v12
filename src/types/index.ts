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
  defaultWarehouseId?: number; // New field for default warehouse
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
  incomingPaymentId?: number; // New field to link to a generated incoming payment
}

export interface Payment {
  id: number;
  orderId: number; // Linked order ID, 0 for manual expense
  paymentCategory?: 'products' | 'transportationFees' | 'customFees' | 'additionalFees' | 'manual'; // Updated field to be more specific
  manualDescription?: string; // For manual expenses
  date: string;
  amount: number; // Amount in paymentCurrency
  paymentCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB'; // New: Currency of the payment
  paymentExchangeRate?: number; // New: Exchange rate to AZN if not AZN
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
  displayScale: number; // New: Program display scaling percentage
}

// --- Recycle Bin Types ---
export type CollectionKey = keyof Omit<typeof initialData, 'settings' | 'currencyRates'>; // Exclude settings/currencyRates from direct deletion

export interface RecycleBinItem {
  id: string; // Unique ID for the recycle bin entry
  originalId: number; // The ID of the deleted item
  collectionKey: CollectionKey; // The original collection key (e.g., 'products')
  data: any; // The actual deleted item object
  deletedAt: string; // ISO string timestamp of deletion
}