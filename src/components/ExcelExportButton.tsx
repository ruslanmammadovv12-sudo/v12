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
  buttonLabel: string; // Changed from 'label'
  columns: { header: string; accessor: string }[];
}

const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  data,
  fileName,
  sheetName = 'Sheet1',
  buttonLabel, // Changed from 'label'
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

    toast.success(t('excelExportSuccess'), { description: `${buttonLabel} ${t('exportedSuccessfully')}.` });
  };

  return (
    <Button onClick={handleExport} className="bg-sky-500 hover:bg-sky-600 text-white w-full">
      <Download className="w-4 h-4 mr-2" />
      {buttonLabel}
    </Button>
  );
};

export default ExcelExportButton;