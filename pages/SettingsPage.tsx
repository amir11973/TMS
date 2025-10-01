/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { User, CustomField } from '../types';
import { ThemeIcon, TableIcon, LightModeIcon, DarkModeIcon, EditIcon, DeleteIcon, CustomFieldsIcon } from '../icons';

export const SettingsPage = ({ 
    theme, 
    onThemeChange, 
    sections, 
    onAddSection, 
    onUpdateSection, 
    onDeleteSection, 
    currentUser,
    customFields,
    onOpenCustomFieldModal,
    onDeleteCustomField
}: {
    theme: string;
    onThemeChange: (theme: string) => void;
    sections: string[];
    onAddSection: (name: string) => void;
    onUpdateSection: (oldName: string, newName: string) => void;
    onDeleteSection: (name: string) => void;
    currentUser: User | null;
    customFields: CustomField[];
    onOpenCustomFieldModal: (field: CustomField | null) => void;
    onDeleteCustomField: (id: number) => void;
}) => {
    const [view, setView] = useState('theme'); // 'theme', 'units', or 'custom_fields'
    const [newSection, setNewSection] = useState('');
    const [editingSection, setEditingSection] = useState<{ old: string, new: string } | null>(null);

    const isAdmin = currentUser?.username === 'mahmoudi.pars@gmail.com';

    const userCustomFields = customFields.filter(field => currentUser && field.owner_username === currentUser.username);


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
                <button className={`settings-view-btn ${view === 'custom_fields' ? 'active' : ''}`} onClick={() => setView('custom_fields')}>
                    <CustomFieldsIcon />
                    <span>فیلدهای سفارشی</span>
                </button>
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
                            {editingSection && <button type="button" className="cancel-btn" onClick={() => setEditingSection(null)}>انصراف</button>}
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
                 {view === 'custom_fields' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 className="list-section-header" style={{ marginBottom: 0, borderBottom: 'none' }}>مدیریت فیلدهای سفارشی</h3>
                            <button className="add-user-button" onClick={() => onOpenCustomFieldModal(null)}>ایجاد فیلد جدید</button>
                        </div>
                        <div className="table-wrapper">
                            <table className="user-list-table">
                                <thead>
                                    <tr>
                                        <th>عنوان فیلد</th>
                                        <th>گروه</th>
                                        <th>خصوصی</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userCustomFields.map(field => (
                                        <tr key={field.id}>
                                            <td>{field.title}</td>
                                            <td>{{
                                                'project': 'پروژه',
                                                'action': 'اقدام',
                                                'activity': 'فعالیت پروژه'
                                            }[field.field_group]}</td>
                                            <td>{field.is_private ? 'بله' : 'خیر'}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="icon-btn edit-btn" title="ویرایش" onClick={() => onOpenCustomFieldModal(field)}>
                                                        <EditIcon />
                                                    </button>
                                                    <button className="icon-btn delete-btn" title="حذف" onClick={() => onDeleteCustomField(field.id)}>
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
