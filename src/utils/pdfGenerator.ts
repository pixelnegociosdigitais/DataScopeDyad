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
        // const imgData = canvas.toDataURL('image/png'); // Removed unused variable

        const imgWidth = pageWidth - 2 * margin; // Image width in PDF (mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width; // Image height in PDF (mm)

        let position = 0; // Current Y position in the PDF (mm)
        let heightLeft = imgHeight; // Remaining height of the image to be added (mm)

        // Calculate the ratio of canvas pixels to PDF millimeters
        const pxToMmRatio = canvas.width / imgWidth;

        while (heightLeft > 0) {
            if (position > 0) {
                doc.addPage();
            }

            // Calculate the portion of the original canvas to draw for the current page
            const clipHeightPx = Math.min(heightLeft, pageHeight - 2 * margin) * pxToMmRatio;
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
                    clipHeightPx, // sHeight: Height to draw from source canvas
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
                    margin,
                    imgWidth,
                    tempImgHeightMm,
                    undefined,
                    'FAST'
                );
            }

            heightLeft -= (pageHeight - 2 * margin);
            position += (pageHeight - 2 * margin);
        }

        doc.save(`${survey.title.replace(/\s/g, '_')}_relatorio.pdf`);
    } catch (error) {
        console.error('Error generating PDF from HTML:', error);
        throw new Error('Failed to generate PDF report from dashboard content.');
    }
};