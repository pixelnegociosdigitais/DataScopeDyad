import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Survey } from '../../types';

export const generatePdfReport = async (survey: Survey, elementToCapture: HTMLElement) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    try {
        const canvas = await html2canvas(elementToCapture, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        const imgWidth = pageWidth - 2 * margin; // Adjust image width to fit page with margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let currentImgHeight = 0;
        let remainingImgHeight = imgHeight;

        // Add image, handling multiple pages if necessary
        while (remainingImgHeight > 0) {
            const pageBreakHeight = pageHeight - 2 * margin; // Usable height per page

            if (currentImgHeight > 0) {
                doc.addPage();
            }

            const sX = 0; // Source X
            const sY = Math.max(0, imgHeight - remainingImgHeight); // Source Y
            const sWidth = canvas.width; // Source Width
            const sHeight = Math.min(canvas.height, remainingImgHeight * (canvas.width / imgWidth)); // Source Height

            doc.addImage(
                imgData,
                'PNG',
                margin,
                margin,
                imgWidth,
                Math.min(imgHeight, pageBreakHeight),
                undefined,
                'FAST',
                sX,
                sY,
                sWidth,
                sHeight
            );

            remainingImgHeight -= pageBreakHeight;
            currentImgHeight += pageBreakHeight;
        }

        doc.save(`${survey.title.replace(/\s/g, '_')}_relatorio.pdf`);
    } catch (error) {
        console.error('Error generating PDF from HTML:', error);
        throw new Error('Failed to generate PDF report from dashboard content.');
    }
};