

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import moment from 'moment-jalaali';
import { getAiAnalysis } from '../aiAnalysisService';
import { AiAnalysisIcon } from '../icons';
import { toPersianDigits } from '../utils';

const getPriorityStyle = (priority: string): React.CSSProperties => {
    switch (priority) {
        case 'زیاد':
            return { backgroundColor: 'var(--c-danger)', color: 'white' };
        case 'متوسط':
            return { backgroundColor: 'var(--c-warning)', color: '#1a1a2e' };
        case 'کم':
            return { backgroundColor: 'var(--c-success)', color: 'white' };
        default:
            return { backgroundColor: 'var(--c-header)' };
    }
};

export const AiAnalysisModal = ({ isOpen, onClose, taskItems }: {
    isOpen: boolean;
    onClose: () => void;
    taskItems: any[];
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal is closed
            setAnalysisResult('');
            setError('');
            return;
        }

        const analyzeTasks = async () => {
            setIsLoading(true);
            setError('');

            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const overdueTasks = taskItems.filter(item => {
                    const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
                    const isOverdue = new Date(item.endDate) < today;
                    return isOverdue && (displayStatus === 'شروع نشده' || displayStatus === 'در حال اجرا');
                });
                
                const onTimeTasks = taskItems.filter(item => {
                    const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
                    const isOverdue = new Date(item.endDate) < today;
                    return !isOverdue && (displayStatus === 'شروع نشده' || displayStatus === 'در حال اجرا');
                });

                if (overdueTasks.length === 0 && onTimeTasks.length === 0) {
                    setAnalysisResult("عالی! شما هیچ وظیفه فعالی در کارتابل خود ندارید. به همین روند ادامه دهید!");
                    setIsLoading(false);
                    return;
                }

                const mapTask = (t: any) => ({ 
                    title: t.title, 
                    priority: t.priority,
                    endDate: moment(t.endDate).format('jYYYY/jMM/jDD')
                });

                const sortTask = (a: any, b: any) => {
                    const priorityOrder = { 'زیاد': 1, 'متوسط': 2, 'کم': 3 };
                    return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
                };

                const overdueNotStarted = overdueTasks
                    .filter(t => (t.status === 'ارسال برای تایید' ? t.underlyingStatus : t.status) === 'شروع نشده')
                    .sort(sortTask)
                    .map(mapTask);

                const overdueInProgress = overdueTasks
                    .filter(t => (t.status === 'ارسال برای تایید' ? t.underlyingStatus : t.status) === 'در حال اجرا')
                    .sort(sortTask)
                    .map(mapTask);
                
                const onTimeNotStarted = onTimeTasks
                    .filter(t => (t.status === 'ارسال برای تایید' ? t.underlyingStatus : t.status) === 'شروع نشده')
                    .sort(sortTask)
                    .map(mapTask);
                
                const onTimeInProgress = onTimeTasks
                    .filter(t => (t.status === 'ارسال برای تایید' ? t.underlyingStatus : t.status) === 'در حال اجرا')
                    .sort(sortTask)
                    .map(mapTask);


                const result = await getAiAnalysis(overdueNotStarted, overdueInProgress, onTimeNotStarted, onTimeInProgress);
                setAnalysisResult(result);

            } catch (e) {
                console.error("AI analysis failed:", e);
                setError("متاسفانه تحلیل هوشمند با خطا مواجه شد. لطفا بعدا تلاش کنید.");
            } finally {
                setIsLoading(false);
            }
        };

        analyzeTasks();

    }, [isOpen, taskItems]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="loading-box" style={{ background: 'transparent', boxShadow: 'none' }}>
                    <div className="spinner"></div>
                    <span>در حال تحلیل هوشمند وظایف شما...</span>
                </div>
            );
        }
        if (error) {
            return <p className="error-message">{error}</p>;
        }
        if (analysisResult) {
            if (!analysisResult.includes('SECTION_HEADER:') && !analysisResult.includes('LIST_ITEM:')) {
                return <p className="ai-analysis-results-simple">{analysisResult}</p>;
            }

            const lines = analysisResult.split('\n').filter(line => line.trim() !== '');
            let itemCounter = 0;
            let currentSectionContent: React.ReactNode[] = [];
            const renderedSections: React.ReactNode[] = [];
            let sectionCounter = 0;

            const renderSection = (title: string, content: React.ReactNode[]) => {
                if (content.length > 0) {
                    sectionCounter++;
                    renderedSections.push(
                        <div key={title}>
                            <div className="ai-analysis-header">
                                <span className="ai-analysis-header-number">{toPersianDigits(sectionCounter)}</span>
                                <h4>{title}</h4>
                            </div>
                            <div className="ai-analysis-card-container">
                                {content}
                            </div>
                        </div>
                    );
                }
            };
            
            let currentSectionTitle = '';

            lines.forEach((line, index) => {
                if (line.startsWith('SECTION_HEADER:')) {
                    if (currentSectionTitle) {
                        renderSection(currentSectionTitle, currentSectionContent);
                    }
                    currentSectionTitle = line.replace('SECTION_HEADER:', '').trim();
                    currentSectionContent = [];
                } else if (line.startsWith('LIST_ITEM:')) {
                    const content = line.replace('LIST_ITEM:', '').trim();
                    itemCounter++;
                    const [priority, title, endDate] = content.split('|');
                    
                    currentSectionContent.push(
                        <div 
                            key={index} 
                            className="ai-analysis-card" 
                            style={{ animationDelay: `${itemCounter * 100}ms` }}
                        >
                            <div className="ai-analysis-card-header" style={getPriorityStyle(priority)}>
                                اهمیت: {priority}
                            </div>
                            <div className="ai-analysis-card-body">
                                <h4>{title || 'عنوان نامشخص'}</h4>
                                <p>تاریخ پایان: {endDate || 'نامشخص'}</p>
                            </div>
                        </div>
                    );
                } else {
                     renderedSections.push(<p key={index} className="ai-analysis-text">{line}</p>);
                }
            });

            if (currentSectionTitle) {
                renderSection(currentSectionTitle, currentSectionContent);
            }

            return (
                <div className="ai-analysis-results">
                    {renderedSections}
                </div>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content details-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--c-info)'}}>
                         <AiAnalysisIcon />
                         <h3>تحلیل هوشمند وظایف</h3>
                    </div>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body" style={{ minHeight: '200px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                    {renderContent()}
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>بستن</button>
                </div>
            </div>
        </div>
    );
};