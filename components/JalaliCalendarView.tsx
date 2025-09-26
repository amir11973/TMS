/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import moment from 'moment-jalaali';
import { DetailsIcon } from '../icons';
import { toPersianDigits } from '../utils';

const isDelayed = (task: any) => {
    const displayStatus = task.status === 'ارسال برای تایید' ? task.underlyingStatus : task.status;
    if (displayStatus === 'خاتمه یافته' || !task.endDate) {
        return false;
    }
    const today = moment().startOf('day');
    const endDate = moment(task.endDate).startOf('day');
    return endDate.isBefore(today);
};

export const JalaliCalendarView = ({ items, onViewDetails }: {
    items: any[];
    onViewDetails: (item: any) => void;
}) => {
    const [currentDate, setCurrentDate] = useState(moment());

    const goToNextMonth = () => {
        setCurrentDate(currentDate.clone().add(1, 'jMonth'));
    };

    const goToPreviousMonth = () => {
        setCurrentDate(currentDate.clone().subtract(1, 'jMonth'));
    };

    const calendarGrid = useMemo(() => {
        const startDate = currentDate.clone().startOf('jMonth');
        const endDate = currentDate.clone().endOf('jMonth');
        const startDayOfWeek = startDate.weekday(); // 0 for Saturday, 6 for Friday with 'fa' locale

        const days = [];
        // Add empty cells for days before the start of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ key: `empty-${i}`, day: null, tasks: [] });
        }

        // Add days of the month
        for (let day = startDate.clone(); day.isSameOrBefore(endDate); day.add(1, 'day')) {
            const currentDay = day.clone();
            const tasksForDay = items.filter(item => {
                const itemStart = moment(item.startDate);
                const itemEnd = moment(item.endDate);
                return currentDay.isBetween(itemStart, itemEnd, 'day', '[]');
            });
            days.push({ key: currentDay.format('jYYYY-jMM-jDD'), day: currentDay, tasks: tasksForDay });
        }
        return days;
    }, [currentDate, items]);
    
    const todayStr = moment().format('jYYYY-jMM-jDD');

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <button onClick={goToPreviousMonth}>&lt;</button>
                <h2>{currentDate.format('jMMMM jYYYY')}</h2>
                <button onClick={goToNextMonth}>&gt;</button>
            </div>
            <div className="calendar-grid">
                <div className="calendar-day-header">شنبه</div>
                <div className="calendar-day-header">یکشنبه</div>
                <div className="calendar-day-header">دوشنبه</div>
                <div className="calendar-day-header">سه‌شنبه</div>
                <div className="calendar-day-header">چهارشنبه</div>
                <div className="calendar-day-header">پنجشنبه</div>
                <div className="calendar-day-header">جمعه</div>
                {calendarGrid.map(({ key, day, tasks }) => (
                    <div
                        key={key}
                        className={`calendar-day-cell ${!day ? 'empty' : ''} ${day?.format('jYYYY-jMM-jDD') === todayStr ? 'today' : ''}`}
                    >
                        {day && <span className="day-number">{toPersianDigits(day.jDate())}</span>}
                        <div className="tasks-in-day">
                            {tasks.map(task => (
                                <div
                                    key={`${task.type}-${task.id}`}
                                    className={`calendar-task-item ${isDelayed(task) ? 'delayed' : ''}`}
                                    title={task.title}
                                    onClick={() => onViewDetails(task)}
                                >
                                    <span className="calendar-task-title">{task.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};