"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { t } from '@/utils/i18n';
import { Product, Customer } from '@/types'; // Import types from types file

interface ExcelExportButtonProps {
  data: any[];
  fileName: string;
  sheetName?: string;
  label: string;
  description: string;
  columns: { header: string; accessor: string }[];
}

const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  data,
  fileName,
  sheetName = 'Sheet1',
  label,
  description,
  columns,
}) => {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.info(t('excelExportInfo'), { description: t('noDataToExport') });
      return;
    }

    const formattedData = data.map(item => {
      const row: { [key: string]: any } = {};
      columns.forEach(col => {
        row[col.header] = item[col.accessor];
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast.success(t('excelExportSuccess'), { description: `${label} ${t('exportedSuccessfully')}.` });
  };

  return (
    <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{label}</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        {description}
      </p>
      <Button onClick={handleExport} className="bg-sky-500 hover:bg-sky-600 text-white w-full"> {/* Added w-full */}
        <Download className="w-4 h-4 mr-2" />
        {t('exportExcelFile')}
      </Button>
    </div>
  );
};

export default ExcelExportButton;