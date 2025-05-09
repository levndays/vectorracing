// js/utils.js

/**
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

// Add any other general utility functions here as your project grows.
// For example, a function to get a random integer in a range:
/*
export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
*/