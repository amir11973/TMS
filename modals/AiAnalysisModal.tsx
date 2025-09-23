

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo, useRef } from 'react';
import moment from 'moment-jalaali';
import { getAiAnalysis } from '../aiAnalysisService';
import { AiAnalysisIcon } from '../icons';
import { toPersianDigits } from '../utils';
import { User } from '../types';

interface AnalysisCard {
    priority: string;
    title: string;
    endDate: string;
    roles?: string;
}

interface AnalysisSection {
    title: string;
    cards: AnalysisCard[];
}

interface ParsedAnalysis {
    type: 'simple' | 'structured';
    text?: string;
    intro?: string[];
    sections?: AnalysisSection[];
    outro?: string;
}

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

export const AiAnalysisModal = ({ isOpen, onClose, analysisItems, currentUser }: {
    isOpen: boolean;
    onClose: () => void;
    analysisItems: any[];
    currentUser: User | null;
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [error, setError] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [activeSectionIndex, setActiveSectionIndex] = useState(-1);
    const modalBodyRef = useRef<HTMLDivElement>(null);
    const elementRefs = useRef(new Map<string, HTMLElement>());

    const animationTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

    const parsedResult = useMemo((): ParsedAnalysis | null => {
        if (!analysisResult) return null;
        if (!analysisResult.includes('SECTION_HEADER:') && !analysisResult.includes('LIST_ITEM:')) {
            return { type: 'simple', text: analysisResult };
        }

        const lines = analysisResult.split('\n').filter(line => line.trim() !== '');
        const intro: string[] = [];
        const sections: AnalysisSection[] = [];
        let outro = '';
        let currentSection: AnalysisSection | null = null;

        for (const line of lines) {
            if (line.startsWith('SECTION_HEADER:')) {
                if (currentSection) sections.push(currentSection);
                currentSection = { title: line.replace('SECTION_HEADER:', '').trim(), cards: [] };
            } else if (line.startsWith('LIST_ITEM:')) {
                if (currentSection) {
                    const [priority, title, endDate, roles] = line.replace('LIST_ITEM:', '').trim().split('|');
                    currentSection.cards.push({ priority, title, endDate, roles });
                }
            } else if (line.includes('موفق باشید')) {
                outro = line;
            } else {
                if (sections.length === 0 && !currentSection) {
                    intro.push(line);
                }
            }
        }
        if (currentSection) sections.push(currentSection);

        return { type: 'structured', intro, sections, outro };
    }, [analysisResult]);

    const [visibleElements, setVisibleElements] = useState({
        intro: [] as boolean[],
        sections: [] as { number: boolean, title: boolean, cards: boolean[] }[],
        outro: false
    });

    useEffect(() => {
        // Cleanup timeouts on unmount or when modal is closed
        return () => {
            animationTimeouts.current.forEach(clearTimeout);
            animationTimeouts.current = [];
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setAnalysisResult('');
            setError('');
            setIsAnimating(false);
            animationTimeouts.current.forEach(clearTimeout);
            animationTimeouts.current = [];
            return;
        }

        const analyzeTasks = async () => {
            setIsLoading(true);
            setError('');

            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const activeItems = analysisItems.filter(item => {
                    const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
                     return displayStatus === 'شروع نشده' || displayStatus === 'در حال اجرا';
                });

                const overdueTasks = activeItems.filter(item => new Date(item.endDate) < today);
                const onTimeTasks = activeItems.filter(item => new Date(item.endDate) >= today);
                
                if (overdueTasks.length === 0 && onTimeTasks.length === 0) {
                    setAnalysisResult("عالی! شما هیچ وظیفه فعالی در کارتابل خود ندارید. به همین روند ادامه دهید!");
                    setIsLoading(false);
                    return;
                }

                const mapTask = (t: any) => ({ 
                    title: t.title, 
                    priority: t.priority,
                    endDate: moment(t.endDate).format('jYYYY/jMM/jDD'),
                    startDate: moment(t.startDate).format('jYYYY/jMM/jDD'),
                    roles: t.roles,
                });
                
                const sortTask = (a: any, b: any) => {
                    const dateA = moment(a.startDate, 'YYYY-MM-DD');
                    const dateB = moment(b.startDate, 'YYYY-MM-DD');
                    if (dateA.isBefore(dateB)) return -1;
                    if (dateA.isAfter(dateB)) return 1;
                
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

            } catch (e: any) {
                console.error("AI analysis failed:", e);
                setError(e.message || "متاسفانه تحلیل هوشمند با خطا مواجه شد. لطفا بعدا تلاش کنید.");
            } finally {
                setIsLoading(false);
            }
        };

        analyzeTasks();

    }, [isOpen, analysisItems]);

    useEffect(() => {
        if (!parsedResult || parsedResult.type !== 'structured') {
            setIsAnimating(false);
            return;
        }

        elementRefs.current.clear();

        const scrollToElement = (elementKey: string) => {
            const element = elementRefs.current.get(elementKey);
            if (element && modalBodyRef.current) {
                const modalRect = modalBodyRef.current.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();

                if (elementRect.bottom > modalRect.bottom || elementRect.top < modalRect.top) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                }
            }
        };

        const { intro = [], sections = [], outro } = parsedResult;
        
        const initialVisibility = {
            intro: Array(intro.length).fill(false),
            sections: sections.map(sec => ({
                number: false,
                title: false,
                cards: Array(sec.cards.length).fill(false)
            })),
            outro: false
        };
        setVisibleElements(initialVisibility);
        setActiveSectionIndex(-1);
        setIsAnimating(true);

        let delay = 0;
        animationTimeouts.current.forEach(clearTimeout);
        animationTimeouts.current = [];

        intro.forEach((_, index) => {
            animationTimeouts.current.push(setTimeout(() => {
                setVisibleElements(prev => {
                    const newIntro = [...prev.intro];
                    newIntro[index] = true;
                    return { ...prev, intro: newIntro };
                });
                scrollToElement(`intro-${index}`);
            }, delay));
            delay += 1500;
        });

        sections.forEach((section, sectionIndex) => {
            delay += 2500;
            animationTimeouts.current.push(setTimeout(() => {
                setActiveSectionIndex(sectionIndex);
                setVisibleElements(prev => {
                    const newSections = [...prev.sections];
                    newSections[sectionIndex].number = true;
                    return { ...prev, sections: newSections };
                });
                scrollToElement(`section-header-${sectionIndex}`);
            }, delay));

            delay += 1500;
            animationTimeouts.current.push(setTimeout(() => {
                setVisibleElements(prev => {
                    const newSections = [...prev.sections];
                    newSections[sectionIndex].title = true;
                    return { ...prev, sections: newSections };
                });
                scrollToElement(`section-header-${sectionIndex}`);
            }, delay));

            section.cards.forEach((_, cardIndex) => {
                delay += 2000;
                animationTimeouts.current.push(setTimeout(() => {
                    setVisibleElements(prev => {
                        const newSections = JSON.parse(JSON.stringify(prev.sections));
                        newSections[sectionIndex].cards[cardIndex] = true;
                        return { ...prev, sections: newSections };
                    });
                    scrollToElement(`card-${sectionIndex}-${cardIndex}`);
                }, delay));
            });
        });

        if (outro) {
            delay += 2500;
            animationTimeouts.current.push(setTimeout(() => {
                setActiveSectionIndex(-1);
                setVisibleElements(prev => ({ ...prev, outro: true }));
                setIsAnimating(false);
                scrollToElement('outro');
            }, delay));
        } else {
             animationTimeouts.current.push(setTimeout(() => {
                setIsAnimating(false);
            }, delay));
        }

    }, [parsedResult]);

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
        if (parsedResult) {
            if (parsedResult.type === 'simple') {
                return <p className="ai-analysis-results-simple">{parsedResult.text}</p>;
            }

            if (parsedResult.type === 'structured') {
                const { intro = [], sections = [], outro } = parsedResult;
                return (
                    <div className="ai-analysis-results animated">
                        {intro.map((line, index) => (
                             <p 
                                key={`intro-${index}`}
                                // FIX: Corrected the `ref` prop callback to not return a value, resolving a TypeScript error.
                                ref={el => { if (el) elementRefs.current.set(`intro-${index}`, el); }}
                                className={`ai-analysis-text ${visibleElements.intro[index] ? 'visible' : ''}`}
                            >
                                {line}
                            </p>
                        ))}
    
                        {sections.map((section, sectionIndex) => (
                            <div 
                                key={section.title} 
                                className={`analysis-section-wrapper ${activeSectionIndex > -1 && activeSectionIndex !== sectionIndex ? 'blurred' : ''}`}
                            >
                                <div 
                                    className="ai-analysis-header"
                                    // FIX: Corrected the `ref` prop callback to not return a value, resolving a TypeScript error.
                                    ref={el => { if (el) elementRefs.current.set(`section-header-${sectionIndex}`, el); }}
                                >
                                    <span className={`ai-analysis-header-number ${visibleElements.sections[sectionIndex]?.number ? 'visible' : ''}`}>
                                        {toPersianDigits(sectionIndex + 1)}
                                    </span>
                                    <h4 className={visibleElements.sections[sectionIndex]?.title ? 'visible' : ''}>{section.title}</h4>
                                </div>
                                <div className="ai-analysis-card-container">
                                    {section.cards.map((card, cardIndex) => (
                                         <div 
                                            key={`${section.title}-${cardIndex}`} 
                                            // FIX: Corrected the `ref` prop callback to not return a value, resolving a TypeScript error.
                                            ref={el => { if (el) elementRefs.current.set(`card-${sectionIndex}-${cardIndex}`, el); }}
                                            className={`ai-analysis-card ${visibleElements.sections[sectionIndex]?.cards[cardIndex] ? 'visible' : ''}`}
                                        >
                                            <div className="ai-analysis-card-header" style={getPriorityStyle(card.priority)}>
                                                اهمیت: {card.priority}
                                            </div>
                                            <div className="ai-analysis-card-body">
                                                <p style={{ color: 'var(--c-info)', fontSize: '0.8rem', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>{section.title}</p>
                                                <h4>{card.title || 'عنوان نامشخص'}</h4>
                                                <p>نقش شما: <span style={{ fontWeight: 'bold' }}>{card.roles || 'نامشخص'}</span></p>
                                                <p>تاریخ پایان: {card.endDate || 'نامشخص'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        
                        {outro && (
                            <p 
                                // FIX: Corrected the `ref` prop callback to not return a value, resolving a TypeScript error.
                                ref={el => { if (el) elementRefs.current.set('outro', el); }}
                                className={`ai-analysis-text outro ${visibleElements.outro ? 'visible' : ''}`}
                            >
                                {outro}
                            </p>
                        )}
                    </div>
                );
            }
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content details-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-info)', minWidth: 0 }}>
                         <div style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                            <AiAnalysisIcon />
                         </div>
                         <h3 style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'nowrap', whiteSpace: 'nowrap', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span>تحلیل هوشمند وظایف</span>
                            {currentUser && (
                                <span style={{ color: 'var(--c-primary)', fontSize: '0.9em', fontWeight: 400, whiteSpace: 'nowrap' }}>
                                    {currentUser.full_name}
                                </span>
                            )}
                         </h3>
                    </div>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div ref={modalBodyRef} className="modal-body" style={{ minHeight: '200px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                    {renderContent()}
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose} disabled={isAnimating}>بستن</button>
                </div>
            </div>
        </div>
    );
};