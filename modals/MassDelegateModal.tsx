/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { User, TeamMember } from '../types';

export const MassDelegateModal = ({ isOpen, onClose, onSave, projects, actions, teamMembers, currentUser, users }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updates: any[]) => void;
    projects: any[];
    actions: any[];
    teamMembers: TeamMember[];
    currentUser: User | null;
    users: User[];
}) => {
    const [changes, setChanges] = useState<Record<string, string>>({});
    
    const userMap = React.useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    const delegatableItems = React.useMemo(() => {
        if (!currentUser) return [];
        
        const filterByStatus = (item: any) => {
            const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
            return displayStatus === 'شروع نشده' || displayStatus === 'در حال اجرا';
        };

        const projectActivities = projects
            .filter(p => p.projectManager === currentUser.username)
            .flatMap(p => p.activities.filter(filterByStatus).map((a:any) => ({ 
                ...a, 
                type: 'activity', 
                parentName: p.title,
                itemName: a.title,
            })));

        const manageableActions = actions
            .filter(a => a.approver === currentUser.username)
            .filter(filterByStatus)
            .map(a => ({
                ...a,
                type: 'action',
                parentName: 'اقدام مستقل',
                itemName: a.title,
            }));

        return [...projectActivities, ...manageableActions];
    }, [projects, actions, currentUser]);

    const assignableUsers = React.useMemo(() => {
        return teamMembers.filter(m => m.role === 'مدیر' || m.role === 'عضو تیم');
    }, [teamMembers]);

    useEffect(() => {
        if (isOpen) {
            setChanges({});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelectChange = (itemId: number, newResponsible: string) => {
        setChanges(prev => ({ ...prev, [itemId]: newResponsible }));
    };

    const handleSave = () => {
        const updates = Object.entries(changes).map(([itemId, newResponsible]) => {
            const item = delegatableItems.find(i => i.id === Number(itemId));
            return {
                itemId: Number(itemId),
                itemType: item!.type,
                newResponsible: newResponsible as string,
            };
        });
        onSave(updates);
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content mass-delegate-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تغییر واگذاری گروهی</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="table-container" style={{ maxHeight: '60vh' }}>
                        <table className="user-list-table mass-delegate-table">
                            <thead>
                                <tr>
                                    <th>پروژه / اقدام</th>
                                    <th>فعالیت / عنوان</th>
                                    <th>مسئول فعلی</th>
                                    <th>مسئول جدید</th>
                                </tr>
                            </thead>
                            <tbody>
                                {delegatableItems.length > 0 ? delegatableItems.map(item => {
                                    const isPendingApproval = item.status === 'ارسال برای تایید';
                                    return (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>{item.parentName}</td>
                                            <td>{item.itemName}</td>
                                            <td>{userMap.get(item.responsible) || item.responsible}</td>
                                            <td>
                                                <select
                                                    className="status-select"
                                                    value={changes[item.id] || item.responsible}
                                                    onChange={(e) => handleSelectChange(item.id, e.target.value)}
                                                    disabled={isPendingApproval}
                                                    title={isPendingApproval ? "امکان تغییر واگذاری در وضعیت منتظر تایید وجود ندارد" : ""}
                                                >
                                                    <option value={item.responsible}>{userMap.get(item.responsible) || item.responsible}</option>
                                                    {assignableUsers
                                                        .filter(u => u.username !== item.responsible)
                                                        .map(user => (
                                                            <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>
                                                        ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center' }}>موردی برای واگذاری یافت نشد.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                    <button type="button" className="save-btn" onClick={handleSave} disabled={Object.keys(changes).length === 0}>
                        ذخیره تغییرات
                    </button>
                </div>
            </div>
        </div>
    );
};