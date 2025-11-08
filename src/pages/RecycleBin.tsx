"use client";

import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, RotateCcw, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Product, Supplier, Customer, Warehouse, PurchaseOrder, SellOrder, Payment, ProductMovement,
} from '@/types';

const RecycleBin: React.FC = () => {
  const {
    recycleBin,
    restoreFromRecycleBin,
    deletePermanentlyFromRecycleBin,
    cleanRecycleBin,
    showConfirmationModal,
    showAlertModal,
    products, // Needed for product names in order/movement summaries
    suppliers, // Needed for supplier names in PO summaries
    customers, // Needed for customer names in SO summaries
    warehouses, // Needed for warehouse names in movements/orders
  } = useData();

  const productMap = useMemo(() => products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product }), [products]);
  const supplierMap = useMemo(() => suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as { [key: number]: Supplier }), [suppliers]);
  const customerMap = useMemo(() => customers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as { [key: number]: Customer }), [customers]);
  const warehouseMap = useMemo(() => warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as { [key: number]: Warehouse }), [warehouses]);

  const getItemSummary = (item: any, collectionKey: string): string => {
    switch (collectionKey) {
      case 'products':
        const product = item as Product;
        return `${product.name} (SKU: ${product.sku})`;
      case 'suppliers':
        const supplier = item as Supplier;
        return `${supplier.name} (Contact: ${supplier.contact})`;
      case 'customers':
        const customer = item as Customer;
        return `${customer.name} (Email: ${customer.email})`;
      case 'warehouses':
        const warehouse = item as Warehouse;
        return `${warehouse.name} (${warehouse.location})`;
      case 'purchaseOrders':
        const po = item as PurchaseOrder;
        const poSupplier = supplierMap[po.contactId]?.name || 'N/A';
        return `PO #${po.id} (${poSupplier}) - Total: ${po.total.toFixed(2)} AZN`;
      case 'sellOrders':
        const so = item as SellOrder;
        const soCustomer = customerMap[so.contactId]?.name || 'N/A';
        return `SO #${so.id} (${soCustomer}) - Total: ${so.total.toFixed(2)} AZN`;
      case 'incomingPayments':
      case 'outgoingPayments':
        const payment = item as Payment;
        const orderRef = payment.orderId === 0 ? t('manualExpense') : `${t('orderId')} #${payment.orderId}`;
        return `${t('paymentId')} #${payment.id} - ${payment.amount.toFixed(2)} ${payment.paymentCurrency} (${orderRef})`;
      case 'productMovements':
        const pm = item as ProductMovement;
        const source = warehouseMap[pm.sourceWarehouseId]?.name || 'N/A';
        const dest = warehouseMap[pm.destWarehouseId]?.name || 'N/A';
        return `${t('movement')} #${pm.id} from ${source} to ${dest}`;
      default:
        return JSON.stringify(item);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('recycleBin')}</h1>
        <Button onClick={cleanRecycleBin} variant="destructive" disabled={recycleBin.length === 0}>
          <Trash2 className="w-4 h-4 mr-2" />
          {t('cleanRecycleBin')}
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-slate-700">
              <TableHead className="p-3">{t('itemType')}</TableHead>
              <TableHead className="p-3">{t('originalId')}</TableHead>
              <TableHead className="p-3">{t('dataSummary')}</TableHead>
              <TableHead className="p-3">{t('deletedAt')}</TableHead>
              <TableHead className="p-3">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recycleBin.length > 0 ? (
              recycleBin.map(item => (
                <TableRow key={item.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                  <TableCell className="p-3 capitalize">{t(item.collectionKey)}</TableCell>
                  <TableCell className="p-3">#{item.originalId}</TableCell>
                  <TableCell className="p-3 text-sm">{getItemSummary(item.data, item.collectionKey)}</TableCell>
                  <TableCell className="p-3">{format(new Date(item.deletedAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell className="p-3 flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => restoreFromRecycleBin(item.id)}>
                      <RotateCcw className="w-4 h-4 mr-1" /> {t('restore')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deletePermanentlyFromRecycleBin(item.id)}>
                      <XCircle className="w-4 h-4 mr-1" /> {t('deletePermanently')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="p-4 text-center text-gray-500 dark:text-slate-400">
                  {t('noItemsInRecycleBin')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RecycleBin;