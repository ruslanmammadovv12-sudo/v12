"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { toast } from 'sonner';
import { SellOrder, Product, Customer, Warehouse, OrderItem, ProductMovement } from '@/types'; // Import types from types file

interface SellOrderItemState {
  productId: number | '';
  qty: number | string; // Allow string for intermediate input
  price: number | string; // Allow string for intermediate input
  itemTotal: number | string; // Allow string for intermediate input
  cleanProfit?: number; // New field for calculated clean profit per item
  landedCost?: number; // Added: Landed cost for the product
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
        qty: String(item.qty), // Convert to string for input
        price: String(item.price), // Convert to string for input
        itemTotal: String(item.qty * item.price), // Calculate initial itemTotal and convert to string
        landedCost: productMap[item.productId]?.averageLandedCost, // Populate landed cost
      }));
    }
    return [{ productId: '', qty: '', price: '', itemTotal: '', landedCost: undefined }]; // Initialize itemTotal as string
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  useEffect(() => {
    if (isEdit && orderId !== undefined) {
      const existingOrder = sellOrders.find(o => o.id === orderId);
      if (existingOrder) {
        setOrder(existingOrder);
        setOrderItems(existingOrder.items.map(item => ({
          productId: item.productId,
          qty: String(item.qty),
          price: String(item.price),
          itemTotal: String(item.qty * item.price),
          landedCost: productMap[item.productId]?.averageLandedCost, // Populate landed cost
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
      setOrderItems([{ productId: '', qty: '', price: '', itemTotal: '', landedCost: undefined }]);
      setIsFormInitialized(true);
    }
  }, [orderId, isEdit, sellOrders, settings.defaultVat, getNextId, isFormInitialized, productMap]); // Added productMap to dependencies

  const calculateOrderFinancials = useCallback(() => {
    let subtotal = 0;
    let totalCleanProfit = 0;
    const updatedOrderItemsWithProfit: SellOrderItemState[] = [];

    orderItems.forEach(item => {
      const itemTotalNum = parseFloat(String(item.itemTotal)) || 0;
      const qtyNum = parseFloat(String(item.qty)) || 0;
      const priceNum = parseFloat(String(item.price)) || 0;
      
      let itemCleanProfit = 0;

      if (item.productId && qtyNum > 0 && priceNum > 0) {
        subtotal += itemTotalNum;
        const product = productMap[item.productId as number];
        if (product) {
          itemCleanProfit = (priceNum - (product.averageLandedCost || 0)) * qtyNum;
        }
      }
      updatedOrderItemsWithProfit.push({ ...item, cleanProfit: itemCleanProfit });
      totalCleanProfit += itemCleanProfit;
    });

    const vatAmount = subtotal * ((order.vatPercent || 0) / 100);
    const totalWithVat = parseFloat((subtotal + vatAmount).toFixed(2));

    return {
      subtotal,
      totalVatAmount: parseFloat(vatAmount.toFixed(2)),
      totalWithVat,
      totalCleanProfit: parseFloat(totalCleanProfit.toFixed(2)),
      updatedOrderItemsWithProfit,
    };
  }, [orderItems, order.vatPercent, productMap]);

  const { subtotal, totalVatAmount, totalWithVat, totalCleanProfit, updatedOrderItemsWithProfit } = calculateOrderFinancials();

  useEffect(() => {
    setOrder(prev => ({ ...prev, total: totalWithVat }));
    setOrderItems(updatedOrderItemsWithProfit); // Update order items with calculated clean profit
  }, [totalWithVat, updatedOrderItemsWithProfit]);

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
    setOrderItems(prev => [...prev, { productId: '', qty: '', price: '', itemTotal: '', landedCost: undefined }]);
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
        const selectedProduct = productMap[value as number];
        item.landedCost = selectedProduct?.averageLandedCost; // Update landed cost when product changes
      } else if (field === 'qty') {
        item.qty = value; // Store raw string
        const qtyNum = parseFloat(value) || 0;
        const priceNum = parseFloat(String(item.price)) || 0;
        item.itemTotal = String(qtyNum * priceNum);
      } else if (field === 'price') {
        item.price = value; // Store raw string
        const qtyNum = parseFloat(String(item.qty)) || 0;
        const priceNum = parseFloat(value) || 0;
        item.itemTotal = String(qtyNum * priceNum);
      } else if (field === 'itemTotal') {
        item.itemTotal = value; // Store raw string
        const qtyNum = parseFloat(String(item.qty)) || 0;
        const itemTotalNum = parseFloat(value) || 0;
        if (qtyNum > 0) {
          item.price = String(itemTotalNum / qtyNum);
        } else {
          item.price = '0';
        }
      }
      newItems[index] = item;
      return newItems;
    });
  }, [productMap]);

  const handleGenerateProductMovement = useCallback(() => {
    const orderToSave: SellOrder = {
      ...order,
      id: order.id || getNextId('sellOrders'),
      contactId: order.contactId as number,
      warehouseId: order.warehouseId as number,
      orderDate: order.orderDate || MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      status: order.status || 'Draft',
      items: orderItems.filter(item => item.productId !== '' && parseFloat(String(item.qty)) > 0 && parseFloat(String(item.price)) >= 0).map(item => ({
        productId: item.productId as number,
        qty: parseFloat(String(item.qty)) || 0,
        price: parseFloat(String(item.price)) || 0,
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
      const qtyNum = parseFloat(String(item.qty)) || 0;
      if (!item.productId || qtyNum <= 0) {
        continue;
      }

      const product = productsCopy.find(p => p.id === item.productId);
      if (!product) {
        showAlertModal('Error', `Product with ID ${item.productId} not found.`);
        return;
      }

      const sourceStock = product.stock?.[mainWarehouse.id] || 0;
      if (sourceStock < qtyNum) {
        showAlertModal('Stock Error', `${t('notEnoughStock')} ${product.name} (${product.sku}) in ${mainWarehouse.name}. ${t('available')}: ${sourceStock}, ${t('requested')}: ${qtyNum}.`);
        return;
      }

      newMovementItems.push({ productId: item.productId as number, quantity: qtyNum });

      if (!product.stock) product.stock = {};
      product.stock[mainWarehouse.id] = sourceStock - qtyNum;
      product.stock[orderToSave.warehouseId as number] = (product.stock[orderToSave.warehouseId as number] || 0) + qtyNum;
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

    const validOrderItems = orderItems.filter(item => item.productId !== '' && parseFloat(String(item.qty)) > 0 && parseFloat(String(item.price)) >= 0);
    if (validOrderItems.length === 0) {
      showAlertModal('Validation Error', 'Please add at least one valid order item with a product, quantity, and price greater than zero.');
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
        const requestedQty = parseFloat(String(item.qty)) || 0;
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
      qty: parseFloat(String(item.qty)) || 0,
      price: parseFloat(String(item.price)) || 0, // This `item.price` will be the correct, possibly recalculated, unit price
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
    totalVatAmount, // New return value
    totalCleanProfit, // New return value
  };
};