/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';

export const DelegateTaskModal = ({ isOpen, onClose, onDelegate, item, users }: {
    isOpen: boolean;
    onClose: () => void;
    onDelegate: (newResponsible: string) => void;
    item: any;
    users: User[];
}) => {
    const [selectedUser, setSelectedUser] = useState('');

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    useEffect(() => {
        if (item && users) {
            const otherUsers = users.filter(u => u.username !== item.responsible);
            if (otherUsers.length > 0) {
                setSelectedUser(otherUsers[0].username);
            } else {
                setSelectedUser('');
            }
        }
    }, [item, users]);
    
    if (!isOpen) return null;

    const handleDelegate = () => {
        if (selectedUser) {
            onDelegate(selectedUser);
        }
    };

    const availableUsers = users.filter(u => u.username !== item.responsible);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>واگذاری مسئولیت</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p style={{marginBottom: '16px'}}>واگذاری مسئولیت آیتم: <strong>{item?.title}</strong></p>
                    {availableUsers.length > 0 ? (
                        <div className="input-group">
                            <label htmlFor="delegate-user">کاربر جدید</label>
                            <select 
                                id="delegate-user"
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                                required
                            >
                                {availableUsers.map(user => (
                                    <option key={user.id} value={user.username}>{userMap.get(user.username) || user.username}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p>کاربر دیگری برای واگذاری مسئولیت وجود ندارد.</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                    <button 
                        type="button" 
                        className="save-btn" 
                        onClick={handleDelegate}
                        disabled={!selectedUser || availableUsers.length === 0}
                    >
                        واگذاری
                    </button>
                </div>
            </div>
        </div>
    );
};