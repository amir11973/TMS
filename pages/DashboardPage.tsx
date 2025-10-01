/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User, TeamMember } from '../types';
import { PieChart, BarChart, StatCard, AnimatedNumber, GaugeChart } from '../components/dashboard';
// FIX: Corrected import path for DashboardListModal to avoid conflict with the modals.tsx file.
import { DashboardListModal } from '../modals/index';

const colorPalette = [
    '#e94560', '#17a2b8', '#ffc107', '#28a745', '#8e44ad',
    '#3498db', '#e67e22', '#f1c40f', '#2ecc71', '#9b59b6',
    '#1abc9c', '#d35400'
];

export const DashboardPage = ({ projects, actions, currentUser, users, teams, onViewDetails }: {
    projects: any[];
    actions: any[];
    currentUser: User | null;
    users: User[];
    teams: Record<string, TeamMember[]>;
    onViewDetails: (item: any) => void;
}) => {
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [modalItems, setModalItems] = useState<any[]>([]);
    const [modalTitle, setModalTitle] = useState('');
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    const combinedItems = useMemo(() => {
        const projectItems = projects.map(p => ({
            id: `p-${p.id}`,
            name: p.title,
            type: 'پروژه',
            unit: p.unit,
            responsible: p.projectManager,
            owner: p.owner,
            status: p.status,
            activities: p.activities || [],
            startDate: p.projectStartDate,
            endDate: p.projectEndDate,
            priority: p.priority,
            approver: null, // Placeholder for consistent shape
        }));
        const actionItems = actions.map(a => ({
            id: `a-${a.id}`,
            name: a.title,
            type: 'اقدام',
            unit: a.unit,
            responsible: a.responsible,
            owner: a.owner,
            status: a.status === 'ارسال برای تایید' ? a.underlyingStatus : a.status,
            activities: [],
            startDate: a.startDate,
            endDate: a.endDate,
            priority: a.priority,
            approver: a.approver,
        }));
        return [...projectItems, ...actionItems];
    }, [projects, actions]);

    const userVisibleItems = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.username === 'mahmoudi.pars@gmail.com') {
            return combinedItems;
        }
        return combinedItems.filter(item => {
            const ownerTeam = teams[item.owner] || [];
            const isTeamAdmin = ownerTeam.some(
                member => member.username === currentUser.username && member.role === 'ادمین'
            );

            return (
                item.owner === currentUser.username ||
                item.responsible === currentUser.username ||
                item.approver === currentUser.username || // for actions
                (item.activities && item.activities.some((act:any) => act.responsible === currentUser.username || act.approver === currentUser.username)) || // for projects
                isTeamAdmin
            );
        });
    }, [combinedItems, currentUser, teams]);


    const allItems = userVisibleItems;
    
    const notStartedCount = useMemo(() => {
        return allItems.filter(item => item.status === 'شروع نشده').length;
    }, [allItems]);

    const inProgressCount = useMemo(() => {
        return allItems.filter(item => item.status === 'در حال اجرا').length;
    }, [allItems]);
    
    const typeData = useMemo(() => {
        // FIX: Explicitly typed the reduce accumulator to ensure correct type inference for 'counts'.
        const counts = allItems.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return [
            { name: 'پروژه', value: counts['پروژه'] || 0, color: '#e94560' },
            { name: 'اقدام', value: counts['اقدام'] || 0, color: '#17a2b8' },
        ];
    }, [allItems]);

    const statusData = useMemo(() => {
        // FIX: Explicitly typed the reduce accumulator to ensure correct type inference for 'counts'.
        const counts = allItems.reduce((acc, item) => {
            const status = item.status || 'نامشخص';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
         return [
            { name: 'شروع نشده', value: counts['شروع نشده'] || 0, color: '#888' },
            { name: 'در حال اجرا', value: counts['در حال اجرا'] || 0, color: '#ffc107' },
            { name: 'خاتمه یافته', value: counts['خاتمه یافته'] || 0, color: '#8e44ad' },
        ];
    }, [allItems]);

    const responsibleData = useMemo(() => {
        // FIX: Explicitly typed the reduce accumulator to ensure TypeScript infers `counts` values as numbers, fixing the sort operation.
        const counts = allItems.reduce((acc, item) => {
            if(item.responsible) {
                acc[item.responsible] = (acc[item.responsible] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, value], index) => ({ 
            name: userMap.get(name) || name, 
            value,
            color: colorPalette[index % colorPalette.length]
        })).sort((a,b) => b.value - a.value);
    }, [allItems, userMap]);

    const delayData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Compare dates only

        let delayedCount = 0;
        let notDelayedCount = 0;

        allItems.forEach(item => {
            const endDate = new Date(item.endDate);
            if (item.status !== 'خاتمه یافته' && endDate < today) {
                delayedCount++;
            } else {
                notDelayedCount++;
            }
        });
        
        return [
            { name: 'دارای تاخیر', value: delayedCount, color: '#dc3545' },
            { name: 'فاقد تاخیر', value: notDelayedCount, color: '#28a745' },
        ];
    }, [allItems]);
    
    const completionPercentage = useMemo(() => {
        if (allItems.length === 0) {
            return 0;
        }
        const completedCount = allItems.filter(item => item.status === 'خاتمه یافته').length;
        return Math.round((completedCount / allItems.length) * 100);
    }, [allItems]);

    const handleChartClick = (filterType: string, filterValue: string) => {
        let filtered: any[] = [];
        let title = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (filterType) {
            case 'status':
                filtered = userVisibleItems.filter(item => item.status === filterValue);
                title = `لیست موارد با وضعیت: ${filterValue}`;
                break;
            case 'type':
                filtered = userVisibleItems.filter(item => item.type === filterValue);
                title = `لیست موارد از نوع: ${filterValue}`;
                break;
            case 'delay':
                if (filterValue === 'دارای تاخیر') {
                    filtered = userVisibleItems.filter(item => item.status !== 'خاتمه یافته' && new Date(item.endDate) < today);
                    title = 'لیست موارد دارای تاخیر';
                } else { // 'فاقد تاخیر'
                    filtered = userVisibleItems.filter(item => item.status === 'خاتمه یافته' || new Date(item.endDate) >= today);
                    title = 'لیست موارد فاقد تاخیر';
                }
                break;
            case 'responsible':
                const username = Array.from(userMap.entries()).find(([, val]) => val === filterValue)?.[0] || filterValue;
                filtered = userVisibleItems.filter(item => item.responsible === username);
                title = `لیست موارد مسئول: ${filterValue}`;
                break;
        }
        
        setModalItems(filtered);
        setModalTitle(title);
        setIsListModalOpen(true);
    };

    return (
        <div className="dashboard-page-container">
            <div className="dashboard-grid">
                <StatCard title="خلاصه وضعیت">
                    <div className="stat-split-container">
                        <div className="stat-split-item">
                            <h4>تعداد کل</h4>
                            <AnimatedNumber value={allItems.length} />
                        </div>
                        <div className="stat-split-divider"></div>
                        <div className="stat-split-item">
                            <h4>شروع نشده</h4>
                            <AnimatedNumber value={notStartedCount} />
                        </div>
                        <div className="stat-split-divider"></div>
                        <div className="stat-split-item">
                            <h4>در حال اجرا</h4>
                            <AnimatedNumber value={inProgressCount} />
                        </div>
                    </div>
                </StatCard>
                <GaugeChart value={completionPercentage} title="درصد تکمیل کارها" />
                <PieChart data={typeData} title="تفکیک بر اساس نوع" onSegmentClick={(name) => handleChartClick('type', name)} />
                <PieChart data={delayData} title="نمودار تاخیرات" onSegmentClick={(name) => handleChartClick('delay', name)} />
                <PieChart data={statusData} isDonut={true} title="تفکیک بر اساس وضعیت" onSegmentClick={(name) => handleChartClick('status', name)} />
                <BarChart data={responsibleData} title="تفکیک بر اساس مسئول" orientation="horizontal" onBarClick={(name) => handleChartClick('responsible', name)} />
            </div>
            <DashboardListModal
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                title={modalTitle}
                items={modalItems}
                onViewDetails={onViewDetails}
                projects={projects}
                actions={actions}
            />
        </div>
    );
};
