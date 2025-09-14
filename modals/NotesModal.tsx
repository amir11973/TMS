/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment-jalaali';
import { User, Note } from '../types';
import { supabase, handleSupabaseError } from '../supabaseClient';
import { EditIcon, DeleteIcon } from '../icons';

export const NotesModal = ({ isOpen, onClose, item, viewMode, currentUser, users, readOnly }: {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    viewMode: 'responsible' | 'approver';
    currentUser: User | null;
    users: User[];
    readOnly?: boolean;
}) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [newNoteContent, setNewNoteContent] = useState('');
    const [isNewNotePrivate, setIsNewNotePrivate] = useState(false);

    const [editingNote, setEditingNote] = useState<Note | null>(null);

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    useEffect(() => {
        if (!isOpen || !item) {
            setNotes([]); // Clear state when modal is not open or has no item
            return;
        }

        const fetchNotes = async () => {
            setIsLoading(true);
            setError('');
            try {
                let query = supabase
                    .from('notes')
                    .select('*')
                    .eq('item_id', item.id)
                    .eq('item_type', item.type)
                    .order('created_at', { ascending: false });

                if (viewMode === 'approver') {
                    query = query.eq('is_private', false);
                }

                const { data, error: fetchError } = await query;
                handleSupabaseError(fetchError, 'fetching notes');
                setNotes(data || []);
            } catch (e: any) {
                setError(`خطا در بارگذاری یادداشت‌ها: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        
        setNotes([]); // Clear notes immediately on open/item change to prevent flicker
        fetchNotes();
    }, [isOpen, item, currentUser, viewMode]);

    const resetForm = () => {
        setNewNoteContent('');
        setIsNewNotePrivate(false);
        setEditingNote(null);
    };

    const handleSaveNote = async () => {
        if (!newNoteContent.trim() || !currentUser || !item) return;
        setIsLoading(true);
        try {
            if (editingNote) { // Update existing note
                const { data, error: updateError } = await supabase
                    .from('notes')
                    .update({ content: newNoteContent, is_private: isNewNotePrivate })
                    .eq('id', editingNote.id)
                    .select()
                    .single();
                handleSupabaseError(updateError, 'updating note');
                if (data) {
                    setNotes(prev => prev.map(n => n.id === data.id ? data : n));
                }
            } else { // Add new note
                const newNote = {
                    item_id: item.id,
                    item_type: item.type,
                    content: newNoteContent,
                    author_username: currentUser.username,
                    is_private: isNewNotePrivate,
                };
                const { data, error: insertError } = await supabase
                    .from('notes')
                    .insert(newNote)
                    .select()
                    .single();
                handleSupabaseError(insertError, 'inserting note');
                if (data) {
                    setNotes(prev => [data, ...prev]);
                }
            }
            resetForm();
        } catch (e: any) {
            setError(`خطا در ذخیره یادداشت: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteNote = async (noteId: number) => {
        if (!window.confirm('آیا از حذف این یادداشت اطمینان دارید؟')) return;
        setIsLoading(true);
        try {
            const { error: deleteError } = await supabase.from('notes').delete().eq('id', noteId);
            handleSupabaseError(deleteError, 'deleting note');
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (e: any) {
            setError(`خطا در حذف یادداشت: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const startEditing = (note: Note) => {
        setEditingNote(note);
        setNewNoteContent(note.content);
        setIsNewNotePrivate(note.is_private);
    };
    
    const handleClose = () => {
        resetForm();
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div className="modal-content details-modal-content" style={{ maxWidth: '45rem' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>یادداشت‌ها برای: {item.title}</h3>
                    <button type="button" className="close-button" onClick={handleClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {!readOnly && (
                        <div className="add-note-form" style={{ background: 'var(--c-bg)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', fontWeight: 500 }}>{editingNote ? 'ویرایش یادداشت' : 'افزودن یادداشت جدید'}</h4>
                            <div className="input-group">
                                <textarea
                                    rows={4}
                                    value={newNoteContent}
                                    onChange={e => setNewNoteContent(e.target.value)}
                                    placeholder="یادداشت خود را اینجا بنویسید..."
                                />
                            </div>
                            <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1rem 0' }}>
                                <input
                                    type="checkbox"
                                    id="note-is-private"
                                    checked={isNewNotePrivate}
                                    onChange={e => setIsNewNotePrivate(e.target.checked)}
                                    style={{ width: 'auto' }}
                                />
                                <label htmlFor="note-is-private" style={{ marginBottom: 0, userSelect: 'none' }}>خصوصی</label>
                            </div>
                        </div>
                    )}
                    
                    <div className="notes-list" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                        {isLoading && notes.length === 0 ? <p>در حال بارگذاری...</p> : null}
                        {error && <p className="error-message">{error}</p>}
                        {notes.length > 0 ? notes.map(note => (
                            <div key={note.id} style={{ borderBottom: '1px solid var(--c-border)', padding: '1rem 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 700 }}>
                                        {userMap.get(note.author_username) || note.author_username}
                                        {note.is_private && <span style={{ fontSize: '0.8em', color: 'var(--c-warning)', marginRight: '8px' }}>(خصوصی)</span>}
                                    </span>
                                    <span style={{ fontSize: '0.8em', color: 'var(--c-text-muted)' }}>
                                        {moment(note.created_at).format('jYYYY/jMM/jDD HH:mm')}
                                    </span>
                                </div>
                                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{note.content}</p>
                                {currentUser?.username === note.author_username && !readOnly && (
                                    <div style={{ textAlign: 'left' }}>
                                        <button className="icon-btn edit-btn" title="ویرایش" onClick={() => startEditing(note)}>
                                            <EditIcon />
                                        </button>
                                        <button className="icon-btn delete-btn" title="حذف" onClick={() => handleDeleteNote(note.id)}>
                                            <DeleteIcon />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )) : !isLoading && <p>هیچ یادداشتی برای نمایش وجود ندارد.</p>}
                    </div>
                </div>
                <div className="modal-footer">
                    {readOnly ? (
                        <button type="button" className="cancel-btn" onClick={handleClose}>بستن</button>
                    ) : (
                        <>
                            {editingNote && <button type="button" className="cancel-btn" onClick={resetForm}>انصراف از ویرایش</button>}
                            <button type="button" className="save-btn" onClick={handleSaveNote} disabled={isLoading || !newNoteContent.trim()}>
                                {editingNote ? 'ذخیره تغییرات' : 'ثبت یادداشت'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};