"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { t } from '@/utils/i18n';
import { PurchaseOrder } from '@/types';

interface PurchaseOrdersTableProps {
  orders: (PurchaseOrder & {
    supplierName: string;
    warehouseName: string;
    productsSubtotalNative: number;
    totalAdditionalCostsAZN: number;
    additionalFeesDisplayString: string;
  })[];
  handleEditOrder: (id: number) => void;
  handleDeleteOrder: (id: number) => void;
  viewOrderDetails: (id: number) => void;
  sortConfig: { key: string; direction: 'ascending' | 'descending' };
  handleSortClick: (key: string) => () => void;
  getSortIndicator: (key: string) => string;
}

const PurchaseOrdersTable: React.FC<PurchaseOrdersTableProps> = ({
  orders,
  handleEditOrder,
  handleDeleteOrder,
  viewOrderDetails,
  sortConfig,
  handleSortClick,
  getSortIndicator,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100 dark:bg-slate-700">
            <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('id')}>
              {t('orderId')} {getSortIndicator('id')}
            </TableHead>
            <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('supplierName')}>
              {t('supplier')} {getSortIndicator('supplierName')}
            </TableHead>
            <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('orderDate')}>
              {t('orderDate')} {getSortIndicator('orderDate')}
            </TableHead>
            <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('warehouseName')}>
              {t('warehouse')} {getSortIndicator('warehouseName')}
            </TableHead>
            <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('status')}>
              {t('status')} {getSortIndicator('status')}
            </TableHead>
            <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('productsSubtotalNative')}>
              {t('productsSubtotal')} {getSortIndicator('productsSubtotalNative')}
            </TableHead>
            <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('totalAdditionalCostsAZN')}>
              {t('additionalCosts')} {getSortIndicator('totalAdditionalCostsAZN')}
            </TableHead>
            <TableHead className="p-3">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length > 0 ? (
            orders.map(order => (
              <TableRow key={order.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                <TableCell className="p-3 font-semibold">#{order.id} ({order.supplierName})</TableCell>
                <TableCell className="p-3">{order.supplierName}</TableCell>
                <TableCell className="p-3">{order.orderDate}</TableCell>
                <TableCell className="p-3">{order.warehouseName}</TableCell>
                <TableCell className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'Received' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    order.status === 'Ordered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {t(order.status.toLowerCase() as keyof typeof t)}
                  </span>
                </TableCell>
                <TableCell className="p-3 font-bold text-sky-600 dark:text-sky-400">{order.productsSubtotalNative.toFixed(2)} {order.currency}</TableCell>
                <TableCell className="p-3 font-bold text-orange-600 dark:text-orange-400">{order.additionalFeesDisplayString}</TableCell>
                <TableCell className="p-3">
                  <Button variant="link" onClick={() => viewOrderDetails(order.id)} className="mr-2 p-0 h-auto">
                    {t('view')}
                  </Button>
                  <Button variant="link" onClick={() => handleEditOrder(order.id)} className="mr-2 p-0 h-auto">
                    {t('edit')}
                  </Button>
                  <Button variant="link" onClick={() => handleDeleteOrder(order.id)} className="text-red-500 p-0 h-auto">
                    {t('delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="p-4 text-center text-gray-500 dark:text-slate-400">
                {t('noItemsFound')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PurchaseOrdersTable;