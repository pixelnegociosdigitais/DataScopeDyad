import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Survey, Company } from '../../types';

export const generatePdfReport = async (survey: Survey, elementToCapture: HTMLElement | null, company?: Company | null) => {
    if (!elementToCapture) {
        throw new Error('Element to capture for PDF report is null.');
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const headerHeight = 20; // Altura reservada para o cabeçalho
    const footerHeight = 15; // Altura reservada para o rodapé
    const contentHeight = pageHeight - headerHeight - footerHeight - (2 * margin); // Altura disponível para conteúdo

    try {
        // Aplicar estilos padronizados ao elemento antes da captura
        const originalStyles = applyStandardizedStyles(elementToCapture);
        
        const canvas = await html2canvas(elementToCapture, { 
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });

        // Restaurar estilos originais
        restoreOriginalStyles(originalStyles);

        const imgWidth = pageWidth - 2 * margin; // Image width in PDF (mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width; // Image height in PDF (mm)

        let position = 0; // Current Y position in the PDF (mm)
        let heightLeft = imgHeight; // Remaining height of the image to be added (mm)
        let pageNumber = 1;

        // Calculate the ratio of canvas pixels to PDF millimeters
        const pxToMmRatio = canvas.width / imgWidth;

        // Função para adicionar cabeçalho
        const addHeader = () => {
            if (company?.name) {
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(company.name, pageWidth / 2, margin + 8, { align: 'center' });
                
                // Título do relatório
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(`Relatório de Pesquisa: ${survey.title}`, pageWidth / 2, margin + 14, { align: 'center' });
                
                // Linha separadora
                doc.setLineWidth(0.5);
                doc.line(margin, margin + 17, pageWidth - margin, margin + 17);
            } else {
                // Se não houver empresa, apenas mostrar o título da pesquisa
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(`Relatório: ${survey.title}`, pageWidth / 2, margin + 8, { align: 'center' });
                
                doc.setLineWidth(0.5);
                doc.line(margin, margin + 12, pageWidth - margin, margin + 12);
            }
        };

        // Função para adicionar rodapé
        const addFooter = () => {
            const now = new Date();
            const dateTime = now.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em: ${dateTime}`, margin, pageHeight - 5);
            doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
        };

        while (heightLeft > 0) {
            if (position > 0) {
                doc.addPage();
                pageNumber++;
            }

            // Adicionar cabeçalho e rodapé em cada página
            addHeader();
            addFooter();

            // Calculate the portion of the original canvas to draw for the current page
            const clipHeightPx = Math.min(heightLeft, contentHeight) * pxToMmRatio;
            const clipYPx = (imgHeight - heightLeft) * pxToMmRatio;

            // Create a temporary canvas for the current page's content
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = clipHeightPx;
            const tempCtx = tempCanvas.getContext('2d');

            if (tempCtx) {
                // Draw the specific portion of the original canvas onto the temporary canvas
                tempCtx.drawImage(
                    canvas,
                    0, // sX: Start X on source canvas
                    clipYPx, // sY: Start Y on source canvas
                    canvas.width, // sWidth: Width to draw from source canvas
                    clipHeightPx, // sHeight: Height to draw on source canvas
                    0, // dX: Start X on destination canvas
                    0, // dY: Start Y on destination canvas
                    canvas.width, // dWidth: Width to draw on destination canvas
                    clipHeightPx // dHeight: Height to draw on destination canvas
                );

                const tempImgData = tempCanvas.toDataURL('image/png');
                const tempImgHeightMm = (tempCanvas.height * imgWidth) / tempCanvas.width;

                doc.addImage(
                    tempImgData,
                    'PNG',
                    margin,
                    margin + headerHeight, // Posicionar após o cabeçalho
                    imgWidth,
                    tempImgHeightMm,
                    undefined,
                    'FAST'
                );
            }

            heightLeft -= contentHeight;
            position += contentHeight;
        }

        doc.save(`${survey.title.replace(/\s/g, '_')}_relatorio.pdf`);
    } catch (error) {
        console.error('Error generating PDF from HTML:', error);
        throw new Error('Failed to generate PDF report from dashboard content.');
    }
};

// Função para aplicar estilos padronizados
const applyStandardizedStyles = (element: HTMLElement): Map<HTMLElement, string> => {
    const originalStyles = new Map<HTMLElement, string>();
    
    // Aplicar estilos padronizados para tabelas
    const tables = element.querySelectorAll('table');
    tables.forEach(table => {
        const htmlTable = table as HTMLElement;
        originalStyles.set(htmlTable, htmlTable.style.cssText);
        htmlTable.style.fontSize = '12px';
        htmlTable.style.fontFamily = 'Arial, sans-serif';
        htmlTable.style.borderCollapse = 'collapse';
        htmlTable.style.width = '100%';
    });
    
    // Aplicar estilos padronizados para células da tabela
    const cells = element.querySelectorAll('td, th');
    cells.forEach(cell => {
        const htmlCell = cell as HTMLElement;
        originalStyles.set(htmlCell, htmlCell.style.cssText);
        htmlCell.style.padding = '8px';
        htmlCell.style.border = '1px solid #ddd';
        htmlCell.style.textAlign = 'left';
        htmlCell.style.verticalAlign = 'top';
        htmlCell.style.wordWrap = 'break-word';
    });
    
    // Aplicar estilos padronizados para cabeçalhos
    const headers = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach(header => {
        const htmlHeader = header as HTMLElement;
        originalStyles.set(htmlHeader, htmlHeader.style.cssText);
        htmlHeader.style.fontFamily = 'Arial, sans-serif';
        htmlHeader.style.fontWeight = 'bold';
        htmlHeader.style.marginBottom = '10px';
        htmlHeader.style.color = '#333';
    });
    
    return originalStyles;
};

// Função para restaurar estilos originais
const restoreOriginalStyles = (originalStyles: Map<HTMLElement, string>) => {
    originalStyles.forEach((style, elem) => {
        elem.style.cssText = style;
    });
};