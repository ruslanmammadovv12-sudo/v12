"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import OrderDetailsExcelExportButton from '@/components/OrderDetailsExcelExportButton';
import { t } from '@/utils/i18n';
import { SellOrder, Product, Customer, Warehouse, CurrencyRates } from '@/types';

interface SellOrderDetailsProps {
  order: SellOrder;
  customerMap: { [key: number]: Customer };
  warehouseMap: { [key: number]: Warehouse };
  productMap: { [key: number]: Product };
  currencyRates: CurrencyRates;
}

const SellOrderDetails: React.FC<SellOrderDetailsProps> = ({
  order,
  customerMap,
  warehouseMap,
  productMap,
  currencyRates,
}) => {
  return (
    <div className="grid gap-4 py-4 text-gray-800 dark:text-slate-300">
      <p><strong>{t('customer')}:</strong> {customerMap[order.contactId]?.name || 'N/A'}</p>
      <p><strong>{t('warehouse')}:</strong> {warehouseMap[order.warehouseId]?.name || 'N/A'}</p>
      <p><strong>{t('orderDate')}:</strong> {order.orderDate}</p>
      <p><strong>{t('orderStatus')}:</strong> {t(order.status.toLowerCase() as keyof typeof t)}</p>
      <p><strong>{t('vatPercent')}:</strong> {order.vatPercent}%</p>
      <h3 className="font-semibold mt-4 mb-2">{t('orderItems')}</h3>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100 dark:bg-slate-700">
            <TableHead className="p-2">{t('product')}</TableHead>
            <TableHead className="p-2">{t('qty')}</TableHead>
            <TableHead className="p-2">{t('price')}</TableHead>
            <TableHead className="p-2">{t('totalValue')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items?.map((item, index) => {
            const product = productMap[item.productId];
            const itemTotal = item.price * item.qty;
            return (
              <TableRow key={index} className="border-b dark:border-slate-600">
                <TableCell className="p-2">{product?.name || 'N/A'}</TableCell>
                <TableCell className="p-2">{item.qty}</TableCell>
                <TableCell className="p-2">{item.price?.toFixed(2)} AZN</TableCell>
                <TableCell className="p-2">{itemTotal.toFixed(2)} AZN</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-gray-100 dark:bg-slate-700 font-bold">
            <TableCell colSpan={3} className="p-2 text-right">{t('productsSubtotal')}:</TableCell>
            <TableCell className="p-2">{order.items?.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)} AZN</TableCell>
          </TableRow>
          <TableRow className="bg-gray-100 dark:bg-slate-700">
            <TableCell colSpan={3} className="p-2 text-right">VAT ({order.vatPercent}%):</TableCell>
            <TableCell className="p-2">{(order.total / (1 + order.vatPercent / 100) * (order.vatPercent / 100)).toFixed(2)} AZN</TableCell>
          </TableRow>
          <TableRow className="bg-gray-200 dark:bg-slate-600 font-bold">
            <TableCell colSpan={3} className="p-2 text-right">{t('total')}:</TableCell>
            <TableCell className="p-2 text-sky-600 dark:text-sky-400">{order.total.toFixed(2)} AZN</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <OrderDetailsExcelExportButton
        order={order}
        orderType="sell"
        productMap={productMap}
        customerMap={customerMap}
        supplierMap={{}}
        warehouseMap={warehouseMap}
        currencyRates={currencyRates}
      />
    </div>
  );
};

export default SellOrderDetails;