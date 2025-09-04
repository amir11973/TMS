/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ThemeIcon, TableIcon, LightModeIcon, DarkModeIcon, EditIcon, DeleteIcon } from '../icons';

export const SettingsPage = ({ theme, onThemeChange, sections, onAddSection, onUpdateSection, onDeleteSection, currentUser }: {
    theme: string;
    onThemeChange: (theme: string) => void;
    sections: string[];
    onAddSection: (name: string) => void;
    onUpdateSection: (oldName: string, newName: string) => void;
    onDeleteSection: (name: string) => void;
    currentUser: User | null;
}) => {
    const [view, setView] = useState('theme'); // 'theme' or 'units'
    const [newSection, setNewSection] = useState('');
    const [editingSection, setEditingSection] = useState<{ old: string, new: string } | null>(null);

    const isAdmin = currentUser?.username === 'mahmoudi.pars@gmail.com';

    useEffect(() => {
        if (!isAdmin && view === 'units') {
            setView('theme');
        }
    }, [isAdmin, view]);

    const handleAddOrUpdateSection = () => {
        if (editingSection) {
            onUpdateSection(editingSection.old, editingSection.new);
            setEditingSection(null);
        } else {
            onAddSection(newSection);
            setNewSection('');
        }
    };

    const startEditing = (sectionName: string) => {
        setEditingSection({ old: sectionName, new: sectionName });
    };

    return (
        <div className="settings-page-container">
            <div className="settings-button-bar">
                <button className={`settings-view-btn ${view === 'theme' ? 'active' : ''}`} onClick={() => setView('theme')}>
                    <ThemeIcon />
                    <span>پوسته</span>
                </button>
                {isAdmin && (
                    <button className={`settings-view-btn ${view === 'units' ? 'active' : ''}`} onClick={() => setView('units')}>
                        <TableIcon />
                        <span>مدیریت بخشها</span>
                    </button>
                )}
            </div>
            <div className="settings-content-area">
                {view === 'theme' && (
                    <>
                        <h3 className="list-section-header">انتخاب پوسته برنامه</h3>
                        <div className="theme-selector">
                            <div className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => onThemeChange('dark')}>
                                <DarkModeIcon />
                                <span>تیره</span>
                            </div>
                            <div className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => onThemeChange('light')}>
                                <LightModeIcon />
                                <span>روشن</span>
                            </div>
                        </div>
                    </>
                )}
                 {view === 'units' && isAdmin && (
                    <>
                        <h3 className="list-section-header">مدیریت بخشهای سازمانی</h3>
                         <div className="unit-management-form">
                            <div className="input-group">
                               <label htmlFor="unit-name-input">نام بخش</label>
                               <input 
                                   id="unit-name-input"
                                   value={editingSection ? editingSection.new : newSection}
                                   onChange={e => editingSection ? setEditingSection({...editingSection, new: e.target.value}) : setNewSection(e.target.value)}
                               />
                            </div>
                            <button className="add-user-button" onClick={handleAddOrUpdateSection}>
                                {editingSection ? 'ذخیره تغییرات' : 'افزودن بخش'}
                            </button>
                            {editingSection && <button className="cancel-btn" onClick={() => setEditingSection(null)}>انصراف</button>}
                        </div>
                        <div className="table-wrapper">
                            <table className="user-list-table">
                                <thead>
                                    <tr>
                                        <th>نام بخش</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sections.map(section => (
                                        <tr key={section}>
                                            <td>{section}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="icon-btn edit-btn" title="ویرایش" onClick={() => startEditing(section)}>
                                                        <EditIcon />
                                                    </button>
                                                    <button className="icon-btn delete-btn" title="حذف" onClick={() => onDeleteSection(section)}>
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};