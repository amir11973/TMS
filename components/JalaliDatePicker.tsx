/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import moment from 'moment-jalaali';
import { toPersianDigits } from '../utils';

const jalaaliMonths = [
    { value: 1, name: 'فروردین' }, { value: 2, name: 'اردیبهشت' },
    { value: 3, name: 'خرداد' }, { value: 4, name: 'تیر' },
    { value: 5, name: 'مرداد' }, { value: 6, name: 'شهریور' },
    { value: 7, name: 'مهر' }, { value: 8, name: 'آبان' },
    { value: 9, name: 'آذر' }, { value: 10, name: 'دی' },
    { value: 11, name: 'بهمن' }, { value: 12, name: 'اسفند' },
];

export const JalaliDatePicker = ({ value, onChange, name, id, required, disabled }: {
    value: string;
    onChange: (event: any) => void;
    name: string;
    id: string;
    required?: boolean;
    disabled?: boolean;
}) => {
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');

    useEffect(() => {
        if (value && moment(value).isValid()) {
            const m = moment(value);
            setYear(m.jYear().toString());
            setMonth((m.jMonth() + 1).toString()); // moment-jalaali months are 0-indexed
            setDay(m.jDate().toString());
        } else {
            const today = moment();
            setYear(today.jYear().toString());
            setMonth((today.jMonth() + 1).toString());
            setDay(today.jDate().toString());
        }
    }, [value]);

    const handleDateChange = (part: 'year' | 'month' | 'day', newValue: string) => {
        let newYear = year, newMonth = month, newDay = day;

        if (part === 'year') {
            newYear = newValue;
            setYear(newValue);
        } else if (part === 'month') {
            newMonth = newValue;
            setMonth(newValue);
        } else if (part === 'day') {
            newDay = newValue;
            setDay(newValue);
        }
        
        // Use timeout to let state updates apply before calculating new date
        setTimeout(() => {
            const finalYear = part === 'year' ? newValue : year;
            const finalMonth = part === 'month' ? newValue : month;
            const finalDay = part === 'day' ? newValue : day;

            if (finalYear && finalMonth && finalDay) {
                // Ensure the day is valid for the selected month/year
                const daysInSelectedMonth = moment.jDaysInMonth(parseInt(finalYear), parseInt(finalMonth) - 1);
                const validatedDay = Math.min(parseInt(finalDay), daysInSelectedMonth).toString();
                if (finalDay !== validatedDay) {
                    setDay(validatedDay);
                }

                const jDateStr = `${finalYear}/${finalMonth}/${validatedDay}`;
                const m = moment(jDateStr, 'jYYYY/jMM/jDD');
                
                if (m.isValid()) {
                    // FIX: Manually construct the ISO date string with Gregorian (Latin) numbers
                    // to ensure compatibility with the database, regardless of the global
                    // moment.js locale settings which may use Persian digits.
                    const yearG = m.year();
                    const monthG = m.month() + 1; // moment months are 0-indexed
                    const dayG = m.date();
                    const isoString = `${yearG}-${String(monthG).padStart(2, '0')}-${String(dayG).padStart(2, '0')}`;
                    
                    const event = {
                        target: { name, value: isoString },
                    };
                    onChange(event);
                }
            }
        }, 0);
    };

    const currentJalaaliYear = moment().jYear();
    const yearOptions = Array.from({ length: 21 }, (_, i) => currentJalaaliYear - 10 + i);

    const daysInMonth = (year && month) ? moment.jDaysInMonth(parseInt(year), parseInt(month) - 1) : 31;
    const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="jalali-datepicker-container">
            <select
                value={day}
                onChange={(e) => handleDateChange('day', e.target.value)}
                disabled={disabled}
                required={required}
                aria-label="Day"
            >
                {dayOptions.map(d => <option key={d} value={d}>{toPersianDigits(d)}</option>)}
            </select>
            <select
                value={month}
                onChange={(e) => handleDateChange('month', e.target.value)}
                disabled={disabled}
                required={required}
                aria-label="Month"
            >
                {jalaaliMonths.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
            </select>
            <select
                value={year}
                onChange={(e) => handleDateChange('year', e.target.value)}
                disabled={disabled}
                required={required}
                aria-label="Year"
            >
                {yearOptions.map(y => <option key={y} value={y}>{toPersianDigits(y)}</option>)}
            </select>
            <input type="hidden" name={name} id={id} value={value || ''} />
        </div>
    );
};
