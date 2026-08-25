import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Asset } from '@/types';
import { calculateDepreciation } from './depreciation';

export async function exportAssetsToExcel(
  assets: Asset[],
  fileName = 'Inventario_Patrimonio_Richesse'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Richesse - Sistema Patrimonial';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Inventário', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // ── Colunas ──────────────────────────────────────────────────────────────
  sheet.columns = [
    { header: 'Código',                   key: 'codigo',         width: 14 },
    { header: 'Plaqueta / Serial',         key: 'plaqueta',       width: 20 },
    { header: 'Descrição do Bem',          key: 'descricao',      width: 48 },
    { header: 'Categoria',                 key: 'categoria',      width: 26 },
    { header: 'Unidade / Loja',            key: 'unidade',        width: 22 },
    { header: 'Status',                    key: 'status',         width: 16 },
    { header: 'Valor de Aquisição (R$)',   key: 'val_aquisicao',  width: 24 },
    { header: 'Valor Residual (R$)',       key: 'val_residual',   width: 22 },
    { header: 'Valor Contábil Atual (R$)', key: 'val_contabil',   width: 26 },
    { header: 'Depreciação (%)',           key: 'depreciacao',    width: 18 },
    { header: 'Observações',              key: 'observacoes',    width: 42 },
  ];

  // ── Estilo do Cabeçalho ───────────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
    };
  });
  headerRow.height = 22;

  // ── Dados ─────────────────────────────────────────────────────────────────
  assets.forEach((a, i) => {
    const dep = calculateDepreciation(a);
    const row = sheet.addRow({
      codigo:        a.asset_code,
      plaqueta:      a.serial_number || '-',
      descricao:     a.name,
      categoria:     a.category?.name || 'Não categorizado',
      unidade:       a.location?.name || 'Não atribuído',
      status:        a.status.toUpperCase(),
      val_aquisicao: a.acquisition_value || 0,
      val_residual:  dep.residualValue,
      val_contabil:  dep.currentBookValue,
      depreciacao:   dep.depreciationPercent / 100, // Armazena como decimal para formatação %
      observacoes:   a.notes || '',
    });

    // Zebra striping
    const fillColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });

    // Formato numérico monetário BRL
    ['val_aquisicao', 'val_residual', 'val_contabil'].forEach((key) => {
      const cell = row.getCell(key);
      cell.numFmt = '"R$"#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    // Formato percentual
    const pctCell = row.getCell('depreciacao');
    pctCell.numFmt = '0.0%';
    pctCell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // ── Linha de totais ───────────────────────────────────────────────────────
  const lastDataRow = assets.length + 1;
  const totalRow = sheet.addRow({
    descricao:     `TOTAL (${assets.length} itens)`,
    val_aquisicao: { formula: `SUM(G2:G${lastDataRow})` },
    val_contabil:  { formula: `SUM(I2:I${lastDataRow})` },
  });
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF1E3A8A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  });
  (['val_aquisicao', 'val_contabil'] as const).forEach((key) => {
    const cell = totalRow.getCell(key);
    cell.numFmt = '"R$"#,##0.00';
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // ── Congelar linha de cabeçalho ───────────────────────────────────────────
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ── Gerar e salvar ────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(blob, `${fileName}_${dateStr}.xlsx`);
}



export function exportAssetsToPDF(assets: Asset[], title = 'Relatório Geral de Inventário de Ativos'): void {
  const doc = new jsPDF('landscape');

  // Cabeçalho
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 297, 22, 'F');

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('RICHESSE - SISTEMA DE INVENTÁRIO & CONTROLE PATRIMONIAL', 14, 12);
  
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(title, 14, 18);

  const totalValue = assets.reduce((sum, a) => sum + (a.acquisition_value || 0), 0);
  const totalBookValue = assets.reduce((sum, a) => sum + calculateDepreciation(a).currentBookValue, 0);

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total de Itens: ${assets.length} | Valor Original: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Valor Contábil Líquido: R$ ${totalBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

  const tableBody = assets.map((a) => {
    const dep = calculateDepreciation(a);
    return [
      a.asset_code,
      a.serial_number || '-',
      a.name,
      a.category?.name || '-',
      a.location?.name || '-',
      a.status,
      `R$ ${(a.acquisition_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${dep.currentBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['Código', 'Plaqueta', 'Descrição do Bem', 'Categoria', 'Unidade', 'Status', 'Valor Aquisição', 'Valor Contábil']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 80 },
      3: { cellWidth: 40 },
      4: { cellWidth: 30 },
      5: { cellWidth: 22 },
      6: { cellWidth: 27 },
      7: { cellWidth: 27 },
    },
    styles: { overflow: 'linebreak' },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

export interface TermoResponsabilidadeData {
  collaboratorName: string;
  cpf: string;
  role: string;
  department: string;
  asset: Asset;
  reason?: string;
  notes?: string;
}

export function generateTermoResponsabilidadePDF(data: TermoResponsabilidadeData): void {
  const doc = new jsPDF('portrait');
  const { collaboratorName, cpf, role, department, asset, reason } = data;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('TERMO DE RESPONSABILIDADE E CAUTELA DE BEM PATRIMONIAL', 105, 14, { align: 'center' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 34);

  // Box Colaborador
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 40, 182, 32, 2, 2, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DADOS DO COLABORADOR / RESPONSÁVEL', 20, 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome Completo: ${collaboratorName}`, 20, 56);
  doc.text(`CPF: ${cpf || 'Não informado'}`, 120, 56);
  doc.text(`Cargo / Função: ${role || 'Não informado'}`, 20, 64);
  doc.text(`Setor / Unidade: ${department || asset.location?.name || 'Não informado'}`, 120, 64);

  // Box Ativo
  doc.roundedRect(14, 78, 182, 40, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. DADOS DO BEM / EQUIPAMENTO ENTREGUE', 20, 86);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Código Patrimonial: ${asset.asset_code}`, 20, 94);
  doc.text(`Plaqueta / Serial: ${asset.serial_number || 'Sem plaqueta'}`, 120, 94);
  doc.text(`Descrição: ${asset.name}`, 20, 102);
  doc.text(`Categoria: ${asset.category?.name || '-'}`, 20, 110);
  doc.text(`Unidade de Alocação: ${asset.location?.name || '-'}`, 120, 110);

  // Box Termos Legais
  doc.roundedRect(14, 124, 182, 75, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. DECLARAÇÃO E TERMOS DE RESPONSABILIDADE', 20, 132);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const legalText = [
    'Pelo presente Termo de Responsabilidade, o colaborador acima qualificado declara que recebeu em perfeitas condições de uso, conservação e funcionamento o equipamento/bem patrimonial especificado.',
    '',
    'O colaborador compromete-se a:',
    'a) Utilizar o referido bem exclusivamente para o desempenho de suas atividades profissionais na empresa.',
    'b) Zelar pela sua guarda, segurança e perfeito estado de conservação.',
    'c) Comunicar imediatamente à equipe de TI/Patrimônio qualquer avaria, furto, roubo, perda ou mau funcionamento.',
    'd) Restituir o bem à empresa no mesmo estado de conservação em que o recebeu (salvo desgaste natural) quando solicitado ou na rescisão do contrato de trabalho.',
    reason ? `Motivo da entrega/uso: ${reason}` : '',
  ];

  doc.text(legalText, 20, 140, { maxWidth: 170 });

  // Assinaturas
  const signY = 220;
  doc.setDrawColor(100, 116, 139);
  doc.line(20, signY, 95, signY);
  doc.line(115, signY, 190, signY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(collaboratorName, 57.5, signY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Colaborador', 57.5, signY + 11, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('Responsável pelo Patrimônio / TI', 152.5, signY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Richesse Confeitaria', 152.5, signY + 11, { align: 'center' });

  doc.save(`Termo_Responsabilidade_${asset.asset_code}_${collaboratorName.replace(/\s+/g, '_')}.pdf`);
}
