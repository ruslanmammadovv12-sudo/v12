"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { t } from '@/utils/i18n';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Import new hooks
import { useModals } from '@/hooks/useModals';
import { useInventoryManagement } from '@/hooks/useInventoryManagement';
import { useCrudOperations } from '@/hooks/useCrudOperations';

// Import all data types from the new types file
import {
  Product, Supplier, Customer, Warehouse, OrderItem, PurchaseOrder, SellOrder, Payment, ProductMovement,
  CurrencyRates, Settings
} from '@/types';

// --- MOCK CURRENT DATE (for consistency with original code) ---
export const MOCK_CURRENT_DATE = new Date('2025-10-29T15:53:00');

// --- Initial Data & Defaults ---
const defaultCurrencyRates: CurrencyRates = { 'USD': 1.70, 'EUR': 2.00, 'RUB': 0.019, 'AZN': 1.00 };

// Initial data for a truly blank slate
export const initialData = {
  warehouses: [] as Warehouse[],
  products: [] as Product[],
  suppliers: [] as Supplier[],
  customers: [] as Customer[],
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
  currencyRates: defaultCurrencyRates,
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
  setNextIdForCollection: (key: keyof typeof initialData, nextId: number) => void; // New function
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

  const [products, setProducts] = useLocalStorage<Product[]>('products', initialData.products);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', initialData.suppliers);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', initialData.customers);
  const [warehouses, setWarehouses] = useLocalStorage<Warehouse[]>('warehouses', initialData.warehouses);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialData.purchaseOrders);
  const [sellOrders, setSellOrders] = useLocalStorage<SellOrder[]>('sellOrders', initialData.sellOrders);
  const [incomingPayments, setIncomingPayments] = useLocalStorage<Payment[]>('incomingPayments', initialData.incomingPayments);
  const [outgoingPayments, setOutgoingPayments] = useLocalStorage<Payment[]>('outgoingPayments', initialData.outgoingPayments);
  const [productMovements, setProductMovements] = useLocalStorage<ProductMovement[]>('productMovements', initialData.productMovements);

  const [settings, setSettings] = useLocalStorage<Settings>('settings', initialSettings);
  const [currencyRates, setCurrencyRates] = useLocalStorage<CurrencyRates>('currencyRates', defaultCurrencyRates);

  // Internal state for next IDs, managed by DataProvider
  const [nextIds, setNextIds] = useLocalStorage<{ [key: string]: number }>('nextIds', {
    products: 1, suppliers: 1, customers: 1, warehouses: 1, purchaseOrders: 1, sellOrders: 1, incomingPayments: 1, outgoingPayments: 1, productMovements: 1
  });

  // Use the new modals hook
  const {
    showAlertModal,
    showConfirmationModal,
    isConfirmationModalOpen,
    confirmationModalProps,
    closeConfirmationModal,
  } = useModals();

  // Use the new inventory management hook
  const {
    updateStockFromOrder,
    updateAverageCosts,
  } = useInventoryManagement({ products, setProducts });

  // Use the new CRUD operations hook
  const {
    getNextId,
    setNextIdForCollection,
    saveItem,
    deleteItem,
  } = useCrudOperations({
    products, setProducts,
    suppliers, setSuppliers,
    customers, setCustomers,
    warehouses, setWarehouses,
    purchaseOrders, setPurchaseOrders,
    sellOrders, setSellOrders,
    incomingPayments, setIncomingPayments,
    outgoingPayments, setOutgoingPayments,
    productMovements, setProductMovements,
    nextIds, setNextIds,
    showAlertModal, showConfirmationModal,
    updateStockFromOrder,
  });

  // --- Initialization Logic ---
  useEffect(() => {
    if (!initialized) {
      // Initialize with empty data and default settings
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
      setCurrencyRates(defaultCurrencyRates);

      // Initialize nextIds based on initial data (which are now empty, so start from 1)
      const initialNextIds: { [key: string]: number } = {};
      (Object.keys(initialData) as (keyof typeof initialData)[]).forEach(key => {
        initialNextIds[key] = 1; // Always start from 1 for empty collections
      });
      setNextIds(initialNextIds);
      setInitialized(true);
    }
  }, [initialized, setInitialized, setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders, setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements, setSettings, setCurrencyRates, setNextIds]);

  const productsWithTotalStock = useMemo(() => {
    return products.map(p => ({
      ...p,
      totalStock: Object.values(p.stock || {}).reduce((a, b) => a + b, 0),
    }));
  }, [products]);

  const value = {
    products: productsWithTotalStock, setProducts, // Provide products with totalStock
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
    saveItem, deleteItem, getNextId, setNextIdForCollection,
    updateStockFromOrder, updateAverageCosts,
    showAlertModal, showConfirmationModal,
    isConfirmationModalOpen, confirmationModalProps, closeConfirmationModal,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      {confirmationModalProps && (
        <AlertDialog open={isConfirmationModalOpen} onOpenChange={closeConfirmationModal}>
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