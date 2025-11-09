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
  CurrencyRates, Settings, RecycleBinItem, CollectionKey
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
  displayScale: 100, // New: Default display scale
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
  
  // Recycle Bin
  recycleBin: RecycleBinItem[];
  setRecycleBin: React.Dispatch<React.SetStateAction<RecycleBinItem[]>>;
  addToRecycleBin: (item: any, collectionKey: CollectionKey) => void;
  restoreFromRecycleBin: (recycleItemId: string) => void;
  deletePermanentlyFromRecycleBin: (recycleItemId: string) => void;
  cleanRecycleBin: () => void;

  // CRUD operations
  saveItem: (key: CollectionKey, item: any) => void;
  deleteItem: (key: CollectionKey, id: number) => void;
  getNextId: (key: CollectionKey) => number;
  setNextIdForCollection: (key: CollectionKey, nextId: number) => void; // New function
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
  const [recycleBin, setRecycleBin] = useLocalStorage<RecycleBinItem[]>('recycleBin', []);

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

  // --- Recycle Bin Operations ---
  const addToRecycleBin = useCallback((item: any, collectionKey: CollectionKey) => {
    const recycleItemId = `${collectionKey}-${item.id}-${Date.now()}`;
    const newItem: RecycleBinItem = {
      id: recycleItemId,
      originalId: item.id,
      collectionKey,
      data: item,
      deletedAt: MOCK_CURRENT_DATE.toISOString(),
    };
    setRecycleBin(prev => [...prev, newItem]);
    showAlertModal(t('success'), t('itemMovedToRecycleBin'));
  }, [setRecycleBin, showAlertModal]);

  const restoreFromRecycleBin = useCallback((recycleItemId: string) => {
    setRecycleBin(prevRecycleBin => {
      const itemToRestore = prevRecycleBin.find(item => item.id === recycleItemId);
      if (!itemToRestore) {
        showAlertModal(t('error'), t('itemNotFoundInRecycleBin'));
        return prevRecycleBin;
      }

      const { collectionKey, data } = itemToRestore;
      let setter: React.Dispatch<React.SetStateAction<any[]>>;

      switch (collectionKey) {
        case 'products': setter = setProducts; break;
        case 'suppliers': setter = setSuppliers; break;
        case 'customers': setter = setCustomers; break;
        case 'warehouses': setter = setWarehouses; break;
        case 'purchaseOrders': setter = setPurchaseOrders; break;
        case 'sellOrders': setter = setSellOrders; break;
        case 'incomingPayments': setter = setIncomingPayments; break;
        case 'outgoingPayments': setter = setOutgoingPayments; break;
        case 'productMovements': setter = setProductMovements; break;
        default:
          showAlertModal(t('error'), t('unknownCollectionType'));
          return prevRecycleBin;
      }

      setter(prevItems => {
        // Ensure the item is not duplicated if it somehow already exists
        if (prevItems.some((i: any) => i.id === data.id)) {
          showAlertModal(t('error'), t('itemAlreadyExists'));
          return prevItems;
        }
        return [...prevItems, data];
      });

      showAlertModal(t('success'), t('itemRestored'));
      return prevRecycleBin.filter(item => item.id !== recycleItemId);
    });
  }, [setRecycleBin, setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders, setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements, showAlertModal]);

  const deletePermanentlyFromRecycleBin = useCallback((recycleItemId: string) => {
    showConfirmationModal(
      t('deletePermanently'),
      t('deletePermanentlyWarning'),
      () => {
        setRecycleBin(prev => prev.filter(item => item.id !== recycleItemId));
        showAlertModal(t('success'), t('itemDeletedPermanently'));
      }
    );
  }, [setRecycleBin, showConfirmationModal, showAlertModal]);

  const cleanRecycleBin = useCallback(() => {
    showConfirmationModal(
      t('cleanRecycleBin'),
      t('cleanRecycleBinWarning'),
      () => {
        setRecycleBin([]);
        showAlertModal(t('success'), t('recycleBinCleaned'));
      }
    );
  }, [setRecycleBin, showConfirmationModal, showAlertModal]);

  // Use the new CRUD operations hook
  const {
    getNextId,
    setNextIdForCollection,
    saveItem,
    deleteItem, // This deleteItem will now call addToRecycleBin
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
    addToRecycleBin, // Pass the new function
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
      setRecycleBin([]); // Ensure recycle bin is also initialized empty

      // Initialize nextIds based on initial data (which are now empty, so start from 1)
      const initialNextIds: { [key: string]: number } = {};
      (Object.keys(initialData) as (keyof typeof initialData)[]).forEach(key => {
        initialNextIds[key] = 1; // Always start from 1 for empty collections
      });
      setNextIds(initialNextIds);
      setInitialized(true);
    }
  }, [initialized, setInitialized, setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders, setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements, setSettings, setCurrencyRates, setNextIds, setRecycleBin]);

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
    recycleBin, setRecycleBin, addToRecycleBin, restoreFromRecycleBin, deletePermanentlyFromRecycleBin, cleanRecycleBin, // Add recycle bin functions
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