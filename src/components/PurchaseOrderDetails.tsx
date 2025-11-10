"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import OrderDetailsExcelExportButton from '@/components/OrderDetailsExcelExportButton';
import { t } from '@/utils/i18n';
import { PurchaseOrder, Product, Supplier, Warehouse, CurrencyRates } from '@/types';

interface PurchaseOrderDetailsProps {
  order: PurchaseOrder;
  supplierMap: { [key: number]: Supplier };
  warehouseMap: { [key: number]: Warehouse };
  productMap: { [key: number]: Product };
  currencyRates: CurrencyRates;
}

const PurchaseOrderDetails: React.FC<PurchaseOrderDetailsProps> = ({
  order,
  supplierMap,
  warehouseMap,
  productMap,
  currencyRates,
}) => {
  // Recalculate for display in native currency for consistency with form
  const productsSubtotalNative = order.items?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0;
  const orderNativeToAznRate = order.currency === 'AZN' ? 1 : (order.exchangeRate || currencyRates[order.currency] || 1);

  const convertFeeToOrderNativeCurrency = (amount: number, feeCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB') => {
    if (amount === 0) return 0;
    const feeInAzn = amount * (feeCurrency === 'AZN' ? 1 : currencyRates[feeCurrency] || 1);
    return feeInAzn / orderNativeToAznRate;
  };

  let totalFeesNative = 0;
  totalFeesNative += convertFeeToOrderNativeCurrency(order.transportationFees, order.transportationFeesCurrency);
  totalFeesNative += convertFeeToOrderNativeCurrency(order.customFees, order.customFeesCurrency);
  totalFeesNative += convertFeeToOrderNativeCurrency(order.additionalFees, order.additionalFeesCurrency);

  const totalValueNative = productsSubtotalNative + totalFeesNative;

  return (
    <div className="grid gap-4 py-4 text-gray-800 dark:text-slate-300">
      <p><strong>{t('supplier')}:</strong> {supplierMap[order.contactId]?.name || 'N/A'}</p>
      <p><strong>{t('warehouse')}:</strong> {warehouseMap[order.warehouseId]?.name || 'N/A'}</p>
      <p><strong>{t('orderDate')}:</strong> {order.orderDate}</p>
      <p><strong>{t('status')}:</strong> {t(order.status.toLowerCase() as keyof typeof t)}</p>
      <p><strong>{t('orderCurrency')}:</strong> {order.currency}</p>
      {order.currency !== 'AZN' && order.exchangeRate && (
        <p><strong>{t('exchangeRateToAZN')}:</strong> {order.exchangeRate}</p>
      )}
      <h3 className="font-semibold mt-4 mb-2">{t('orderItems')}</h3>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100 dark:bg-slate-700">
            <TableHead className="p-2">{t('product')}</TableHead>
            <TableHead className="p-2">{t('qty')}</TableHead>
            <TableHead className="p-2">{t('price')}</TableHead>
            <TableHead className="p-2">{t('landedCostPerUnit')}</TableHead>
            <TableHead className="p-2">{t('totalValue')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items?.map((item, index) => {
            const product = productMap[item.productId];
            const itemTotalLandedAZN = (item.landedCostPerUnit || 0) * item.qty;
            return (
              <TableRow key={index} className="border-b dark:border-slate-600">
                <TableCell className="p-2">{product?.name || 'N/A'}</TableCell>
                <TableCell className="p-2">{item.qty}</TableCell>
                <TableCell className="p-2">{item.price?.toFixed(2)} {item.currency || order.currency}</TableCell>
                <TableCell className="p-2">{item.landedCostPerUnit?.toFixed(2)} AZN</TableCell>
                <TableCell className="p-2">{itemTotalLandedAZN.toFixed(2)} AZN}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-gray-100 dark:bg-slate-700 font-bold">
            <TableCell colSpan={4} className="p-2 text-right">{t('productsSubtotal')} ({order.currency}):</TableCell>
            <TableCell className="p-2">{productsSubtotalNative.toFixed(2)} {order.currency}</TableCell>
          </TableRow>
          <TableRow className="bg-gray-100 dark:bg-slate-700">
            <TableCell colSpan={4} className="p-2 text-right">{t('transportationFees')} ({order.transportationFeesCurrency}):</TableCell>
            <TableCell className="p-2">{order.transportationFees.toFixed(2)} {order.transportationFeesCurrency}</TableCell>
          </TableRow>
          <TableRow className="bg-gray-100 dark:bg-slate-700">
            <TableCell colSpan={4} className="p-2 text-right">{t('customFees')} ({order.customFeesCurrency}):</TableCell>
            <TableCell className="p-2">{order.customFees.toFixed(2)} {order.customFeesCurrency}</TableCell>
          </TableRow>
          <TableRow className="bg-gray-100 dark:bg-slate-700">
            <TableCell colSpan={4} className="p-2 text-right">{t('additionalFees')} ({order.additionalFeesCurrency}):</TableCell>
            <TableCell className="p-2">{order.additionalFees.toFixed(2)} {order.additionalFeesCurrency}</TableCell>
          </TableRow>
          <TableRow className="bg-gray-200 dark:bg-slate-600 font-bold">
            <TableCell colSpan={4} className="p-2 text-right">{t('total')} ({order.currency}):</TableCell>
            <TableCell className="p-2 text-sky-600 dark:text-sky-400">{totalValueNative.toFixed(2)} {order.currency}</TableCell>
          </TableRow>
          <TableRow className="bg-gray-200 dark:bg-slate-600 font-bold">
            <TableCell colSpan={4} className="p-2 text-right">{t('totalLandedCost')} (AZN):</TableCell>
            <TableCell className="p-2 text-sky-600 dark:text-sky-400">{order.total.toFixed(2)} AZN</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <OrderDetailsExcelExportButton
        order={order}
        orderType="purchase"
        productMap={productMap}
        customerMap={{}} // Not needed for PO
        supplierMap={supplierMap}
        warehouseMap={warehouseMap}
        currencyRates={currencyRates}
      />
    </div>
  );
};

export default PurchaseOrderDetails;