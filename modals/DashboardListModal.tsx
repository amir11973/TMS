/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { DetailsIcon } from '../icons';
import { toPersianDigits } from '../utils';

export const DashboardListModal = ({ isOpen, onClose, title, items, onViewDetails, projects, actions }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    items: any[];
    onViewDetails: (item: any) => void;
    projects: any[];
    actions: any[];
}) => {
    if (!isOpen) return null;

    const handleDetailsClick = (item: any) => {
        const [type, originalIdStr] = item.id.split('-');
        const originalId = parseInt(originalIdStr, 10);
        
        let originalItem = null;
        if (type === 'p' && projects) {
            originalItem = projects.find(p => p.id === originalId);
        } else if (type === 'a' && actions) {
            originalItem = actions.find(a => a.id === originalId);
        }
        
        if (originalItem) {
            // Re-add type for DetailsModal logic in App.tsx
            onViewDetails({ ...originalItem, type: originalItem.projectManager !== undefined ? 'project' : 'action' });
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content details-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body modal-body-with-table">
                    <div className="table-container">
                        <table className="user-list-table dashboard-data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>عنوان</th>
                                    <th>نوع</th>
                                    <th>وضعیت</th>
                                    <th>جزئیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? items.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{toPersianDigits(index + 1)}</td>
                                        <td>{item.name}</td>
                                        <td>{item.type}</td>
                                        <td>{item.status}</td>
                                        <td>
                                            <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => handleDetailsClick(item)}>
                                                <DetailsIcon />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center' }}>موردی برای نمایش یافت نشد.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>بستن</button>
                </div>
            </div>
        </div>
    );
};