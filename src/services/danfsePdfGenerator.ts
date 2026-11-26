import { jsPDF } from 'jspdf';
import { CompanySettings, FiscalInvoice } from '../types';

function extractXmlTag(xml: string | undefined, tag: string): string | undefined {
  if (!xml) return undefined;
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`));
  return match ? match[1].trim() : undefined;
}

function formatMoney(value: number): string {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDoc(doc?: string): string {
  const digits = (doc || '').replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return doc || 'Não informado';
}

function formatDateTimeBr(raw?: string): string {
  if (!raw) return '—';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}:\d{2}:\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]} ${match[4]}`;
  }
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }
  return raw;
}

function formatDateBr(raw?: string): string {
  if (!raw) return '—';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return raw;
}

/**
 * Generates a clean, print-ready A4 DANFSe (Padrão Nacional) PDF directly from the
 * official authorized NFS-e XML and invoice data — used automatically whenever
 * SERPRO's adn.nfse.gov.br/danfse endpoint returns HTTP 503 Service Unavailable.
 */
export function generateLocalDanfsePdf(invoice: FiscalInvoice, company: CompanySettings): void {
  const xml = invoice.nfseXmlNacional || '';
  const nNFSe = extractXmlTag(xml, 'nNFSe') || invoice.officialInvoiceNumber || invoice.number;
  const xLocEmi = extractXmlTag(xml, 'xLocEmi') || company.address?.city || 'Anitápolis';
  const xLocPrestacao = extractXmlTag(xml, 'xLocPrestacao') || xLocEmi;
  const xTribNac = extractXmlTag(xml, 'xTribNac');
  const dhProc = extractXmlTag(xml, 'dhProc') || invoice.authorizedAt || invoice.issuedAt;
  const dCompet = extractXmlTag(xml, 'dCompet') || (invoice.issuedAt || '').slice(0, 10);
  const cTribNac = extractXmlTag(xml, 'cTribNac') || invoice.serviceCode || company.serviceCode || '010701';
  const xDescServ = extractXmlTag(xml, 'xDescServ') || invoice.description || invoice.productName;
  const vServXml = extractXmlTag(xml, 'vServ');
  const vLiqXml = extractXmlTag(xml, 'vLiq');
  const pTotTribSnXml = extractXmlTag(xml, 'pTotTribSN');

  const grossAmount = vServXml ? parseFloat(vServXml) : invoice.grossAmount;
  const netAmount = vLiqXml ? parseFloat(vLiqXml) : invoice.grossAmount;
  const effectiveRate = pTotTribSnXml ? parseFloat(pTotTribSnXml) : (invoice.taxes?.effectiveRate ?? 0);
  const approxTaxValue = Number(((grossAmount * effectiveRate) / 100).toFixed(2));
  const chaveAcesso = invoice.chaveAcessoNacional || invoice.accessKey || '';
  const isHomolog = (invoice.environment || company.fiscalEnvironment) === 'HOMOLOGACAO';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const drawSectionHeader = (title: string) => {
    doc.setFillColor(44, 8, 83); // Deep brand purple (#2c0853)
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 2.5, y + 4.4);
    doc.setTextColor(20, 20, 30);
    y += 6.5;
  };

  // Outer institutional header box
  doc.setDrawColor(180, 188, 200);
  doc.setLineWidth(0.35);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 26, 'FD');

  // Left: Government / Padrão Nacional title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(44, 8, 83);
  doc.text('DANFSe v1.0', margin + 4, y + 7.5);
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Documento Auxiliar da NFS-e (Padrão Nacional)', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Município Emissor: ${xLocEmi} / ${company.address?.state || 'SC'}`, margin + 4, y + 18.5);
  doc.text(
    isHomolog
      ? 'AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL'
      : 'EMITIDA EM PRODUÇÃO OFICIAL — SEFIN NACIONAL (cStat 100)',
    margin + 4,
    y + 23.2
  );

  // Right: NFS-e Number Box
  const numBoxX = margin + contentWidth - 52;
  doc.setDrawColor(44, 8, 83);
  doc.setFillColor(255, 255, 255);
  doc.rect(numBoxX, y + 2.5, 49, 21, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NÚMERO DA NFS-e', numBoxX + 24.5, y + 7.2, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(44, 8, 83);
  doc.text(String(nNFSe), numBoxX + 24.5, y + 14.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`DPS Série ${invoice.series || '2'} • Nº ${invoice.rpsNumber}`, numBoxX + 24.5, y + 20.5, {
    align: 'center',
  });

  y += 29;

  // Chave de Acesso & Datas strip
  doc.setDrawColor(180, 188, 200);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 21, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CHAVE DE ACESSO DA NFS-e (50 DÍGITOS)', margin + 3, y + 4.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(chaveAcesso || 'Não informada', margin + 3, y + 9.5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 12, margin + contentWidth, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('DATA / HORA AUTORIZAÇÃO', margin + 3, y + 15.5);
  doc.text('COMPETÊNCIA', margin + 68, y + 15.5);
  doc.text('SITUAÇÃO SEFIN NACIONAL', margin + 120, y + 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatDateTimeBr(dhProc), margin + 3, y + 19.6);
  doc.text(formatDateBr(dCompet), margin + 68, y + 19.6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(invoice.status === 'CANCELADA' ? 185 : 5, invoice.status === 'CANCELADA' ? 28 : 122, invoice.status === 'CANCELADA' ? 28 : 85);
  doc.text(invoice.status === 'CANCELADA' ? 'CANCELADA' : 'AUTORIZADA OFICIALMENTE', margin + 120, y + 19.6);

  y += 24;

  // PRESTADOR DE SERVIÇOS
  drawSectionHeader('PRESTADOR DE SERVIÇOS');
  doc.setDrawColor(180, 188, 200);
  doc.rect(margin, y, contentWidth, 27, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('RAZÃO SOCIAL / NOME EMPRESARIAL', margin + 3, y + 4.5);
  doc.text('CNPJ', margin + 126, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(company.corporateName || '—', margin + 3, y + 9);
  doc.text(formatDoc(company.cnpj), margin + 126, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ENDEREÇO', margin + 3, y + 14.5);
  doc.text('REGIME TRIBUTÁRIO', margin + 126, y + 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  const fullAddr = `${company.address?.street || ''}, ${company.address?.number || ''} - ${company.address?.neighborhood || ''} - ${company.address?.city || ''}/${company.address?.state || ''} - CEP ${company.address?.zipCode || ''}`;
  doc.text(fullAddr.slice(0, 82), margin + 3, y + 18.8);
  doc.text(company.crt || 'Simples Nacional (ME / EPP)', margin + 126, y + 18.8);

  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`E-mail: ${company.email || '—'}   •   Telefone: ${company.mobile || company.phone || '—'}`, margin + 3, y + 24.2);

  y += 30;

  // TOMADOR DE SERVIÇOS
  drawSectionHeader('TOMADOR DE SERVIÇOS');
  doc.setDrawColor(180, 188, 200);
  doc.rect(margin, y, contentWidth, 20, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('NOME / RAZÃO SOCIAL', margin + 3, y + 4.5);
  doc.text('CPF / CNPJ', margin + 126, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customer?.name || 'Consumidor Final', margin + 3, y + 9);
  doc.text(formatDoc(invoice.customer?.document), margin + 126, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const customerCity =
    invoice.customer?.city && invoice.customer.city !== 'Não informado'
      ? `${invoice.customer.city}${invoice.customer.state ? ` / ${invoice.customer.state}` : ''}`
      : 'Não informado';
  doc.text(`E-mail: ${invoice.customer?.email || '—'}   •   Município: ${customerCity}`, margin + 3, y + 16);

  y += 23;

  // SERVIÇO PRESTADO
  drawSectionHeader('SERVIÇO PRESTADO');
  const descLines = doc.splitTextToSize(xDescServ, contentWidth - 6);
  const tribDescLines = xTribNac ? doc.splitTextToSize(`${cTribNac} — ${xTribNac}`, contentWidth - 6) : [];
  const servBoxHeight = Math.max(36, 20 + tribDescLines.length * 4 + descLines.length * 4.5);

  doc.setDrawColor(180, 188, 200);
  doc.rect(margin, y, contentWidth, servBoxHeight, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CÓDIGO DE TRIBUTAÇÃO NACIONAL (cTribNac)', margin + 3, y + 4.5);
  doc.text('CNAE', margin + 90, y + 4.5);
  doc.text('LOCAL DA PRESTAÇÃO', margin + 132, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cTribNac, margin + 3, y + 8.8);
  doc.text(invoice.cnae || company.cnaePrincipal || '6202-3/00', margin + 90, y + 8.8);
  doc.text(`${xLocPrestacao} / ${company.address?.state || 'SC'}`, margin + 132, y + 8.8);

  let innerY = y + 13.5;
  if (tribDescLines.length > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(tribDescLines, margin + 3, innerY);
    innerY += tribDescLines.length * 3.8 + 2;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('DISCRIMINAÇÃO DO SERVIÇO', margin + 3, innerY);
  innerY += 4.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(descLines, margin + 3, innerY);

  y += servBoxHeight + 3;

  // VALORES E TRIBUTAÇÃO
  drawSectionHeader('VALORES E TRIBUTAÇÃO');
  doc.setDrawColor(180, 188, 200);
  doc.rect(margin, y, contentWidth, 34, 'D');

  const colW = contentWidth / 4;
  const valueItems = [
    { label: 'VALOR DO SERVIÇO', value: formatMoney(grossAmount) },
    { label: 'DEDUÇÕES / DESCONTOS', value: 'R$ 0,00' },
    { label: 'ISSQN RETIDO', value: 'Não retido (DAS SN)' },
    { label: 'VALOR LÍQUIDO DA NFS-e', value: formatMoney(netAmount), bold: true },
  ];

  valueItems.forEach((item, idx) => {
    const cx = margin + idx * colW;
    if (idx > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(cx, y, cx, y + 17);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, cx + 3, y + 5.2);
    doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
    doc.setFontSize(item.bold ? 10.5 : 9);
    doc.setTextColor(item.bold ? 44 : 15, item.bold ? 8 : 23, item.bold ? 83 : 42);
    doc.text(item.value, cx + 3, y + 12.2);
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 17, margin + contentWidth, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('INFORMAÇÕES COMPLEMENTARES / LEI DA TRANSPARÊNCIA (LEI 12.741/2012)', margin + 3, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Documento emitido por ME/EPP optante pelo Simples Nacional. Valor aproximado dos tributos: ${formatMoney(approxTaxValue)} (${effectiveRate.toFixed(2)}%).`,
    margin + 3,
    y + 27
  );
  doc.text(
    'Recolhimento dos tributos federais e municipais (ISSQN) efetuado via guia mensal DAS — não gera direito a crédito fiscal de IPI.',
    margin + 3,
    y + 31.5
  );

  y += 40;

  // Verification Footer
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 16, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(44, 8, 83);
  doc.text('AUTENTICIDADE E CONSULTA PÚBLICA', margin + 3, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Consulte a autenticidade desta NFS-e no Portal Nacional da NFS-e: https://www.nfse.gov.br/ConsultaPublica',
    margin + 3,
    y + 10
  );
  doc.text(
    `Utilize a Chave de Acesso de 50 dígitos acima. XML oficial assinado e autorizado pela Sefin Nacional.`,
    margin + 3,
    y + 14
  );

  const safeNum = String(nNFSe).replace(/[^A-Za-z0-9_-]/g, '');
  doc.save(`DANFSe_${safeNum || invoice.rpsNumber}.pdf`);
}
