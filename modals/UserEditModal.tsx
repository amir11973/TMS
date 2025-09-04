/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, FormEvent } from 'react';
import { User } from '../types';

export const UserEditModal = ({ isOpen, onClose, onSave, userToEdit }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: any) => void;
    userToEdit: User | null;
}) => {
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (userToEdit) {
            setFullName(userToEdit.full_name || '');
            setPassword(''); // Reset password on open
        }
    }, [userToEdit]);

    if (!isOpen || !userToEdit) return null;

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        const updatedData: any = { ...userToEdit, full_name: fullName };
        if (password) {
            updatedData.new_password = password;
        }
        onSave(updatedData);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="modal-header">
                        <h3>ویرایش کاربر: {userToEdit.username}</h3>
                        <button type="button" className="close-button" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="input-group">
                            <label htmlFor="edit-fullname">نام و نام خانوادگی</label>
                            <input 
                                id="edit-fullname" 
                                value={fullName} 
                                onChange={e => setFullName(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="edit-username">نام کاربری</label>
                            <input id="edit-username" value={userToEdit.username} disabled />
                        </div>
                        <div className="input-group">
                            <label htmlFor="edit-password">رمز عبور جدید</label>
                            <input 
                                type="password" 
                                id="edit-password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                placeholder="برای عدم تغییر، خالی بگذارید" 
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                        <button type="submit" className="save-btn">ذخیره</button>
                    </div>
                </form>
            </div>
        </div>
    );
};