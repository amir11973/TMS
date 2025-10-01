/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { CustomField } from '../types';

export const CustomFieldModal = ({ isOpen, onClose, onSave, fieldToEdit }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (field: any) => void;
    fieldToEdit: CustomField | null;
}) => {
    const initialFieldState = { title: '', field_group: 'project' as 'project' | 'action' | 'activity', is_private: false };
    const [field, setField] = useState<any>(initialFieldState);

    useEffect(() => {
        if (isOpen) {
            setField(fieldToEdit ? { ...fieldToEdit } : initialFieldState);
        }
    }, [isOpen, fieldToEdit]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setField((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(field);
    };

    const modalTitle = fieldToEdit ? "ویرایش فیلد سفارشی" : "ایجاد فیلد سفارشی جدید";

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="modal-header">
                        <h3>{modalTitle}</h3>
                        <button type="button" className="close-button" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="input-group">
                            <label htmlFor="field-title">عنوان فیلد</label>
                            <input name="title" id="field-title" value={field.title} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="field-group">گروه فیلد</label>
                            <select name="field_group" id="field-group" value={field.field_group} onChange={handleChange} required>
                                <option value="project">پروژه</option>
                                <option value="action">اقدام</option>
                                <option value="activity">فعالیت پروژه</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                name="is_private"
                                id="field-is_private"
                                checked={field.is_private}
                                onChange={handleChange}
                                style={{ width: 'auto' }}
                            />
                            <label htmlFor="field-is_private" style={{ marginBottom: 0, userSelect: 'none' }}>فیلد خصوصی (فقط برای شما قابل مشاهده است)</label>
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
