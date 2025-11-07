"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData, SellOrder, Product, Customer, Warehouse, OrderItem, ProductMovement, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { toast } from 'sonner';

interface SellOrderItemState {
  productId: number | '';
  qty: number;
  price: number;
  itemTotal: number; // Added itemTotal
}

interface UseSellOrderFormProps {
  orderId?: number;
  onSuccess: () => void;
}

export const useSellOrderForm = ({ orderId, onSuccess }: UseSellOrderFormProps) => {
  const {
    sellOrders,
    customers,
    warehouses,
    products,
    settings,
    saveItem,
    updateStockFromOrder,
    showAlertModal,
    setProducts,
    getNextId,
  } = useData();

  const isEdit = orderId !== undefined;

  const customerMap = useMemo(() => customers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as { [key: number]: Customer }), [customers]);
  const productMap = useMemo(() => products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product }), [products]);
  const warehouseMap = useMemo(() => warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as { [key: number]: Warehouse }), [warehouses]);
  const mainWarehouse = useMemo(() => warehouses.find(w => w.type === 'Main'), [warehouses]);

  const [order, setOrder] = useState<Partial<SellOrder>>(() => {
    if (isEdit && orderId !== undefined) {
      const existingOrder = sellOrders.find(o => o.id === orderId);
      if (existingOrder) return existingOrder;
    }
    return {
      id: getNextId('sellOrders'),
      orderDate: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      status: 'Draft',
      vatPercent: settings.defaultVat,
      total: 0,
    };
  });

  const [orderItems, setOrderItems] = useState<SellOrderItemState[]>(() => {
    if (isEdit && orderId !== undefined) {
      const existingOrder = sellOrders.find(o => o.id === orderId);
      if (existingOrder) return existingOrder.items.map(item => ({
        productId: item.productId,
        qty: item.qty,
        price: item.price,
        itemTotal: item.qty * item.price, // Calculate initial itemTotal
      }));
    }
    return [{ productId: '', qty: 1, price: 0, itemTotal: 0 }]; // Initialize itemTotal
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  useEffect(() => {
    if (isEdit && orderId !== undefined) {
      const existingOrder = sellOrders.find(o => o.id === orderId);
      if (existingOrder) {
        setOrder(existingOrder);
        setOrderItems(existingOrder.items.map(item => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          itemTotal: item.qty * item.price, // Calculate initial itemTotal
        })));
        setIsFormInitialized(true);
      }
    } else if (!isEdit && !isFormInitialized) {
      setOrder({
        id: getNextId('sellOrders'),
        orderDate: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
        status: 'Draft',
        vatPercent: settings.defaultVat,
        total: 0,
      });
      setOrderItems([{ productId: '', qty: 1, price: 0, itemTotal: 0 }]); // Initialize itemTotal
      setIsFormInitialized(true);
    }
  }, [orderId, isEdit, sellOrders, settings.defaultVat, getNextId, isFormInitialized]);

  const calculateTotalOrderValue = useCallback(() => {
    let subtotal = 0;
    orderItems.forEach(item => {
      if (item.productId && item.qty > 0 && item.itemTotal > 0) { // Use itemTotal
        subtotal += item.itemTotal; // Sum itemTotal
      }
    });
    const vatAmount = subtotal * ((order.vatPercent || 0) / 100);
    return parseFloat((subtotal + vatAmount).toFixed(2));
  }, [orderItems, order.vatPercent]); // Dependency on orderItems (which includes itemTotal)

  useEffect(() => {
    const total = calculateTotalOrderValue();
    setOrder(prev => ({ ...prev, total }));
  }, [orderItems.map(i => `${i.productId}-${i.qty}-${i.price}-${i.itemTotal}`).join(','), order.vatPercent, calculateTotalOrderValue]); // Dependency on itemTotal for recalculation

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setOrder(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleNumericChange = useCallback((id: keyof SellOrder, value: string) => {
    setOrder(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  }, []);

  const handleSelectChange = useCallback((id: keyof SellOrder, value: string) => {
    setOrder(prev => ({ ...prev, [id]: value }));
  }, []);

  const addOrderItem = useCallback(() => {
    setOrderItems(prev => [...prev, { productId: '', qty: 1, price: 0, itemTotal: 0 }]); // Initialize itemTotal
  }, []);

  const removeOrderItem = useCallback((index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleOrderItemChange = useCallback((index: number, field: keyof SellOrderItemState, value: any) => {
    setOrderItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index] };

      if (field === 'productId') {
        item.productId = value;
      } else if (field === 'qty') {
        const newQty = parseInt(value) || 0;
        item.qty = newQty < 1 ? 1 : newQty;
        item.itemTotal = item.qty * item.price; // Recalculate itemTotal
      } else if (field === 'price') {
        const newPrice = parseFloat(value) || 0;
        item.price = newPrice < 0 ? 0 : newPrice;
        item.itemTotal = item.qty * item.price; // Recalculate itemTotal
      } else if (field === 'itemTotal') { // New logic for itemTotal
        const newItemTotal = parseFloat(value) || 0;
        item.itemTotal = newItemTotal < 0 ? 0 : newItemTotal;
        if (item.qty > 0) {
          item.price = newItemTotal / item.qty; // Recalculate price
        } else {
          item.price = 0; // If qty is 0, price is 0
        }
      }
      newItems[index] = item;
      return newItems;
    });
  }, []);

  const handleGenerateProductMovement = useCallback(() => {
    const orderToSave: SellOrder = {
      ...order,
      id: order.id || getNextId('sellOrders'),
      contactId: order.contactId as number,
      warehouseId: order.warehouseId as number,
      orderDate: order.orderDate || MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      status: order.status || 'Draft',
      items: orderItems.filter(item => item.productId !== '' && item.qty > 0 && item.price >= 0).map(item => ({
        productId: item.productId as number,
        qty: item.qty,
        price: item.price,
      })),
      vatPercent: order.vatPercent || 0,
      total: order.total || 0,
    };

    if (!orderToSave.contactId || !orderToSave.warehouseId || !orderToSave.orderDate) {
      showAlertModal('Validation Error', 'Customer, Warehouse, and Order Date are required before generating a product movement.');
      return;
    }
    if (orderToSave.items.length === 0) {
      showAlertModal('Validation Error', 'Please add at least one valid order item with a product, quantity, and price before generating a product movement.');
      return;
    }

    saveItem('sellOrders', orderToSave);
    setOrder(orderToSave);

    if (orderToSave.productMovementId) {
      showAlertModal('Info', t('productMovementAlreadyGenerated'));
      return;
    }
    if (!mainWarehouse) {
      showAlertModal('Error', t('mainWarehouseNotFound'));
      return;
    }
    if (!orderToSave.warehouseId) {
      showAlertModal('Validation Error', t('selectDestinationWarehouse'));
      return;
    }
    if (mainWarehouse.id === orderToSave.warehouseId) {
      showAlertModal('Info', t('movementNotNeeded'));
      return;
    }

    const newMovementItems: { productId: number; quantity: number }[] = [];
    const productsCopy: Product[] = JSON.parse(JSON.stringify(products));

    for (const item of orderItems) {
      if (!item.productId || item.qty <= 0) {
        continue;
      }

      const product = productsCopy.find(p => p.id === item.productId);
      if (!product) {
        showAlertModal('Error', `Product with ID ${item.productId} not found.`);
        return;
      }

      const sourceStock = product.stock?.[mainWarehouse.id] || 0;
      if (sourceStock < item.qty) {
        showAlertModal('Stock Error', `${t('notEnoughStock')} ${product.name} (${product.sku}) in ${mainWarehouse.name}. ${t('available')}: ${sourceStock}, ${t('requested')}: ${item.qty}.`);
        return;
      }

      newMovementItems.push({ productId: item.productId as number, quantity: item.qty });

      if (!product.stock) product.stock = {};
      product.stock[mainWarehouse.id] = sourceStock - item.qty;
      product.stock[orderToSave.warehouseId as number] = (product.stock[orderToSave.warehouseId as number] || 0) + item.qty;
    }

    if (newMovementItems.length === 0) {
      showAlertModal('Info', t('noValidProductsForMovement'));
      return;
    }

    setProducts(productsCopy);

    const newMovementId = getNextId('productMovements');
    const newMovement: ProductMovement = {
      id: newMovementId,
      sourceWarehouseId: mainWarehouse.id,
      destWarehouseId: orderToSave.warehouseId as number,
      items: newMovementItems,
      date: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
    };

    saveItem('productMovements', newMovement);
    
    setOrder(prev => {
      const updatedOrder = { ...prev, productMovementId: newMovementId };
      saveItem('sellOrders', updatedOrder);
      return updatedOrder;
    });

    toast.success(t('success'), { description: `Product Movement #${newMovementId} generated successfully from ${mainWarehouse.name} to ${warehouseMap[orderToSave.warehouseId as number]?.name}.` });

  }, [order, orderItems, products, mainWarehouse, showAlertModal, setProducts, getNextId, saveItem, warehouseMap, sellOrders]);


  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!order.contactId || !order.warehouseId || !order.orderDate) {
      showAlertModal('Validation Error', 'Customer, Warehouse, and Order Date are required.');
      return;
    }

    const validOrderItems = orderItems.filter(item => item.productId !== '' && item.qty > 0 && item.price >= 0);
    if (validOrderItems.length === 0) {
      showAlertModal('Validation Error', 'Please add at least one valid order item with a product, quantity, and price.');
      return;
    }

    if (order.status === 'Shipped') {
      const productsInWarehouses: { [warehouseId: number]: { [productId: number]: number } } = {};
      products.forEach(p => {
        if (p.stock) {
          for (const warehouseId in p.stock) {
            if (!productsInWarehouses[parseInt(warehouseId)]) {
              productsInWarehouses[parseInt(warehouseId)] = {};
            }
            productsInWarehouses[parseInt(warehouseId)][p.id] = p.stock[parseInt(warehouseId)];
          }
        }
      });

      const currentOrderItems = isEdit ? sellOrders.find(o => o.id === orderId)?.items || [] : [];
      const currentOrderWarehouseId = isEdit ? sellOrders.find(o => o.id === orderId)?.warehouseId : undefined;

      for (const item of validOrderItems) {
        const productId = item.productId as number;
        const requestedQty = item.qty;
        const warehouseId = order.warehouseId as number;

        let availableStock = productsInWarehouses[warehouseId]?.[productId] || 0;

        if (isEdit && currentOrderWarehouseId === warehouseId) {
          const oldItem = currentOrderItems.find(old => old.productId === productId);
          if (oldItem) {
            availableStock += oldItem.qty;
          }
        }

        if (availableStock < requestedQty) {
          const productName = productMap[productId]?.name || 'Unknown Product';
          showAlertModal('Stock Error', `${t('notEnoughStock')} ${productName}. ${t('available')}: ${availableStock}, ${t('requested')}: ${requestedQty}.`);
          return;
        }
      }
    }

    const finalOrderItems: OrderItem[] = validOrderItems.map(item => ({
      productId: item.productId as number,
      qty: item.qty,
      price: item.price, // This `item.price` will be the correct, possibly recalculated, unit price
    }));

    const orderToSave: SellOrder = {
      ...order,
      id: order.id || getNextId('sellOrders'),
      contactId: order.contactId as number,
      warehouseId: order.warehouseId as number,
      orderDate: order.orderDate || MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      status: order.status || 'Draft',
      items: finalOrderItems,
      vatPercent: order.vatPercent || 0,
      total: order.total || 0,
    };

    const oldOrder = isEdit ? sellOrders.find(o => o.id === orderToSave.id) : null;

    saveItem('sellOrders', orderToSave);
    updateStockFromOrder(orderToSave, oldOrder);
    onSuccess();
    toast.success(t('success'), { description: `Sell Order #${orderToSave.id || 'new'} saved successfully.` });
  }, [order, orderItems, products, isEdit, orderId, sellOrders, showAlertModal, productMap, getNextId, saveItem, updateStockFromOrder, onSuccess]);

  const isGenerateMovementDisabled = !!order.productMovementId;

  return {
    order,
    setOrder,
    orderItems,
    setOrderItems,
    customerMap,
    productMap,
    warehouseMap,
    mainWarehouse,
    isGenerateMovementDisabled,
    handleChange,
    handleNumericChange,
    handleSelectChange,
    addOrderItem,
    removeOrderItem,
    handleOrderItemChange,
    handleGenerateProductMovement,
    handleSubmit,
    showAlertModal,
    products,
    customers,
    warehouses,
  };
};