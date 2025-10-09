import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { Survey, SurveyResponse, QuestionType, Answer, ChartDataItem, QuestionAnalysis } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface DashboardProps {
    survey: Survey;
    responses: SurveyResponse[];
    onBack: () => void;
    dashboardRef: React.RefObject<HTMLDivElement | null>; // Updated to allow null
    onDownloadReport: (survey: Survey) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316'];

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`Total ${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">{`(${(percent * 100).toFixed(2)}%)`}</text>
    </g>
  );
};

// Define a type for the active shape renderer
type ActiveShapeRenderer = (props: any) => React.ReactElement;

// Define props for our custom interactive Pie component
interface InteractivePieChartProps {
    data: ChartDataItem[];
    activeIndex: number;
    onPieEnter: (_: any, index: number) => void;
    renderActiveShape: ActiveShapeRenderer;
}

const InteractivePie: React.FC<InteractivePieChartProps> = ({
    data,
    activeIndex,
    onPieEnter,
    renderActiveShape
}) => (
    <Pie
        {...{
            activeIndex,
            activeShape: renderActiveShape,
            data,
            cx: "50%",
            cy: "50%",
            innerRadius: 60,
            outerRadius: 80,
            fill: "#8884d8", // This fill is for the default segments, activeShape will override
            dataKey: "value",
            onMouseEnter: onPieEnter,
        } as any} // Aplicando o cast 'as any' aqui
    >
        {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
    </Pie>
);


const Dashboard: React.FC<DashboardProps> = ({ survey, responses, onBack, dashboardRef, onDownloadReport }) => {
    const [activeIndex, setActiveIndex] = React.useState(0);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };
    
    const analysis = useMemo<QuestionAnalysis[]>(() => {
        return (survey.questions || []).map(q => {
            const questionResponses = responses.map(r => r.answers.find(a => a.questionId === q.id)).filter(Boolean) as Answer[];
            
            if ([QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOX, QuestionType.RATING].includes(q.type)) {
                const counts = questionResponses.reduce((acc, res) => {
                    if (q.type === QuestionType.CHECKBOX && Array.isArray(res.value)) {
                        res.value.forEach(val => {
                            acc[val] = (acc[val] || 0) + 1;
                        });
                    } else {
                        const key = String(res.value);
                        acc[key] = (acc[key] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>);
                
                const data: ChartDataItem[] = Object.entries(counts).map(([name, value]) => ({ name, value }));
                return { ...q, data };
            }

            if ([QuestionType.SHORT_TEXT, QuestionType.LONG_TEXT, QuestionType.EMAIL, QuestionType.PHONE].includes(q.type)) {
                const data: string[] = questionResponses.map(r => String(r.value)).filter(v => v.trim() !== '');
                return { ...q, data };
            }

            return { ...q, data: [] };
        });
    }, [survey, responses]);

    const exportToCSV = () => {
        // Usar ponto e vírgula como delimitador (padrão Excel pt-BR)
        const DELIM = ';';
        // Função auxiliar para escapar valores CSV
        const escapeCSVValue = (value: string): string => {
            // Se o valor contém delimitador, quebra de linha ou aspas, deve ser envolvido em aspas
            if (value.includes(DELIM) || value.includes('\n') || value.includes('\r') || value.includes('"')) {
                // Escapar aspas duplas duplicando-as
                const escapedValue = value.replace(/"/g, '""');
                return `"${escapedValue}"`;
            }
            return value;
        };


        
        // Obter data e hora atual formatada
        const now = new Date();
        const dateTime = now.toLocaleString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Criar array de linhas CSV
        const csvLines: string[] = [];

        // Cabeçalho do relatório (exatamente como na imagem)
        // Linha especial para Excel reconhecer o delimitador
        csvLines.push('sep=;');
        csvLines.push('RELATÓRIO DE PESQUISA');
        csvLines.push(`Empresa: ${survey.companyName || 'Pixel Negócios Digitais'}`);
        csvLines.push(`Pesquisa: ${survey.title}`);
        csvLines.push(`Total de Respostas: ${responses.length}`);
        csvLines.push(`Data de Geração: ${dateTime}`);
        csvLines.push(''); // Linha em branco
        csvLines.push('DADOS DAS RESPOSTAS');

        // Criar cabeçalhos das colunas
        const headers: string[] = ['#', 'Nome Completo', 'Telefone'];
        
        // Adicionar as perguntas como cabeçalhos (exceto nome e telefone que já estão)
        (survey.questions || []).forEach(question => {
            const questionText = question.text.toLowerCase();
            // Pular perguntas de nome e telefone pois já estão nos cabeçalhos fixos
            if (!questionText.includes('nome') && !questionText.includes('telefone')) {
                headers.push(question.text);
            }
        });

        // Adicionar linha de cabeçalhos com delimitador
        csvLines.push(headers.map(header => escapeCSVValue(header)).join(DELIM));

        // Processar cada resposta
        responses.forEach((response, responseIndex) => {
            const row: string[] = [];
            
            // Número sequencial
            row.push((responseIndex + 1).toString());
            
            // Buscar nome e telefone
            let nomeCompleto = '';
            let telefone = '';
            
            // Encontrar respostas de nome e telefone
            (survey.questions || []).forEach(question => {
                const answer = response.answers.find(a => a.questionId === question.id);
                if (answer && answer.value) {
                    const questionText = question.text.toLowerCase();
                    if (questionText.includes('nome')) {
                        nomeCompleto = String(answer.value);
                    } else if (questionText.includes('telefone')) {
                        const phoneValue = String(answer.value);
                        const cleanPhone = phoneValue.replace(/\D/g, '');
                        if (cleanPhone.length === 11) {
                            telefone = `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,7)}-${cleanPhone.substring(7)}`;
                        } else if (cleanPhone.length === 10) {
                            telefone = `(${cleanPhone.substring(0,2)}) ${cleanPhone.substring(2,6)}-${cleanPhone.substring(6)}`;
                        } else {
                            telefone = phoneValue;
                        }
                    }
                }
            });
            
            // Adicionar nome e telefone
            row.push(nomeCompleto);
            row.push(telefone);
            
            // Adicionar outras respostas (exceto nome e telefone)
            (survey.questions || []).forEach(question => {
                const questionText = question.text.toLowerCase();
                // Pular perguntas de nome e telefone
                if (!questionText.includes('nome') && !questionText.includes('telefone')) {
                    const answer = response.answers.find(a => a.questionId === question.id);
                    let cellValue = '';
                    
                    if (answer && answer.value !== null && answer.value !== undefined) {
                        if (Array.isArray(answer.value)) {
                            // Para checkboxes, juntar valores com ponto e vírgula
                            cellValue = answer.value.filter(v => v !== null && v !== undefined).join('; ');
                        } else {
                            cellValue = String(answer.value);
                        }
                    }
                    
                    row.push(cellValue.trim());
                }
            });
            
            // Adicionar a linha ao CSV com delimitador
            csvLines.push(row.map(cell => escapeCSVValue(cell)).join(DELIM));
        });

        // Juntar todas as linhas
        const csvContent = csvLines.join('\r\n');

        // Criar e baixar o arquivo com BOM explícito em bytes para garantir acentuação correta
        const BOM_BYTES = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const csvBuffer = new TextEncoder().encode(csvContent);
        const blob = new Blob([BOM_BYTES, csvBuffer], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${survey.title.replace(/[^a-zA-Z0-9]/g, '_')}_respostas.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar o URL do objeto para liberar memória
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            {/* Header Section - Responsive */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                        <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-text-main">{survey.title}</h2>
                        <p className="text-text-light">{responses.length} respostas</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={() => onDownloadReport(survey)} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">
                        <DownloadIcon className="h-4 w-4" /> 
                        <span className="hidden sm:inline">EXPORTAR PDF</span>
                        <span className="sm:hidden">PDF</span>
                    </button>
                    <button onClick={exportToCSV} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">
                       <DownloadIcon className="h-4 w-4" /> 
                       <span className="hidden sm:inline">EXPORTAR CSV</span>
                       <span className="sm:hidden">CSV</span>
                    </button>
                </div>
            </div>

            {/* Dashboard Content - Responsive */}
            <div ref={dashboardRef} className="p-2 sm:p-4 bg-gray-50 rounded-lg">
                {/* Tabela de Dados Brutos */}
                <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-text-main mb-4">
                        Dados das Respostas
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-2 inline-block">TABELA</span>
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700">
                                        #
                                    </th>
                                    {(survey.questions || []).map((question) => (
                                        <th key={question.id} className="border border-gray-300 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700 min-w-[120px] max-w-[200px]">
                                            <div className="truncate" title={question.text}>
                                                {question.text}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {responses.filter(response => {
                                    // Filtrar respostas que têm pelo menos uma resposta válida
                                    return response.answers.some(answer => {
                                        if (Array.isArray(answer.value)) {
                                            return answer.value.length > 0;
                                        }
                                        return answer.value !== null && answer.value !== undefined && String(answer.value).trim() !== '';
                                    });
                                }).map((response, index) => (
                                    <tr key={response.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                        <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 font-medium">
                                            {index + 1}
                                        </td>
                                        {(survey.questions || []).map((question) => {
                                            const answer = response.answers.find(a => a.questionId === question.id);
                                            let displayValue = '';
                                            
                                            if (answer) {
                                                if (Array.isArray(answer.value)) {
                                                    displayValue = answer.value.join(', ');
                                                } else {
                                                    displayValue = String(answer.value);
                                                }
                                            }
                                            
                                            return (
                                                <td key={question.id} className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 max-w-[200px]">
                                                    <div className="break-words" title={displayValue}>
                                                        {displayValue || '-'}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {responses.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Ainda não há respostas para esta pesquisa.
                            </div>
                        )}
                    </div>
                </div>

                {/* Análise por Pergunta */}
                <div className="mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-text-main mb-4">
                        Análise por Pergunta
                    </h3>
                </div>
                
                {(analysis || []).map((q) => (
                    <div key={q.id} className="bg-white p-3 sm:p-6 rounded-lg shadow-md mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-text-main mb-4 break-words">
                            {q.text} 
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-2 inline-block">{q.type.toUpperCase()}</span>
                        </h3>
                        {([QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOX, QuestionType.RATING].includes(q.type as QuestionType)) && Array.isArray(q.data) && q.data.length > 0 && (
                             <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                                {q.type === QuestionType.RATING ? (
                                    <BarChart data={q.data as ChartDataItem[]}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{ fontSize: 12 }}
                                            interval={0}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar dataKey="value" fill={COLORS[0]} name="Respostas" />
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <InteractivePie
                                            data={q.data as ChartDataItem[]}
                                            activeIndex={activeIndex}
                                            onPieEnter={onPieEnter}
                                            renderActiveShape={renderActiveShape}
                                        />
                                        <Tooltip />
                                        <Legend 
                                            wrapperStyle={{ fontSize: '12px' }}
                                            formatter={(_legendValue: string | number, legendEntry: any) => {
                                                const dataItem = legendEntry.payload as ChartDataItem;
                                                const total = (q.data as ChartDataItem[]).reduce((sum, item) => sum + item.value, 0);
                                                const entryValue = dataItem.value ?? 0; 
                                                const percentage = total > 0 ? ((entryValue / total) * 100).toFixed(2) : '0.00';
                                                return `${dataItem.name} (${percentage}%)`;
                                            }}
                                        />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                        )}
                        {([QuestionType.SHORT_TEXT, QuestionType.LONG_TEXT, QuestionType.EMAIL, QuestionType.PHONE].includes(q.type as QuestionType)) && Array.isArray(q.data) && (
                            <div className="max-h-60 overflow-y-auto pr-2">
                                <ul className="space-y-3">
                                    {(q.data as string[]).map((text: string, index: number) => (
                                        <li key={index} className="bg-gray-50 p-3 rounded-md border-l-4 border-primary/50 text-sm text-gray-700 break-words">
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {(Array.isArray(q.data) && q.data.length === 0) && <p className="text-text-light text-sm">Ainda não há respostas para esta pergunta.</p>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;