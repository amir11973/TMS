/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { PieChart, BarChart, StatCard, AnimatedNumber, DashboardDataTable } from '../components/dashboard';

export const DashboardPage = ({ projects, actions, currentUser, users, onViewDetails }: {
    projects: any[];
    actions: any[];
    currentUser: User | null;
    users: User[];
    onViewDetails: (item: any) => void;
}) => {
    const [filters, setFilters] = useState({
        type: 'all',
        responsible: 'all',
        status: 'all',
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

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
        return combinedItems.filter(item => 
            item.owner === currentUser.username ||
            item.responsible === currentUser.username ||
            item.approver === currentUser.username || // for actions
            (item.activities && item.activities.some((act:any) => act.responsible === currentUser.username || act.approver === currentUser.username)) // for projects
        );
    }, [combinedItems, currentUser]);


    const filteredItems = useMemo(() => {
        return userVisibleItems.filter(item => {
            return (
                (filters.type === 'all' || item.type === filters.type) &&
                (filters.responsible === 'all' || item.responsible === filters.responsible) &&
                (filters.status === 'all' || item.status === filters.status)
            );
        });
    }, [userVisibleItems, filters]);
    
    const notStartedCount = useMemo(() => {
        return filteredItems.filter(item => item.status === 'شروع نشده').length;
    }, [filteredItems]);
    
    const typeData = useMemo(() => {
        const counts = filteredItems.reduce((acc: Record<string, number>, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {});
        return [
            { name: 'پروژه', value: counts['پروژه'] || 0, color: '#e94560' },
            { name: 'اقدام', value: counts['اقدام'] || 0, color: '#17a2b8' },
        ];
    }, [filteredItems]);

    const statusData = useMemo(() => {
        const counts = filteredItems.reduce((acc: Record<string, number>, item) => {
            const status = item.status || 'نامشخص';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
         return [
            { name: 'شروع نشده', value: counts['شروع نشده'] || 0, color: '#888' },
            { name: 'در حال اجرا', value: counts['در حال اجرا'] || 0, color: '#ffc107' },
            { name: 'خاتمه یافته', value: counts['خاتمه یافته'] || 0, color: '#28a745' },
        ];
    }, [filteredItems]);

    const responsibleData = useMemo(() => {
        const counts = filteredItems.reduce<Record<string, number>>((acc, item) => {
            if(item.responsible) {
                acc[item.responsible] = (acc[item.responsible] || 0) + 1;
            }
            return acc;
        }, {});
        return Object.entries(counts).map(([name, value]) => ({ name: userMap.get(name) || name, value })).sort((a,b) => b.value - a.value);
    }, [filteredItems, userMap]);

    const delayData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Compare dates only

        let delayedCount = 0;
        let notDelayedCount = 0;

        filteredItems.forEach(item => {
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
    }, [filteredItems]);


    const filterStatusOptions = ['شروع نشده', 'در حال اجرا', 'خاتمه یافته'];
    const responsibleOptions = useMemo(() => {
        const responsibles = [...new Set(userVisibleItems.map(item => item.responsible).filter(Boolean))];
        return responsibles.map(r => ({ value: r, label: userMap.get(r) || r }));
    }, [userVisibleItems, userMap]);


    return (
        <div className="dashboard-page-container">
            <div className="dashboard-filters">
                <div className="filter-group">
                    <label htmlFor="type-filter">نوع</label>
                    <select id="type-filter" name="type" value={filters.type} onChange={handleFilterChange}>
                        <option value="all">همه</option>
                        <option value="پروژه">پروژه</option>
                        <option value="اقدام">اقدام</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="responsible-filter">مسئول</label>
                    <select id="responsible-filter" name="responsible" value={filters.responsible} onChange={handleFilterChange}>
                        <option value="all">همه</option>
                        {responsibleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="status-filter">وضعیت</label>
                    <select id="status-filter" name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="all">همه</option>
                        {filterStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </div>
            </div>
            <div className="dashboard-grid">
                <StatCard title="خلاصه وضعیت">
                    <div className="stat-split-container">
                        <div className="stat-split-item">
                            <h4>تعداد کل</h4>
                            <AnimatedNumber value={filteredItems.length} />
                        </div>
                        <div className="stat-split-divider"></div>
                        <div className="stat-split-item">
                            <h4>شروع نشده</h4>
                            <AnimatedNumber value={notStartedCount} />
                        </div>
                    </div>
                </StatCard>
                <PieChart data={statusData} isDonut={true} title="تفکیک بر اساس وضعیت" />
                <PieChart data={typeData} title="تفکیک بر اساس نوع" />
                <PieChart data={delayData} title="نمودار تاخیرات" />
                <BarChart data={responsibleData} title="تفکیک بر اساس مسئول" color="#17a2b8" orientation="horizontal" />
            </div>
            <DashboardDataTable items={filteredItems} onViewDetails={onViewDetails} projects={projects} actions={actions}/>
        </div>
    );
};