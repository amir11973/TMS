/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import moment from 'moment-jalaali';
import { User } from '../types';
import { toPersianDigits } from '../utils';
import { renderStatusBadge } from '../components';

// Recursive component to render each node in the hierarchy
const HierarchyNode = ({ node, currentItemId, userMap }: { node: any, currentItemId: number, userMap: Map<string, string> }) => {
    const isCurrent = node.item.id === currentItemId && node.item.type === node.type;
    const itemType = node.item.type === 'activity' ? 'فعالیت' : 'اقدام';
    const { title, responsible, status, startDate, endDate } = node.item;

    const formattedStartDate = moment(startDate).format('jYY/jMM/jDD');
    const formattedEndDate = moment(endDate).format('jYY/jMM/jDD');

    return (
        <li className={`hierarchy-node ${isCurrent ? 'current-item' : ''}`}>
            <div className="node-content">
                <div className="node-main-info">
                    <span className="node-title">{title}</span>
                    {renderStatusBadge(status)}
                </div>
                <div className="node-meta">
                    <span>({itemType}) - مسئول: {userMap.get(responsible) || responsible}</span>
                    <span className="node-dates">تاریخ: {toPersianDigits(formattedStartDate)} تا {toPersianDigits(formattedEndDate)}</span>
                </div>
            </div>
            {node.children && node.children.length > 0 && (
                <ul className="hierarchy-children">
                    {node.children.map((childNode: any) => (
                        // FIX: Wrapped HierarchyNode in a React.Fragment to resolve TypeScript error with the 'key' prop.
                        <React.Fragment key={`${childNode.item.type}-${childNode.item.id}`}><HierarchyNode node={childNode} currentItemId={currentItemId} userMap={userMap} /></React.Fragment>
                    ))}
                </ul>
            )}
        </li>
    );
};


export const HierarchyModal = ({ isOpen, onClose, currentItem, allActivities, allActions, users }: {
    isOpen: boolean;
    onClose: () => void;
    currentItem: any | null;
    allActivities: any[];
    allActions: any[];
    users: User[];
}) => {
    const hierarchyData = useMemo(() => {
        if (!currentItem) return null;

        const allItems = [
            ...allActivities.map(a => ({...a, type: 'activity'})), 
            ...allActions.map(a => ({...a, type: 'action'}))
        ];
        const itemMap = new Map(allItems.map(i => [`${i.type}-${i.id}`, i]));
        
        // 1. Find all ancestors to get the root
        let rootItem = currentItem;
        // The parent of an activity can be another activity. The parent of an action can be another action.
        let parentKey = rootItem.parent_id ? `${rootItem.type}-${rootItem.parent_id}` : null;
        let parentTracer = parentKey ? itemMap.get(parentKey) : undefined;
        
        while(parentTracer) {
            rootItem = parentTracer;
            parentKey = rootItem.parent_id ? `${rootItem.type}-${rootItem.parent_id}` : null;
            parentTracer = parentKey ? itemMap.get(parentKey) : undefined;
        }

        // 2. Build the entire tree from the root recursively
        const buildTree = (item: any) => {
            const children = allItems.filter(i => i.parent_id === item.id && i.type === item.type);
            return {
                item: item,
                type: item.type,
                children: children.map(buildTree).sort((a,b) => new Date(a.item.startDate).getTime() - new Date(b.item.startDate).getTime())
            };
        };
        
        return buildTree(rootItem);

    }, [currentItem, allActivities, allActions]);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    if (!isOpen || !currentItem || !hierarchyData) return null;

    return (
        <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
            <div className="modal-content details-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>زنجیره وابستگی برای: {currentItem.title}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p>درخت زیر، ساختار کامل والدها و زیرمجموعه‌های این مورد را نمایش می‌دهد. مورد انتخابی شما هایلایت شده است.</p>
                    <div className="hierarchy-container">
                        <ul className="hierarchy-tree">
                            <HierarchyNode node={hierarchyData} currentItemId={currentItem.id} userMap={userMap} />
                        </ul>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>بستن</button>
                </div>
            </div>
        </div>
    );
};