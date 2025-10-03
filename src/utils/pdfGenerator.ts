import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Survey, SurveyResponse, QuestionType } from '../../types';

export const generatePdfReport = async (survey: Survey, responses: any[]) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    let yPos = margin;
    const lineHeight = 7;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text(`Relatório da Pesquisa: ${survey.title}`, margin, yPos);
    yPos += lineHeight * 2;

    doc.setFontSize(12);
    doc.text(`Total de Respostas: ${responses.length}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Criado em: ${new Date(survey.created_at!).toLocaleDateString('pt-BR')}`, margin, yPos);
    yPos += lineHeight * 2;

    responses.forEach((response, responseIndex) => {
        if (yPos + lineHeight * 5 > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = margin;
        }

        doc.setFontSize(14);
        doc.text(`Resposta #${responseIndex + 1}`, margin, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        doc.text(`ID da Resposta: ${response.id}`, margin, yPos);
        yPos += lineHeight;
        doc.text(`Data da Resposta: ${new Date(response.created_at).toLocaleString('pt-BR')}`, margin, yPos);
        yPos += lineHeight * 1.5;

        response.answers.forEach((answer: any) => {
            if (yPos + lineHeight * 2 > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFontSize(10);
            doc.text(`Pergunta: ${answer.question_text || 'N/A'}`, margin, yPos);
            yPos += lineHeight;
            let answerValue = answer.value;
            if (Array.isArray(answerValue)) {
                answerValue = answerValue.join(', ');
            }
            doc.text(`Resposta: ${answerValue || 'Não respondido'}`, margin + 5, yPos);
            yPos += lineHeight * 1.5;
        });
        yPos += lineHeight; // Espaço entre as respostas
    });

    doc.save(`${survey.title.replace(/\s/g, '_')}_relatorio.pdf`);
};