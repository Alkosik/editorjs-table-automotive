/**
 * Automotive-specific utilities for table plugin
 * Handles gradient coloring and value smoothing for calibration maps
 */

/**
 * Color schemes for automotive maps
 */
export const COLOR_SCHEMES = {
	THERMAL: {
		name: 'Thermal',
		colors: [
			{ value: 0, color: [0, 0, 255] }, // Blue
			{ value: 0.25, color: [0, 255, 255] }, // Cyan
			{ value: 0.5, color: [0, 255, 0] }, // Green
			{ value: 0.75, color: [255, 255, 0] }, // Yellow
			{ value: 1, color: [255, 0, 0] }, // Red
		],
	},
	GRAYSCALE: {
		name: 'Grayscale',
		colors: [
			{ value: 0, color: [255, 255, 255] }, // White
			{ value: 1, color: [0, 0, 0] }, // Black
		],
	},
	VIRIDIS: {
		name: 'Viridis',
		colors: [
			{ value: 0, color: [68, 1, 84] },
			{ value: 0.25, color: [59, 82, 139] },
			{ value: 0.5, color: [33, 145, 140] },
			{ value: 0.75, color: [94, 201, 98] },
			{ value: 1, color: [253, 231, 37] },
		],
	},
	AUTOMOTIVE: {
		name: 'Automotive',
		colors: [
			{ value: 0, color: [30, 30, 180] }, // Dark Blue
			{ value: 0.2, color: [60, 120, 220] }, // Blue
			{ value: 0.4, color: [100, 200, 100] }, // Green
			{ value: 0.6, color: [255, 200, 60] }, // Yellow
			{ value: 0.8, color: [255, 120, 30] }, // Orange
			{ value: 1, color: [220, 20, 20] }, // Red
		],
	},
};

/**
 * Parse cell content to extract numeric value
 *
 * @param {string} content - cell HTML content
 * @returns {number|null} - parsed number or null if not numeric
 */
export function parseNumericValue(content) {
	if (!content) return null;

	// Strip HTML tags
	const text = content.replace(/<[^>]*>/g, '').trim();

	// Try to parse as number
	const num = parseFloat(text);

	return isNaN(num) ? null : num;
}

/**
 * Get min and max values from table data
 *
 * @param {string[][]} content - 2D array of cell contents
 * @param {boolean} skipFirstRow - skip first row if it's a heading
 * @param {boolean} skipFirstColumn - skip first column if it contains labels
 * @returns {{min: number, max: number, hasValues: boolean}}
 */
export function getMinMaxValues(
	content,
	skipFirstRow = false,
	skipFirstColumn = false,
) {
	let min = Infinity;
	let max = -Infinity;
	let hasValues = false;

	const startRow = skipFirstRow ? 1 : 0;
	const startCol = skipFirstColumn ? 1 : 0;

	for (let i = startRow; i < content.length; i++) {
		for (let j = startCol; j < content[i].length; j++) {
			const value = parseNumericValue(content[i][j]);
			if (value !== null) {
				hasValues = true;
				min = Math.min(min, value);
				max = Math.max(max, value);
			}
		}
	}

	return hasValues
		? { min, max, hasValues: true }
		: { min: 0, max: 1, hasValues: false };
}

/**
 * Interpolate between two RGB colors
 *
 * @param {number[]} color1 - RGB array [r, g, b]
 * @param {number[]} color2 - RGB array [r, g, b]
 * @param {number} factor - interpolation factor (0-1)
 * @returns {number[]} - interpolated RGB color
 */
function interpolateColor(color1, color2, factor) {
	return [
		Math.round(color1[0] + (color2[0] - color1[0]) * factor),
		Math.round(color1[1] + (color2[1] - color1[1]) * factor),
		Math.round(color1[2] + (color2[2] - color1[2]) * factor),
	];
}

/**
 * Get color for a normalized value (0-1) based on color scheme
 *
 * @param {number} normalizedValue - value between 0 and 1
 * @param {object} colorScheme - color scheme object
 * @returns {string} - RGB color string
 */
export function getColorForValue(normalizedValue, colorScheme) {
	const { colors } = colorScheme;

	// Clamp value between 0 and 1
	normalizedValue = Math.max(0, Math.min(1, normalizedValue));

	// Find the two color stops to interpolate between
	let lowerStop = colors[0];
	let upperStop = colors[colors.length - 1];

	for (let i = 0; i < colors.length - 1; i++) {
		if (
			normalizedValue >= colors[i].value &&
			normalizedValue <= colors[i + 1].value
		) {
			lowerStop = colors[i];
			upperStop = colors[i + 1];
			break;
		}
	}

	// Calculate interpolation factor
	const range = upperStop.value - lowerStop.value;
	const factor = range === 0 ? 0 : (normalizedValue - lowerStop.value) / range;

	// Interpolate color
	const rgb = interpolateColor(lowerStop.color, upperStop.color, factor);

	return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * Calculate background color and text color for a cell
 *
 * @param {number} value - numeric value
 * @param {number} min - minimum value in dataset
 * @param {number} max - maximum value in dataset
 * @param {object} colorScheme - color scheme to use
 * @returns {{backgroundColor: string, textColor: string}}
 */
export function getCellColors(value, min, max, colorScheme) {
	const range = max - min;
	const normalizedValue = range === 0 ? 0.5 : (value - min) / range;

	const backgroundColor = getColorForValue(normalizedValue, colorScheme);

	// Determine if we need light or dark text based on background brightness
	const rgb = backgroundColor.match(/\d+/g).map(Number);
	const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
	const textColor = brightness > 128 ? '#000000' : '#ffffff';

	return { backgroundColor, textColor };
}

/**
 * Smoothing algorithms
 */

/**
 * Apply moving average smoothing to a 2D array
 *
 * @param {string[][]} content - 2D array of cell contents
 * @param {number} windowSize - size of smoothing window (must be odd)
 * @param {boolean} skipFirstRow - skip first row if it's a heading
 * @param {boolean} skipFirstColumn - skip first column if it contains labels
 * @returns {string[][]} - smoothed content
 */
export function applyMovingAverage(
	content,
	windowSize = 3,
	skipFirstRow = false,
	skipFirstColumn = false,
) {
	if (windowSize % 2 === 0) {
		windowSize += 1; // Ensure window size is odd
	}

	const halfWindow = Math.floor(windowSize / 2);
	const result = content.map((row) => [...row]);

	const startRow = skipFirstRow ? 1 : 0;
	const startCol = skipFirstColumn ? 1 : 0;

	for (let i = startRow; i < content.length; i++) {
		for (let j = startCol; j < content[i].length; j++) {
			const value = parseNumericValue(content[i][j]);
			if (value === null) continue;

			let sum = 0;
			let count = 0;

			// Collect values in window
			for (let di = -halfWindow; di <= halfWindow; di++) {
				for (let dj = -halfWindow; dj <= halfWindow; dj++) {
					const ni = i + di;
					const nj = j + dj;

					if (
						ni >= startRow &&
						ni < content.length &&
						nj >= startCol &&
						nj < content[i].length
					) {
						const neighborValue = parseNumericValue(content[ni][nj]);
						if (neighborValue !== null) {
							sum += neighborValue;
							count++;
						}
					}
				}
			}

			if (count > 0) {
				const smoothedValue = sum / count;
				// Preserve precision based on original value
				const decimals = content[i][j].includes('.')
					? (content[i][j].split('.')[1] || '').replace(/<[^>]*>/g, '')
							.length
					: 0;
				result[i][j] = smoothedValue.toFixed(Math.max(decimals, 2));
			}
		}
	}

	return result;
}

/**
 * Apply Gaussian smoothing to a 2D array
 *
 * @param {string[][]} content - 2D array of cell contents
 * @param {number} sigma - standard deviation for Gaussian kernel
 * @param {boolean} skipFirstRow - skip first row if it's a heading
 * @param {boolean} skipFirstColumn - skip first column if it contains labels
 * @returns {string[][]} - smoothed content
 */
export function applyGaussianSmoothing(
	content,
	sigma = 1.0,
	skipFirstRow = false,
	skipFirstColumn = false,
) {
	const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
	const halfSize = Math.floor(kernelSize / 2);

	// Generate Gaussian kernel
	const kernel = [];
	let kernelSum = 0;

	for (let i = -halfSize; i <= halfSize; i++) {
		const row = [];
		for (let j = -halfSize; j <= halfSize; j++) {
			const value = Math.exp(-(i * i + j * j) / (2 * sigma * sigma));
			row.push(value);
			kernelSum += value;
		}
		kernel.push(row);
	}

	// Normalize kernel
	for (let i = 0; i < kernel.length; i++) {
		for (let j = 0; j < kernel[i].length; j++) {
			kernel[i][j] /= kernelSum;
		}
	}

	const result = content.map((row) => [...row]);
	const startRow = skipFirstRow ? 1 : 0;
	const startCol = skipFirstColumn ? 1 : 0;

	for (let i = startRow; i < content.length; i++) {
		for (let j = startCol; j < content[i].length; j++) {
			const value = parseNumericValue(content[i][j]);
			if (value === null) continue;

			let sum = 0;
			let weightSum = 0;

			// Apply kernel
			for (let ki = 0; ki < kernel.length; ki++) {
				for (let kj = 0; kj < kernel[ki].length; kj++) {
					const ni = i + ki - halfSize;
					const nj = j + kj - halfSize;

					if (
						ni >= startRow &&
						ni < content.length &&
						nj >= startCol &&
						nj < content[i].length
					) {
						const neighborValue = parseNumericValue(content[ni][nj]);
						if (neighborValue !== null) {
							sum += neighborValue * kernel[ki][kj];
							weightSum += kernel[ki][kj];
						}
					}
				}
			}

			if (weightSum > 0) {
				const smoothedValue = sum / weightSum;
				const decimals = content[i][j].includes('.')
					? (content[i][j].split('.')[1] || '').replace(/<[^>]*>/g, '')
							.length
					: 0;
				result[i][j] = smoothedValue.toFixed(Math.max(decimals, 2));
			}
		}
	}

	return result;
}

/**
 * Apply bilinear interpolation smoothing
 *
 * @param {string[][]} content - 2D array of cell contents
 * @param {boolean} skipFirstRow - skip first row if it's a heading
 * @param {boolean} skipFirstColumn - skip first column if it contains labels
 * @returns {string[][]} - smoothed content
 */
export function applyBilinearInterpolation(
	content,
	skipFirstRow = false,
	skipFirstColumn = false,
) {
	const result = content.map((row) => [...row]);
	const startRow = skipFirstRow ? 1 : 0;
	const startCol = skipFirstColumn ? 1 : 0;

	for (let i = startRow; i < content.length; i++) {
		for (let j = startCol; j < content[i].length; j++) {
			const value = parseNumericValue(content[i][j]);
			if (value === null) continue;

			const neighbors = [];

			// Get 4-connected neighbors
			if (i > startRow) {
				const v = parseNumericValue(content[i - 1][j]);
				if (v !== null) neighbors.push(v);
			}
			if (i < content.length - 1) {
				const v = parseNumericValue(content[i + 1][j]);
				if (v !== null) neighbors.push(v);
			}
			if (j > startCol) {
				const v = parseNumericValue(content[i][j - 1]);
				if (v !== null) neighbors.push(v);
			}
			if (j < content[i].length - 1) {
				const v = parseNumericValue(content[i][j + 1]);
				if (v !== null) neighbors.push(v);
			}

			if (neighbors.length > 0) {
				const smoothedValue =
					(value + neighbors.reduce((a, b) => a + b, 0)) /
					(neighbors.length + 1);
				const decimals = content[i][j].includes('.')
					? (content[i][j].split('.')[1] || '').replace(/<[^>]*>/g, '')
							.length
					: 0;
				result[i][j] = smoothedValue.toFixed(Math.max(decimals, 2));
			}
		}
	}

	return result;
}

/**
 * Auto-fill blank cells using weighted interpolation
 * Does not affect existing values, only fills in empty cells
 *
 * @param {string[][]} content - table content
 * @param {boolean} skipFirstRow - whether to skip first row
 * @param {boolean} skipFirstColumn - whether to skip first column
 * @returns {string[][]} - table with filled values
 */
export function autoFillBlanks(
	content,
	skipFirstRow = false,
	skipFirstColumn = false,
) {
	const result = content.map((row) => [...row]);
	const startRow = skipFirstRow ? 1 : 0;
	const startCol = skipFirstColumn ? 1 : 0;

	// Helper function to check if a cell is empty or whitespace only
	const isEmpty = (cell) => {
		if (!cell) return true;
		const cleaned = cell.replace(/<[^>]*>/g, '').trim();
		return cleaned === '' || cleaned === '&nbsp;';
	};

	// Helper function to count decimal places in a cell
	const getDecimalPlaces = (cell) => {
		const cleaned = cell.replace(/<[^>]*>/g, '').trim();
		if (!cleaned.includes('.')) return 0;
		const parts = cleaned.split('.');
		return parts[1] ? parts[1].length : 0;
	};

	// Helper function to find nearest non-empty value in a direction
	const findNearest = (row, col, dRow, dCol) => {
		let r = row + dRow;
		let c = col + dCol;
		while (
			r >= startRow &&
			r < content.length &&
			c >= startCol &&
			c < content[0].length
		) {
			if (!isEmpty(content[r][c])) {
				const val = parseNumericValue(content[r][c]);
				if (val !== null) {
					return {
						value: val,
						distance: Math.abs(r - row) + Math.abs(c - col),
						decimals: getDecimalPlaces(content[r][c]),
					};
				}
			}
			r += dRow;
			c += dCol;
		}
		return null;
	};

	// Fill blank cells
	for (let i = startRow; i < content.length; i++) {
		for (let j = startCol; j < content[i].length; j++) {
			if (!isEmpty(content[i][j])) continue;

			// Find nearest values in 4 directions
			const top = findNearest(i, j, -1, 0);
			const bottom = findNearest(i, j, 1, 0);
			const left = findNearest(i, j, 0, -1);
			const right = findNearest(i, j, 0, 1);

			const values = [];
			const weights = [];
			const decimalCounts = [];

			if (top) {
				values.push(top.value);
				weights.push(1 / top.distance);
				decimalCounts.push(top.decimals);
			}
			if (bottom) {
				values.push(bottom.value);
				weights.push(1 / bottom.distance);
				decimalCounts.push(bottom.decimals);
			}
			if (left) {
				values.push(left.value);
				weights.push(1 / left.distance);
				decimalCounts.push(left.decimals);
			}
			if (right) {
				values.push(right.value);
				weights.push(1 / right.distance);
				decimalCounts.push(right.decimals);
			}

			// Calculate weighted average
			if (values.length > 0) {
				const totalWeight = weights.reduce((a, b) => a + b, 0);
				const interpolated =
					values.reduce((sum, val, idx) => sum + val * weights[idx], 0) /
					totalWeight;

				// Use the maximum decimal places from neighboring cells
				const decimals = Math.max(...decimalCounts, 1);
				result[i][j] = interpolated.toFixed(decimals);
			}
		}
	}
	return result;
}
