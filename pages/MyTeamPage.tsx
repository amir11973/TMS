/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User, TeamMember, TeamMemberRole } from '../types';
import { DeleteIcon } from '../icons';

export const MyTeamPage = ({ allUsers, currentUser, teamMembers, onAddMember, onRemoveMember, onUpdateRole }: {
    allUsers: User[];
    currentUser: User | null;
    teamMembers: TeamMember[];
    onAddMember: (username: string, role: TeamMemberRole) => void;
    onRemoveMember: (username: string) => void;
    onUpdateRole: (username: string, role: TeamMemberRole) => void;
}) => {
    const [userToAdd, setUserToAdd] = useState('');

    const usersAvailableToAdd = useMemo(() => {
        if (!currentUser) return [];
        return allUsers.filter(u => !teamMembers.some(tm => tm.username === u.username));
    }, [allUsers, teamMembers, currentUser]);
    
    const handleAddClick = () => {
        if (!userToAdd) return;
        
        const userExists = usersAvailableToAdd.some(u => u.username === userToAdd);
        if (userExists) {
            const role = userToAdd === currentUser!.username ? 'ادمین' : 'عضو تیم';
            onAddMember(userToAdd, role);
            setUserToAdd('');
        } else {
            alert('لطفا یک کاربر معتبر از لیست انتخاب کنید یا نام کاربری را به درستی وارد کنید.');
        }
    };
    
    if (!currentUser) {
        return null;
    }

    return (
        <div className="user-management-page">
            <div className="add-user-form">
                <h3>افزودن عضو به تیم</h3>
                <div className="input-group">
                    <label htmlFor="team-user-input">انتخاب کاربر</label>
                     <input 
                        id="team-user-input"
                        list="team-user-suggestions"
                        value={userToAdd}
                        onChange={(e) => setUserToAdd(e.target.value)}
                        placeholder="نام کاربری را جستجو یا انتخاب کنید..."
                     />
                     <datalist id="team-user-suggestions">
                        {usersAvailableToAdd.map(u => <option key={u.id} value={u.username} />)}
                    </datalist>
                </div>
                <button className="add-user-button" onClick={handleAddClick} disabled={!userToAdd}>افزودن</button>
            </div>
            <div className="table-wrapper">
                <table className="user-list-table">
                    <thead>
                        <tr>
                            <th>نام و نام خانوادگی</th>
                            <th>نام کاربری</th>
                            <th>نقش در تیم</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamMembers.map(member => {
                            const userDetails = allUsers.find(u => u.username === member.username);
                            const isCurrentUser = member.username === currentUser.username;
                            return (
                                <tr key={member.username}>
                                    <td>{userDetails?.full_name}</td>
                                    <td>{member.username}</td>
                                    <td>
                                        <select 
                                            className="status-select"
                                            value={member.role} 
                                            onChange={e => onUpdateRole(member.username, e.target.value as TeamMemberRole)}
                                            disabled={isCurrentUser}
                                        >
                                            <option value="ادمین">ادمین</option>
                                            <option value="مدیر">مدیر</option>
                                            <option value="عضو تیم">عضو تیم</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button 
                                            className="icon-btn delete-btn" 
                                            title={isCurrentUser ? "امکان حذف کاربر جاری از تیم وجود ندارد" : "حذف از تیم"} 
                                            onClick={() => onRemoveMember(member.username)}
                                            disabled={isCurrentUser}
                                        >
                                            <DeleteIcon />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};