// js/utils.js

/*
 * Converts a HEX color string to an RGBA string.
 * @param {string} hex - The HEX color string (e.g., "#RRGGBB").
 * @param {number} [alpha=1] - The alpha value (0 to 1).
 * @returns {string} The RGBA color string.
 */

export function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
        console.warn("Invalid hex color provided to hexToRgba:", hex);
        return `rgba(0,0,0,${alpha})`; // Default to black if invalid
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn("Error parsing hex color components:", hex);
        return `rgba(0,0,0,${alpha})`; // Default to black
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Deep copies an array of arrays (like a grid).
 * @param {Array<Array<any>>} grid The grid to copy.
 * @returns {Array<Array<any>>} A new deep-copied grid.
 */
export function deepCopyGrid(grid) {
    if (!grid) return [];
    return grid.map(row => Array.isArray(row) ? [...row] : row);
}