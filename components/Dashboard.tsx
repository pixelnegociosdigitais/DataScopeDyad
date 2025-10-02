import React, { useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Survey, SurveyResponse, QuestionType, Answer } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface DashboardProps {
    survey: Survey;
    responses: SurveyResponse[];
    onBack: () => void;
}

// Nova interface para os itens de dados dos gráficos
interface ChartDataItem {
    name: string;
    value: number;
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

const Dashboard: React.FC<DashboardProps> = ({ survey, responses, onBack }) => {
    const dashboardRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = React.useState(0);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };
    
    const analysis = useMemo(() => {
        return survey.questions.map(q => {
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

    const exportToPDF = () => {
        const input = dashboardRef.current;
        if (input) {
            html2canvas(input, { scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${survey.title.replace(/\s/g, '_')}_relatorio.pdf`);
            });
        }
    };

    const exportToCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        const headers = survey.questions.map(q => `"${q.text.replace(/"/g, '""')}"`).join(',');
        csvContent += headers + "\r\n";

        responses.forEach(res => {
            const row = survey.questions.map(q => {
                const answer = res.answers.find(a => a.questionId === q.id);
                let value = '';
                if (answer) {
                    if (Array.isArray(answer.value)) {
                        value = answer.value.join('; '); // For checkbox arrays
                    } else {
                        value = String(answer.value);
                    }
                }
                return `"${value.replace(/"/g, '""')}"`;
            }).join(',');
            csvContent += row + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${survey.title.replace(/\s/g, '_')}_dados.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                        <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-text-main">{survey.title}</h2>
                        <p className="text-text-light">{responses.length} respostas</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">
                        <DownloadIcon className="h-4 w-4" /> Exportar PDF
                    </button>
                    <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">
                       <DownloadIcon className="h-4 w-4" /> Exportar CSV
                    </button>
                </div>
            </div>

            <div ref={dashboardRef} className="p-4 bg-gray-50 rounded-lg">
                {analysis.map((q) => (
                    <div key={q.id} className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h3 className="text-lg font-semibold text-text-main mb-4">{q.text} <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{q.type}</span></h3>
                        {([QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOX, QuestionType.RATING].includes(q.type as QuestionType)) && Array.isArray(q.data) && q.data.length > 0 && (
                             <ResponsiveContainer width="100%" height={300}>
                                {q.type === QuestionType.RATING ? (
                                    <BarChart data={q.data as ChartDataItem[]}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" fill="#3B82F6" name="Respostas" />
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <Pie
                                            activeIndex={activeIndex}
                                            activeShape={renderActiveShape}
                                            data={q.data as ChartDataItem[]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            onMouseEnter={onPieEnter}
                                        >
                                          {/* Mapeamento de células para PieChart */}
                                          {(q.data as ChartDataItem[]).map((_entry, index) => ( // Removed unused 'entry'
                                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                          ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend 
                                            formatter={(_legendValue: string | number, legendEntry: any) => { // Removed unused 'legendValue'
                                                const dataItem = legendEntry.payload as ChartDataItem; // Type assertion here
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
                                    {q.data.map((text: string, index: number) => ( // Explicitly type 'text' as string
                                        <li key={index} className="bg-gray-50 p-3 rounded-md border-l-4 border-primary/50 text-sm text-gray-700">
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