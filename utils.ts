/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const toPersianDigits = (n: number | string | null | undefined): string => {
    if (n === null || n === undefined) return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(n).replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
};
