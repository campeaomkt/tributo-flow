import JSZip from 'jszip';
import { FiscalInvoice, CompanySettings } from '../types';
import { generateNfseXml } from './taxCalculator';

/**
 * Downloads a single text/xml/csv file to user machine
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Creates and downloads a ZIP archive containing all invoice XML files for the accountant
 */
export async function downloadInvoicesZip(
  invoices: FiscalInvoice[],
  company: CompanySettings,
  monthLabel: string = 'fechamento_mensal'
) {
  const zip = new JSZip();
  const folder = zip.folder(`xmls_${monthLabel.replace(/\s+/g, '_').toLowerCase()}`);

  if (!folder) return;

  // Add all XMLs
  invoices.forEach((inv) => {
    const xml = generateNfseXml(inv, company);
    const fileName = `NFSe_${inv.number}_${inv.customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.xml`;
    folder.file(fileName, xml);
  });

  // Also include a CSV summary table for the accountant inside the zip!
  const csvReport = generateAccountantCsv(invoices, company, 'DOMINIO');
  folder.file(`relatorio_fiscal_${monthLabel.replace(/\s+/g, '_')}.csv`, csvReport);

  // Generate zip blob and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TributoFlow_Contabilidade_${monthLabel.replace(/\s+/g, '_')}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates formatted CSV for major Brazilian accounting software
 */
export function generateAccountantCsv(
  invoices: FiscalInvoice[],
  company: CompanySettings,
  systemFormat: 'DOMINIO' | 'CONTMATIC' | 'OMIE' | 'GENERICO' = 'DOMINIO'
): string {
  if (systemFormat === 'DOMINIO') {
    // Layout Domínio Sistemas - Importação de Notas Fiscais de Serviço Prestado
    const headers = [
      'COD_EMPRESA',
      'NUMERO_NOTA',
      'SERIE',
      'DATA_EMISSAO',
      'SITUACAO',
      'VALOR_SERVICOS',
      'BASE_CALCULO_ISS',
      'ALIQUOTA_ISS',
      'VALOR_ISS',
      'ISS_RETIDO',
      'COD_SERVICO',
      'CNAE',
      'CPF_CNPJ_TOMADOR',
      'RAZAO_SOCIAL_TOMADOR',
      'COD_VERIFICACAO',
      'REGIME_TRIBUTARIO'
    ];

    const rows = invoices.map(inv => [
      '001',
      inv.number,
      inv.series,
      inv.issuedAt.slice(0, 10),
      inv.status === 'EMITIDA' ? 'N' : inv.status === 'CANCELADA' ? 'C' : 'P',
      inv.grossAmount.toFixed(2),
      inv.grossAmount.toFixed(2),
      inv.taxes.issRate.toFixed(2),
      inv.taxes.issAmount.toFixed(2),
      'NAO',
      inv.serviceCode,
      inv.cnae,
      inv.customer.document.replace(/\D/g, ''),
      `"${inv.customer.name.replace(/"/g, '""')}"`,
      inv.verificationCode,
      company.taxRegime
    ]);

    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  }

  if (systemFormat === 'CONTMATIC') {
    const headers = [
      'CNPJ_PRESTADOR',
      'NUMERO_NF',
      'SERIE_NF',
      'DATA_FATO_GERADOR',
      'VALOR_BRUTO',
      'VALOR_LIQUIDO',
      'BASE_ISS',
      'PERC_ISS',
      'VALOR_ISS',
      'NOME_CLIENTE',
      'DOC_CLIENTE'
    ];

    const rows = invoices.map(inv => [
      company.cnpj.replace(/\D/g, ''),
      inv.number,
      inv.series,
      inv.issuedAt.slice(0, 10),
      inv.grossAmount.toFixed(2),
      inv.netAmount.toFixed(2),
      inv.grossAmount.toFixed(2),
      inv.taxes.issRate.toFixed(2),
      inv.taxes.issAmount.toFixed(2),
      `"${inv.customer.name}"`,
      inv.customer.document.replace(/\D/g, '')
    ]);

    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  }

  // Generico / Excel
  const headers = [
    'Número da Nota',
    'Data Emissão',
    'Status',
    'Plataforma',
    'Produto',
    'Cliente',
    'CPF/CNPJ',
    'Email',
    'Valor Bruto (R$)',
    'Impostos Estimados (R$)',
    'Alíquota Efetiva (%)',
    'Valor Líquido (R$)',
    'Chave de Acesso'
  ];

  const rows = invoices.map(inv => [
    inv.number,
    inv.issuedAt,
    inv.status,
    inv.platform.toUpperCase(),
    `"${inv.productName.replace(/"/g, '""')}"`,
    `"${inv.customer.name.replace(/"/g, '""')}"`,
    inv.customer.document,
    inv.customer.email,
    inv.grossAmount.toFixed(2),
    inv.taxes.totalTax.toFixed(2),
    inv.taxes.effectiveRate.toFixed(2),
    inv.netAmount.toFixed(2),
    inv.accessKey
  ]);

  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
}
