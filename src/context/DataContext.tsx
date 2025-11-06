"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { t, getKeyAsPageId } from '@/utils/i18n';
import { toast as sonnerToast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// --- MOCK CURRENT DATE (for consistency with original code) ---
export const MOCK_CURRENT_DATE = new Date('2025-10-29T15:53:00');

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

// --- Initial Data & Defaults ---
const initialCurrencyRates: CurrencyRates = { 'USD': 1.70, 'EUR': 2.00, 'RUB': 0.019, 'AZN': 1.00 };

const initialData = {
  warehouses: [
    { id: 1, name: 'Main Warehouse', location: 'Baku, Azerbaijan', type: 'Main' },
    { id: 2, name: 'Secondary Hub', location: 'Ganja, Azerbaijan', type: 'Secondary' }
  ],
  products: [
    { id: 1, name: 'Laptop Pro 15"', sku: 'LP15-PRO', category: 'Electronics', description: 'High-end professional laptop', stock: { 1: 50, 2: 20 }, minStock: 10, averageLandedCost: 1200.00, imageUrl: '' },
    { id: 2, name: 'Wireless Mouse', sku: 'WM-001', category: 'Accessories', description: 'Ergonomic wireless mouse', stock: { 1: 150, 2: 75 }, minStock: 25, averageLandedCost: 8.50, imageUrl: '' },
    { id: 3, name: 'Mechanical Keyboard', sku: 'MK-ELITE', category: 'Accessories', description: 'Gaming mechanical keyboard', stock: { 1: 80, 2: 30 }, minStock: 15, averageLandedCost: 45.00, imageUrl: '' }
  ],
  suppliers: [{ id: 1, name: 'Tech Supplies Inc.', contact: 'John Doe', email: 'john@techsupplies.com', phone: '+1234567890', address: '123 Tech Road' }],
  customers: [{ id: 1, name: 'Global Innovations Ltd.', contact: 'Jane Smith', email: 'jane@globalinnovations.com', phone: '+9876543210', address: '456 Business Ave' }],
  purchaseOrders: [] as PurchaseOrder[],
  sellOrders: [] as SellOrder[],
  incomingPayments: [] as Payment[],
  outgoingPayments: [] as Payment[],
  productMovements: [] as ProductMovement[],
};

const initialSettings: Settings = {
  companyName: '',
  companyLogo: '',
  theme: 'light',
  defaultVat: 18,
  defaultMarkup: 70,
  currencyRates: initialCurrencyRates,
};

// --- Context Definition ---
interface DataContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  warehouses: Warehouse[];
  setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  sellOrders: SellOrder[];
  setSellOrders: React.Dispatch<React.SetStateAction<SellOrder[]>>;
  incomingPayments: Payment[];
  setIncomingPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  outgoingPayments: Payment[];
  setOutgoingPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  productMovements: ProductMovement[];
  setProductMovements: React.Dispatch<React.SetStateAction<ProductMovement[]>>;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  currencyRates: CurrencyRates;
  setCurrencyRates: React.Dispatch<React.SetStateAction<CurrencyRates>>;
  
  // CRUD operations
  saveItem: (key: keyof typeof initialData, item: any) => void;
  deleteItem: (key: keyof typeof initialData, id: number) => void;
  getNextId: (key: keyof typeof initialData) => number;
  updateStockFromOrder: (newOrder: PurchaseOrder | SellOrder | null, oldOrder: PurchaseOrder | SellOrder | null) => void;
  updateAverageCosts: (purchaseOrder: PurchaseOrder) => void;

  // Modals
  showAlertModal: (title: string, message: string) => void;
  showConfirmationModal: (title: string, message: string, onConfirm: () => void) => void;
  isConfirmationModalOpen: boolean;
  confirmationModalProps: { title: string; message: string; onConfirm: () => void } | null;
  closeConfirmationModal: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialized, setInitialized] = useLocalStorage<boolean>('initialized', false);

  const [products, setProducts] = useLocalStorage<Product[]>('products', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', []);
  const [warehouses, setWarehouses] = useLocalStorage<Warehouse[]>('warehouses', []);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', []);
  const [sellOrders, setSellOrders] = useLocalStorage<SellOrder[]>('sellOrders', []);
  const [incomingPayments, setIncomingPayments] = useLocalStorage<Payment[]>('incomingPayments', []);
  const [outgoingPayments, setOutgoingPayments] = useLocalStorage<Payment[]>('outgoingPayments', []);
  const [productMovements, setProductMovements] = useLocalStorage<ProductMovement[]>('productMovements', []);

  const [settings, setSettings] = useLocalStorage<Settings>('settings', initialSettings);
  const [currencyRates, setCurrencyRates] = useLocalStorage<CurrencyRates>('currencyRates', initialCurrencyRates);

  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // --- Initialization Logic ---
  useEffect(() => {
    if (!initialized) {
      // Initialize with dummy data if not already done
      setWarehouses(initialData.warehouses);
      setProducts(initialData.products);
      setSuppliers(initialData.suppliers);
      setCustomers(initialData.customers);
      setPurchaseOrders(initialData.purchaseOrders);
      setSellOrders(initialData.sellOrders);
      setIncomingPayments(initialData.incomingPayments);
      setOutgoingPayments(initialData.outgoingPayments);
      setProductMovements(initialData.productMovements);
      setSettings(initialSettings);
      setCurrencyRates(initialCurrencyRates);
      setInitialized(true);
    }
  }, [initialized, setInitialized, setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders, setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements, setSettings, setCurrencyRates]);

  // --- Utility Functions ---
  const getNextId = useCallback((key: keyof typeof initialData) => {
    const items = {
      products, suppliers, customers, warehouses, purchaseOrders, sellOrders, incomingPayments, outgoingPayments, productMovements
    }[key];
    if (!Array.isArray(items)) return 1;
    return items.length > 0 ? Math.max(...items.map((i: any) => i.id)) + 1 : 1;
  }, [products, suppliers, customers, warehouses, purchaseOrders, sellOrders, incomingPayments, outgoingPayments, productMovements]);

  const showAlertModal = useCallback((title: string, message: string) => {
    sonnerToast.info(message, {
      duration: 5000,
      action: {
        label: 'OK',
        onClick: () => sonnerToast.dismiss(),
      },
      description: title,
    });
  }, []);

  const showConfirmationModal = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmationModalProps({ title, message, onConfirm });
    setIsConfirmationModalOpen(true);
  }, []);

  const closeConfirmationModal = useCallback(() => {
    setIsConfirmationModalOpen(false);
    setConfirmationModalProps(null);
  }, []);

  // --- CRUD Operations ---
  const saveItem = useCallback((key: keyof typeof initialData, item: any) => {
    let currentItems: any[] = [];
    let setter: React.Dispatch<React.SetStateAction<any[]>>;

    switch (key) {
      case 'products': currentItems = products; setter = setProducts; break;
      case 'suppliers': currentItems = suppliers; setter = setSuppliers; break;
      case 'customers': currentItems = customers; setter = setCustomers; break;
      case 'warehouses': currentItems = warehouses; setter = setWarehouses; break;
      case 'purchaseOrders': currentItems = purchaseOrders; setter = setPurchaseOrders; break;
      case 'sellOrders': currentItems = sellOrders; setter = setSellOrders; break;
      case 'incomingPayments': currentItems = incomingPayments; setter = setIncomingPayments; break;
      case 'outgoingPayments': currentItems = outgoingPayments; setter = setOutgoingPayments; break;
      case 'productMovements': currentItems = productMovements; setter = setProductMovements; break;
      default: return;
    }

    // Specific validation for warehouses
    if (key === 'warehouses' && item.type === 'Main') {
      const existingMainWarehouse = currentItems.find((w: Warehouse) => w.type === 'Main' && w.id !== item.id);
      if (existingMainWarehouse) {
        showAlertModal(t('validationError'), t('onlyOneMainWarehouse'));
        return;
      }
    }

    let updatedItems;
    const existingItemIndex = currentItems.findIndex(i => i.id === item.id);

    if (item.id === 0 || existingItemIndex === -1) { // New item (either id is 0 or id doesn't exist in currentItems)
      const newItemId = item.id === 0 ? getNextId(key) : item.id; // Use existing ID if provided, else generate new
      updatedItems = [...currentItems, { ...item, id: newItemId }];
    } else { // Existing item, update it
      updatedItems = currentItems.map(i => i.id === item.id ? item : i);
    }
    
    if (key === 'productMovements') {
      console.log(`[DataContext] Saving product movement. Before:`, currentItems.length, `After:`, updatedItems.length, `New item ID:`, item.id || getNextId(key));
      console.log(`[DataContext] Updated productMovements array:`, updatedItems);
    }

    setter(updatedItems);
    sonnerToast.success(t('success'), { description: `${t('detailsUpdated')}` });
  }, [products, setProducts, suppliers, setSuppliers, customers, setCustomers, warehouses, setWarehouses, purchaseOrders, setPurchaseOrders, sellOrders, setSellOrders, incomingPayments, setIncomingPayments, outgoingPayments, setOutgoingPayments, productMovements, setProductMovements, getNextId, showAlertModal]);

  const deleteItem = useCallback((key: keyof typeof initialData, id: number) => {
    const onConfirmDelete = () => {
      let currentItems: any[] = [];
      let setter: React.Dispatch<React.SetStateAction<any[]>>;

      switch (key) {
        case 'products': currentItems = products; setter = setProducts; break;
        case 'suppliers': currentItems = suppliers; setter = setSuppliers; break;
        case 'customers': currentItems = customers; setter = setCustomers; break;
        case 'warehouses': currentItems = warehouses; setter = setWarehouses; break;
        case 'purchaseOrders': currentItems = purchaseOrders; setter = setPurchaseOrders; break;
        case 'sellOrders': currentItems = sellOrders; setter = setSellOrders; break;
        case 'incomingPayments': currentItems = incomingPayments; setter = setIncomingPayments; break;
        case 'outgoingPayments': currentItems = outgoingPayments; setter = setOutgoingPayments; break;
        case 'productMovements': currentItems = productMovements; setter = setProductMovements; break;
        default: return;
      }

      // --- Deletion validation checks ---
      if (key === 'products') {
        const hasOrders = sellOrders.some(o => o.items?.some(i => i.productId === id)) || purchaseOrders.some(o => o.items?.some(i => i.productId === id));
        if (hasOrders) { showAlertModal('Deletion Failed', 'Cannot delete this product because it is used in existing purchase or sell orders.'); return; }

        const hasMovements = productMovements.some(m => m.items?.some(i => i.productId === id));
        if (hasMovements) { showAlertModal('Deletion Failed', 'Cannot delete this product. It is used in existing product movements.'); return; }

        const productToDelete = products.find(p => p.id === id);
        if (productToDelete && productToDelete.stock && Object.values(productToDelete.stock).some(qty => qty > 0)) {
          showAlertModal('Deletion Failed', 'Cannot delete this product. There is remaining stock across warehouses.');
          return;
        }
      }
      if (key === 'warehouses') {
        const warehouseToDelete = currentItems.find((w: Warehouse) => w.id === id);
        if (warehouseToDelete && warehouseToDelete.type === 'Main') {
          showAlertModal('Deletion Failed', 'Cannot delete the Main Warehouse. Please designate another warehouse as Main first.');
          return;
        }
        if (products.some(p => p.stock && p.stock[id] && p.stock[id] > 0)) {
          showAlertModal('Deletion Failed', 'Cannot delete this warehouse because it contains stock. Please move all products first.');
          return;
        }
        const hasOrders = purchaseOrders.some(o => o.warehouseId === id) ||
                         sellOrders.some(o => o.warehouseId === id) ||
                         productMovements.some(m => m.sourceWarehouseId === id || m.destWarehouseId === id);
        if (hasOrders) { showAlertModal('Deletion Failed', 'Cannot delete this warehouse. It is used in existing orders or movements.'); return; }
      }
      if (key === 'suppliers' || key === 'customers') {
        const orderKey = key === 'suppliers' ? purchaseOrders : sellOrders;
        if (orderKey.some(o => o.contactId === id)) { showAlertModal('Deletion Failed', `Cannot delete this ${key.slice(0, -1)} because they are linked to existing orders.`); return; }
      }

      // Reverse stock change if deleting a completed order/movement
      if (key === 'purchaseOrders' || key === 'sellOrders') {
        const orderToDelete = currentItems.find(o => o.id === id);
        if (orderToDelete) updateStockFromOrder(null, orderToDelete);
      } else if (key === 'productMovements') {
        const movementToDelete = currentItems.find(m => m.id === id);
        if (movementToDelete) {
          // Find the linked sell order and clear its productMovementId
          setSellOrders(prevSellOrders => prevSellOrders.map(so => 
            so.productMovementId === movementToDelete.id 
              ? { ...so, productMovementId: undefined } 
              : so
          ));

          const updatedProducts = products.map(p => {
            if (p.stock && movementToDelete.items?.some(item => item.productId === p.id)) {
              const newP = { ...p, stock: { ...p.stock } };
              movementToDelete.items.forEach(item => {
                if (item.productId === p.id) {
                  newP.stock[movementToDelete.sourceWarehouseId] = (newP.stock[movementToDelete.sourceWarehouseId] || 0) + item.quantity;
                  newP.stock[movementToDelete.destWarehouseId] = (newP.stock[movementToDelete.destWarehouseId] || 0) - item.quantity;
                }
              });
              return newP;
            }
            return p;
          });
          setProducts(updatedProducts);
        }
      }

      setter(currentItems.filter(i => i.id !== id));
      sonnerToast.success(t('success'), { description: `Item deleted successfully.` });
    };
    showConfirmationModal(t('confirmation'), t('areYouSure'), onConfirmDelete);
  }, [products, suppliers, customers, warehouses, purchaseOrders, sellOrders, incomingPayments, outgoingPayments, productMovements, showAlertModal, showConfirmationModal, setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders, setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements]);

  const updateStockFromOrder = useCallback((newOrder: PurchaseOrder | SellOrder | null, oldOrder: PurchaseOrder | SellOrder | null) => {
    setProducts(prevProducts => {
      const updatedProducts = JSON.parse(JSON.stringify(prevProducts)); // Deep copy
      if (!newOrder && !oldOrder) return prevProducts;

      const isSell = newOrder ? 'vatPercent' in newOrder : (oldOrder ? 'vatPercent' in oldOrder : false);
      const statusCompleted = isSell ? 'Shipped' : 'Received';

      // --- 1. Reverse old stock change if the status was previously completed ---
      if (oldOrder && oldOrder.status === statusCompleted) {
        (oldOrder.items || []).forEach(item => {
          const p = updatedProducts.find((prod: Product) => prod.id === item.productId);
          if (p) {
            if (!p.stock) p.stock = {};
            p.stock[oldOrder.warehouseId] = (p.stock[oldOrder.warehouseId] || 0) + (isSell ? item.qty : -item.qty);
            if (p.stock[oldOrder.warehouseId] < 0) p.stock[oldOrder.warehouseId] = 0;
          }
        });
      }

      // --- 2. Apply new stock change if status is now completed ---
      if (newOrder && newOrder.status === statusCompleted) {
        (newOrder.items || []).forEach(item => {
          const p = updatedProducts.find((prod: Product) => prod.id === item.productId);
          if (p) {
            if (!p.stock) p.stock = {};
            p.stock[newOrder.warehouseId] = (p.stock[newOrder.warehouseId] || 0) - (isSell ? item.qty : -item.qty);
            if (p.stock[newOrder.warehouseId] < 0) p.stock[newOrder.warehouseId] = 0;
          }
        });
      }
      return updatedProducts;
    });
  }, [setProducts]);

  const updateAverageCosts = useCallback((purchaseOrder: PurchaseOrder) => {
    setProducts(prevProducts => {
      const updatedProducts = JSON.parse(JSON.stringify(prevProducts));
      (purchaseOrder.items || []).forEach(item => {
        const product = updatedProducts.find((p: Product) => p.id === item.productId);
        if (product) {
          const landedCostInAZN = item.landedCostPerUnit || 0;
          if (landedCostInAZN <= 0) return;

          const totalStock = Object.values(product.stock || {}).reduce((a, b) => a + b, 0);
          const stockBeforeThisOrder = totalStock - item.qty;

          if (stockBeforeThisOrder > 0 && (product.averageLandedCost || 0) > 0) {
            const oldTotalValue = stockBeforeThisOrder * product.averageLandedCost;
            const newItemsValue = item.qty * landedCostInAZN;
            if (totalStock > 0) {
              product.averageLandedCost = parseFloat(((oldTotalValue + newItemsValue) / totalStock).toFixed(4));
            } else {
              product.averageLandedCost = landedCostInAZN;
            }
          } else {
            product.averageLandedCost = landedCostInAZN;
          }
        }
      });
      return updatedProducts;
    });
  }, [setProducts]);

  const value = {
    products, setProducts,
    suppliers, setSuppliers,
    customers, setCustomers,
    warehouses, setWarehouses,
    purchaseOrders, setPurchaseOrders,
    sellOrders, setSellOrders,
    incomingPayments, setIncomingPayments,
    outgoingPayments, setOutgoingPayments,
    productMovements, setProductMovements,
    settings, setSettings,
    currencyRates, setCurrencyRates,
    saveItem, deleteItem, getNextId,
    updateStockFromOrder, updateAverageCosts,
    showAlertModal, showConfirmationModal,
    isConfirmationModalOpen, confirmationModalProps, closeConfirmationModal,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      {confirmationModalProps && (
        <AlertDialog open={isConfirmationModalOpen} onOpenChange={setIsConfirmationModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmationModalProps.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmationModalProps.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeConfirmationModal}>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { confirmationModalProps.onConfirm(); closeConfirmationModal(); }}>
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};