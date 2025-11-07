"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { t } from '@/utils/i18n';

interface ExcelImportButtonProps {
  onImport: (data: any[]) => void;
  label: string;
  description: string;
  requiredColumns: string[];
}

const ExcelImportButton: React.FC<ExcelImportButtonProps> = ({ onImport, label, description, requiredColumns }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error(t('excelImportError'), { description: t('noFileSelected') });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (!Array.isArray(json) || json.length === 0) {
          toast.error(t('excelImportError'), { description: t('emptyOrInvalidExcel') });
          return;
        }

        // Validate required columns
        const firstRow = json[0] as Record<string, any>;
        const missingColumns = requiredColumns.filter(col => !Object.keys(firstRow).includes(col));
        if (missingColumns.length > 0) {
          toast.error(t('excelImportError'), { description: `${t('missingRequiredColumns')}: ${missingColumns.join(', ')}` });
          return;
        }

        onImport(json);
        toast.success(t('excelImportSuccess'), { description: `${label} ${t('importedSuccessfully')}.` });

      } catch (error) {
        console.error("Error importing Excel:", error);
        toast.error(t('excelImportError'), { description: t('failedToParseExcel') });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{label}</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        {description}
      </p>
      <div className="flex items-center space-x-4">
        <Input
          id={`excel-import-${label.replace(/\s/g, '-')}`}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />
        <Button onClick={() => document.getElementById(`excel-import-${label.replace(/\s/g, '-')}`)?.click()} className="bg-sky-500 hover:bg-sky-600 text-white w-full"> {/* Added w-full */}
          <UploadCloud className="w-4 h-4 mr-2" />
          {t('importExcelFile')}
        </Button>
      </div>
    </div>
  );
};

export default ExcelImportButton;