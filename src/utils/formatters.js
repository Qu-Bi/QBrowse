/**
 * Format a number into short compact form (e.g. 1.1k, 25.6k, 122.7k, 1.5M)
 * @param {number|string} number
 * @returns {string}
 */
export const formatCompactNumber = (number) => {
    const num = Number(number) || 0;
    if (num < 1000) return num.toString();
    if (num < 1000000) {
        const val = (num / 1000).toFixed(1);
        return (val.endsWith('.0') ? (num / 1000).toFixed(0) : val) + 'k';
    }
    if (num < 1000000000) {
        const val = (num / 1000000).toFixed(1);
        return (val.endsWith('.0') ? (num / 1000000).toFixed(0) : val) + 'M';
    }
    const val = (num / 1000000000).toFixed(1);
    return (val.endsWith('.0') ? (num / 1000000000).toFixed(0) : val) + 'B';
};
