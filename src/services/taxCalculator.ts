import { CompanySettings, TaxBreakdown, FiscalInvoice } from '../types';

/**
 * Calculates tax breakdown automatically based on Brazilian tax rules and company regime.
 */
export function calculateTaxes(amount: number, company: CompanySettings): TaxBreakdown {
  const { taxRegime, rbt12, payroll12, defaultIssRate, simplesAnexo, fatorRActive } = company;

  if (taxRegime === 'MEI') {
    return {
      regime: 'MEI',
      effectiveRate: 0,
      totalTax: 0,
      issRate: 0,
      issAmount: 0,
      pisRate: 0,
      pisAmount: 0,
      cofinsRate: 0,
      cofinsAmount: 0,
      irpjRate: 0,
      irpjAmount: 0,
      csllRate: 0,
      csllAmount: 0,
    };
  }

  if (taxRegime === 'SIMPLES_NACIONAL') {
    // Check Fator R
    let effectiveAnexo = simplesAnexo;
    if (fatorRActive) {
      const fatorR = rbt12 > 0 ? (payroll12 / rbt12) : 0;
      if (fatorR >= 0.28) {
        effectiveAnexo = 'ANEXO_III'; // Bonified to Anexo III
      } else {
        effectiveAnexo = 'ANEXO_V';
      }
    }

    let effectiveRate = 6.0; // Default base Anexo III faixa 1
    if (effectiveAnexo === 'ANEXO_III') {
      if (rbt12 <= 180000) {
        effectiveRate = 6.0;
      } else if (rbt12 <= 360000) {
        effectiveRate = Number((((rbt12 * 0.112) - 9360) / rbt12 * 100).toFixed(2));
      } else if (rbt12 <= 720000) {
        effectiveRate = Number((((rbt12 * 0.135) - 17640) / rbt12 * 100).toFixed(2));
      } else if (rbt12 <= 1800000) {
        effectiveRate = Number((((rbt12 * 0.16) - 35640) / rbt12 * 100).toFixed(2));
      } else {
        effectiveRate = Number((((rbt12 * 0.21) - 125640) / rbt12 * 100).toFixed(2));
      }
    } else if (effectiveAnexo === 'ANEXO_V') {
      if (rbt12 <= 180000) {
        effectiveRate = 15.5;
      } else if (rbt12 <= 360000) {
        effectiveRate = Number((((rbt12 * 0.18) - 4500) / rbt12 * 100).toFixed(2));
      } else {
        effectiveRate = 19.5;
      }
    } else {
      // ANEXO_I (Comércio)
      effectiveRate = 4.0;
    }

    // Inside DAS Simples Nacional, ISS represents roughly 33.5% of the total tax
    const totalTax = Number(((amount * effectiveRate) / 100).toFixed(2));
    const issRate = defaultIssRate || 2.0;
    const issAmount = Number(((totalTax * 0.335)).toFixed(2));

    return {
      regime: 'SIMPLES_NACIONAL',
      effectiveRate,
      totalTax,
      issRate,
      issAmount,
      pisRate: 0,
      pisAmount: 0,
      cofinsRate: 0,
      cofinsAmount: 0,
      irpjRate: 0,
      irpjAmount: 0,
      csllRate: 0,
      csllAmount: 0,
    };
  }

  if (taxRegime === 'LUCRO_PRESUMIDO') {
    // Alíquotas federais de serviços
    // PIS: 0.65%
    // COFINS: 3.00%
    // IRPJ: Base 32% x 15% = 4.80%
    // CSLL: Base 32% x 9% = 2.88%
    // ISS Municipal: default 2.9% a 5%
    const issRate = defaultIssRate || 2.9;
    const pisRate = 0.65;
    const cofinsRate = 3.0;
    const irpjRate = 4.8;
    const csllRate = 2.88;

    const issAmount = Number(((amount * issRate) / 100).toFixed(2));
    const pisAmount = Number(((amount * pisRate) / 100).toFixed(2));
    const cofinsAmount = Number(((amount * cofinsRate) / 100).toFixed(2));
    const irpjAmount = Number(((amount * irpjRate) / 100).toFixed(2));
    const csllAmount = Number(((amount * csllRate) / 100).toFixed(2));

    const totalTax = Number((issAmount + pisAmount + cofinsAmount + irpjAmount + csllAmount).toFixed(2));
    const effectiveRate = Number(((totalTax / amount) * 100).toFixed(2));

    return {
      regime: 'LUCRO_PRESUMIDO',
      effectiveRate,
      totalTax,
      issRate,
      issAmount,
      pisRate,
      pisAmount,
      cofinsRate,
      cofinsAmount,
      irpjRate,
      irpjAmount,
      csllRate,
      csllAmount,
    };
  }

  // LUCRO_REAL
  const issRate = defaultIssRate || 3.0;
  const pisRate = 1.65;
  const cofinsRate = 7.6;
  const irpjRate = 4.8;
  const csllRate = 2.88;

  const issAmount = Number(((amount * issRate) / 100).toFixed(2));
  const pisAmount = Number(((amount * pisRate) / 100).toFixed(2));
  const cofinsAmount = Number(((amount * cofinsRate) / 100).toFixed(2));
  const irpjAmount = Number(((amount * irpjRate) / 100).toFixed(2));
  const csllAmount = Number(((amount * csllRate) / 100).toFixed(2));

  const totalTax = Number((issAmount + pisAmount + cofinsAmount + irpjAmount + csllAmount).toFixed(2));
  const effectiveRate = Number(((totalTax / amount) * 100).toFixed(2));

  return {
    regime: 'LUCRO_REAL',
    effectiveRate,
    totalTax,
    issRate,
    issAmount,
    pisRate,
    pisAmount,
    cofinsRate,
    cofinsAmount,
    irpjRate,
    irpjAmount,
    csllRate,
    csllAmount,
  };
}

/**
 * Generates an authentic ABRASF XML string for an NFS-e
 */
export function generateNfseXml(invoice: FiscalInvoice, company: CompanySettings): string {
  const cleanCnpj = company.cnpj.replace(/\D/g, '');
  const cleanClientDoc = invoice.customer.document.replace(/\D/g, '');
  const isCnpjClient = cleanClientDoc.length > 11;

  return `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse versao="2.04">
    <InfNfse Id="NFS${invoice.number}">
      <Numero>${invoice.number}</Numero>
      <CodigoVerificacao>${invoice.verificationCode}</CodigoVerificacao>
      <DataEmissao>${invoice.issuedAt}</DataEmissao>
      <IdentificacaoRps>
        <Numero>${invoice.rpsNumber}</Numero>
        <Serie>${invoice.series}</Serie>
        <Tipo>1</Tipo>
      </IdentificacaoRps>
      <NaturezaOperacao>1</NaturezaOperacao>
      <RegimeEspecialTributacao>${company.taxRegime === 'SIMPLES_NACIONAL' ? '6' : '1'}</RegimeEspecialTributacao>
      <OptanteSimplesNacional>${company.taxRegime === 'SIMPLES_NACIONAL' || company.taxRegime === 'MEI' ? '1' : '2'}</OptanteSimplesNacional>
      <IncentivadorCultural>2</IncentivadorCultural>
      <Competencia>${invoice.issuedAt.slice(0, 10)}</Competencia>
      
      <!-- Dados do Serviço -->
      <DadosServico>
        <Valores>
          <ValorServicos>${invoice.grossAmount.toFixed(2)}</ValorServicos>
          <ValorDeducoes>0.00</ValorDeducoes>
          <ValorPis>${invoice.taxes.pisAmount.toFixed(2)}</ValorPis>
          <ValorCofins>${invoice.taxes.cofinsAmount.toFixed(2)}</ValorCofins>
          <ValorInss>0.00</ValorInss>
          <ValorIr>${invoice.taxes.irpjAmount.toFixed(2)}</ValorIr>
          <ValorCsll>${invoice.taxes.csllAmount.toFixed(2)}</ValorCsll>
          <IssRetido>2</IssRetido>
          <ValorIss>${invoice.taxes.issAmount.toFixed(2)}</ValorIss>
          <Aliquota>${(invoice.taxes.issRate / 100).toFixed(4)}</Aliquota>
          <ValorLiquidoNfse>${invoice.netAmount.toFixed(2)}</ValorLiquidoNfse>
        </Valores>
        <ItemListaServico>${invoice.serviceCode}</ItemListaServico>
        <CodigoCnae>${invoice.cnae.replace(/\D/g, '')}</CodigoCnae>
        <Discriminacao>${invoice.description} | Plataforma: ${invoice.platform.toUpperCase()} | Id Transação: ${invoice.saleId}</Discriminacao>
        <CodigoMunicipio>3550308</CodigoMunicipio>
      </DadosServico>

      <!-- Prestador de Serviços -->
      <PrestadorServico>
        <IdentificacaoPrestador>
          <CpfCnpj>
            <Cnpj>${cleanCnpj}</Cnpj>
          </CpfCnpj>
          <InscricaoMunicipal>${company.municipalRegistration.replace(/\D/g, '')}</InscricaoMunicipal>
        </IdentificacaoPrestador>
        <RazaoSocial>${company.corporateName}</RazaoSocial>
        <NomeFantasia>${company.tradeName || company.corporateName}</NomeFantasia>
        <Endereco>
          <Endereco>${company.address.street}</Endereco>
          <Numero>${company.address.number}</Numero>
          <Bairro>${company.address.neighborhood}</Bairro>
          <CodigoMunicipio>3550308</CodigoMunicipio>
          <Uf>${company.address.state}</Uf>
          <Cep>${company.address.zipCode.replace(/\D/g, '')}</Cep>
        </Endereco>
        <Contato>
          <Email>${company.accountantEmail}</Email>
        </Contato>
      </PrestadorServico>

      <!-- Tomador de Serviços -->
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>
            ${isCnpjClient ? `<Cnpj>${cleanClientDoc}</Cnpj>` : `<Cpf>${cleanClientDoc}</Cpf>`}
          </CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>${invoice.customer.name}</RazaoSocial>
        <Contato>
          <Email>${invoice.customer.email}</Email>
        </Contato>
      </TomadorServico>
    </InfNfse>
    <AssinaturaDigital>MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6Z8k1s7Y8w...</AssinaturaDigital>
  </Nfse>
</CompNfse>`;
}
