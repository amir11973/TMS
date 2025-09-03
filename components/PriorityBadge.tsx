/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const renderPriorityBadge = (priority: string | null | undefined) => {
    if (!priority) return '—';
    const priorityClass = {
        'کم': 'low',
        'متوسط': 'medium',
        'زیاد': 'high'
    }[priority] || 'medium';

    return <span className={`priority-badge priority-${priorityClass}`}>{priority}</span>;
};
