"use client";

import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { t } from '@/utils/i18n';
import {
  Product, Supplier, Customer, Warehouse, PurchaseOrder, SellOrder, Payment, ProductMovement,
  initialData, // initialData is still from DataContext, as it uses the types
} from '@/types'; // Import all types from types file

interface UseCrudOperationsProps {
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
  nextIds: { [key: string]: number };
  setNextIds: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  showAlertModal: (title: string, message: string) => void;
  showConfirmationModal: (title: string, message: string, onConfirm: () => void) => void;
  updateStockFromOrder: (newOrder: PurchaseOrder | SellOrder | null, oldOrder: PurchaseOrder | SellOrder | null) => void;
}

export function useCrudOperations({
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
}: UseCrudOperationsProps) {

  const getNextId = useCallback((key: keyof typeof initialData) => {
    return nextIds[key] || 1;
  }, [nextIds]);

  const setNextIdForCollection = useCallback((key: keyof typeof initialData, newNextId: number) => {
    setNextIds(prev => ({ ...prev, [key]: newNextId }));
  }, [setNextIds]);

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
      const newItemId = getNextId(key);
      updatedItems = [...currentItems, { ...item, id: newItemId }];
      setNextIdForCollection(key, newItemId + 1); // Increment next ID for this collection
    } else { // Existing item, update it
      updatedItems = currentItems.map(i => i.id === item.id ? item : i);
    }
    
    if (key === 'productMovements') {
      console.log(`[DataContext] Saving product movement. Before:`, currentItems.length, `After:`, updatedItems.length, `New item ID:`, item.id || getNextId(key));
      console.log(`[DataContext] Updated productMovements array:`, updatedItems);
    }

    setter(updatedItems);
    sonnerToast.success(t('success'), { description: `${t('detailsUpdated')}` });
  }, [products, setProducts, suppliers, setSuppliers, customers, setCustomers, warehouses, setWarehouses, purchaseOrders, setPurchaseOrders, sellOrders, setSellOrders, incomingPayments, setIncomingPayments, outgoingPayments, setOutgoingPayments, productMovements, setProductMovements, getNextId, setNextIdForCollection, showAlertModal]);

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
  }, [products, suppliers, customers, warehouses, purchaseOrders, sellOrders, incomingPayments, outgoingPayments, productMovements, showAlertModal, showConfirmationModal, setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders, setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements, updateStockFromOrder]);

  return {
    getNextId,
    setNextIdForCollection,
    saveItem,
    deleteItem,
  };
}