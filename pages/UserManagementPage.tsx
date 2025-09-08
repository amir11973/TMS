/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent } from 'react';
import { User } from '../types';
import { EditIcon, DeleteIcon, PowerIcon, DetailsIcon } from '../icons';

export const UserManagementPage = ({ users, onAddUser, onDeleteUser, onToggleUserActive, onEditUser, onShowUserInfo }: {
    users: User[];
    onAddUser: (details: { username: string, password: string, fullName: string }) => void;
    onDeleteUser: (id: number) => void;
    onToggleUserActive: (id: number) => void;
    onEditUser: (id: number) => void;
    onShowUserInfo: (user: User) => void;
}) => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleAddUser = (e: FormEvent) => {
        e.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(username)) {
            alert('لطفا یک ایمیل معتبر به عنوان نام کاربری وارد کنید.');
            return;
        }
        if (password !== confirmPassword) {
            alert('رمز عبور و تکرار آن یکسان نیستند.');
            return;
        }
        onAddUser({ username, password, fullName });
        setFullName('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="user-management-page">
            <form className="add-user-form" onSubmit={handleAddUser}>
                <h3>افزودن کاربر جدید</h3>
                <div className="input-group">
                    <label htmlFor="new-fullname">نام و نام خانوادگی</label>
                    <input type="text" id="new-fullname" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label htmlFor="new-username">نام کاربری (ایمیل)</label>
                    <input type="email" id="new-username" value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label htmlFor="new-password">رمز عبور</label>
                    <input type="password" id="new-password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label htmlFor="confirm-password">تکرار رمز عبور</label>
                    <input type="password" id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <button type="submit" className="add-user-button">افزودن</button>
            </form>
            <div className="table-wrapper">
                <table className="user-list-table">
                    <thead>
                        <tr>
                            <th>نام و نام خانوادگی</th>
                            <th>نام کاربری</th>
                            <th>وضعیت</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.full_name}</td>
                                <td>{user.username}</td>
                                <td>
                                    <span className={user.is_active ? 'status-active' : 'status-inactive'}>
                                        {user.is_active ? 'فعال' : 'غیرفعال'}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons-grid">
                                        <div className="action-buttons-row">
                                            <button className="icon-btn details-btn" title="اطلاعات" onClick={() => onShowUserInfo(user)}>
                                                <DetailsIcon />
                                            </button>
                                            <button className="icon-btn edit-btn" title="ویرایش" onClick={() => onEditUser(user.id)}>
                                                <EditIcon />
                                            </button>
                                        </div>
                                        <div className="action-buttons-row">
                                            <button
                                                className="icon-btn"
                                                title={user.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                                                onClick={() => onToggleUserActive(user.id)}
                                                style={{ color: user.is_active ? 'var(--c-warning)' : 'var(--c-success)' }}
                                            >
                                                <PowerIcon />
                                            </button>
                                            <button className="icon-btn delete-btn" title="حذف" onClick={() => onDeleteUser(user.id)} disabled={user.username === 'mahmoudi.pars@gmail.com'}>
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};