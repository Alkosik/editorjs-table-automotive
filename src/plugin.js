import Table from './table';
import * as $ from './utils/dom';
import {
	COLOR_SCHEMES,
	applyMovingAverage,
	applyGaussianSmoothing,
	applyBilinearInterpolation,
	autoFillBlanks,
} from './utils/automotive';

import {
	IconTable,
	IconTableWithHeadings,
	IconTableWithoutHeadings,
	IconStretch,
	IconCollapse,
} from '@codexteam/icons';
/**
 * @typedef {object} TableData - configuration that the user can set for the table
 * @property {number} rows - number of rows in the table
 * @property {number} cols - number of columns in the table
 */
/**
 * @typedef {object} Tune - setting for the table
 * @property {string} name - tune name
 * @property {HTMLElement} icon - icon for the tune
 * @property {boolean} isActive - default state of the tune
 * @property {void} setTune - set tune state to the table data
 */
/**
 * @typedef {object} TableConfig - object with the data transferred to form a table
 * @property {boolean} withHeading - setting to use cells of the first row as headings
 * @property {string[][]} content - two-dimensional array which contains table content
 */
/**
 * @typedef {object} TableConstructor
 * @property {TableConfig} data — previously saved data
 * @property {TableConfig} config - user config for Tool
 * @property {object} api - Editor.js API
 * @property {boolean} readOnly - read-only mode flag
 */
/**
 * @typedef {import('@editorjs/editorjs').PasteEvent} PasteEvent
 */

/**
 * Table block for Editor.js
 */
export default class TableBlock {
	/**
	 * Notify core that read-only mode is supported
	 *
	 * @returns {boolean}
	 */
	static get isReadOnlySupported() {
		return true;
	}

	/**
	 * Allow to press Enter inside the CodeTool textarea
	 *
	 * @returns {boolean}
	 * @public
	 */
	static get enableLineBreaks() {
		return true;
	}

	/**
	 * Render plugin`s main Element and fill it with saved data
	 *
	 * @param {TableConstructor} init
	 */
	constructor({ data, config, api, readOnly, block }) {
		this.api = api;
		this.readOnly = readOnly;
		this.config = config;
		this.data = {
			withHeadings: this.getConfig('withHeadings', false, data),
			stretched: this.getConfig('stretched', false, data),
			gradientColors: this.getConfig('gradientColors', false, data),
			colorScheme: this.getConfig('colorScheme', 'THERMAL', data),
			showTableTitle: this.getConfig('showTableTitle', false, data),
			tableTitle: this.getConfig('tableTitle', '', data),
			showAxisTitles: this.getConfig('showAxisTitles', false, data),
			horizontalTitle: this.getConfig('horizontalTitle', '', data),
			verticalTitle: this.getConfig('verticalTitle', '', data),
			skipHeadings: this.getConfig('skipHeadings', false, data),
			content: data && data.content ? data.content : [],
		};
		this.table = null;
		this.block = block;
	}

	/**
	 * Get Tool toolbox settings
	 * icon - Tool icon's SVG
	 * title - title to show in toolbox
	 *
	 * @returns {{icon: string, title: string}}
	 */
	static get toolbox() {
		return {
			icon: IconTable,
			title: 'Table',
		};
	}

	/**
	 * Return Tool's view
	 *
	 * @returns {HTMLDivElement}
	 */
	render() {
		/** creating table */
		this.table = new Table(this.readOnly, this.api, this.data, this.config);

		/** creating container around table */
		this.container = $.make('div', this.api.styles.block);
		this.container.appendChild(this.table.getWrapper());

		this.table.setHeadingsSetting(this.data.withHeadings);

		// Apply automotive settings
		if (this.data.gradientColors) {
			this.table.tunes.gradientColors = this.data.gradientColors;
			this.table.tunes.colorScheme = this.data.colorScheme;
			this.table.tunes.skipHeadings = this.data.skipHeadings;
			this.table.setGradientColors(true);
		}

		// Apply axis titles
		if (this.data.horizontalTitle) {
			this.table.tunes.horizontalTitle = this.data.horizontalTitle;
		}

		if (this.data.verticalTitle) {
			this.table.tunes.verticalTitle = this.data.verticalTitle;
		}

		// Apply table title
		if (this.data.tableTitle) {
			this.table.tunes.tableTitle = this.data.tableTitle;
		}

		// Apply table title visibility (default to false)
		const showTableTitle = this.data.showTableTitle === true;
		this.updateTableTitle(showTableTitle);

		// Apply axis titles visibility (default to false if not specified)
		const showTitles = this.data.showAxisTitles === true;
		this.table.toggleAxisTitles(showTitles);

		return this.container;
	}

	/**
	 * Update table title in the main container
	 *
	 * @param {boolean} show - whether to show table title
	 */
	updateTableTitle(show) {
		// Remove existing title
		const existingTitle = this.container.querySelector('.tc-table-title');
		if (existingTitle) {
			existingTitle.remove();
		}

		// Only create if we need to show it
		if (!show) {
			return;
		}

		// Create table title field
		const tableTitle = $.make('div', ['tc-table-title'], {
			contentEditable: !this.readOnly,
			innerHTML: this.table.tunes.tableTitle || '',
		});

		tableTitle.setAttribute('data-placeholder', 'Table title...');

		tableTitle.addEventListener('blur', (e) => {
			this.table.tunes.tableTitle = e.target.innerHTML;
			this.data.tableTitle = e.target.innerHTML;
		});

		tableTitle.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				e.target.blur();
			}
		});

		// Insert at the very beginning of the container
		this.container.insertBefore(tableTitle, this.container.firstChild);
	}

	/**
	 * Returns plugin settings
	 *
	 * @returns {Array}
	 */
	renderSettings() {
		const settings = [];

		// Add headings settings with submenu
		settings.push({
			name: 'headings',
			icon: IconTableWithHeadings,
			label: 'With Headings',
			children: {
				items: [
					{
						name: 'rowHeadings',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="15" height="3" fill="currentColor" opacity="0.7"/><rect x="1" y="5" width="15" height="11" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`,
						title: '1st Row',
						isActive:
							this.data.withHeadings === 'row' ||
							this.data.withHeadings === 'both',
						closeOnActivate: true,
						onActivate: () => {
							const currentHeadings = this.data.withHeadings;
							if (currentHeadings === 'row') {
								this.data.withHeadings = false;
							} else if (currentHeadings === 'column') {
								this.data.withHeadings = 'both';
							} else if (currentHeadings === 'both') {
								this.data.withHeadings = 'column';
							} else {
								this.data.withHeadings = 'row';
							}
							this.table.setHeadingsSetting(this.data.withHeadings);
							// Recalculate gradient colors if enabled
							if (this.data.gradientColors) {
								this.table.applyGradientColors();
							}
						},
					},
					{
						name: 'columnHeadings',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="3" height="15" fill="currentColor" opacity="0.7"/><rect x="5" y="1" width="11" height="15" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`,
						title: '1st Column',
						isActive:
							this.data.withHeadings === 'column' ||
							this.data.withHeadings === 'both',
						closeOnActivate: true,
						onActivate: () => {
							const currentHeadings = this.data.withHeadings;
							if (currentHeadings === 'column') {
								this.data.withHeadings = false;
							} else if (currentHeadings === 'row') {
								this.data.withHeadings = 'both';
							} else if (currentHeadings === 'both') {
								this.data.withHeadings = 'row';
							} else {
								this.data.withHeadings = 'column';
							}
							this.table.setHeadingsSetting(this.data.withHeadings);
							// Recalculate gradient colors if enabled
							if (this.data.gradientColors) {
								this.table.applyGradientColors();
							}
						},
					},
					{
						name: 'noHeadings',
						icon: IconTableWithoutHeadings,
						title: 'None',
						isActive:
							!this.data.withHeadings ||
							this.data.withHeadings === false,
						closeOnActivate: true,
						onActivate: () => {
							this.data.withHeadings = false;
							this.table.setHeadingsSetting(this.data.withHeadings);
							// Recalculate gradient colors if enabled
							if (this.data.gradientColors) {
								this.table.applyGradientColors();
							}
						},
					},
				],
			},
		});

		settings.push({
			label: this.data.stretched
				? this.api.i18n.t('Collapse')
				: this.api.i18n.t('Stretch'),
			icon: this.data.stretched ? IconCollapse : IconStretch,
			closeOnActivate: true,
			toggle: true,
			onActivate: () => {
				this.data.stretched = !this.data.stretched;
				this.block.stretched = this.data.stretched;
			},
		});

		// Add automotive settings with submenu
		settings.push({
			name: 'gradientColors',
			icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="4" height="15" fill="#0000ff"/><rect x="5" y="1" width="4" height="15" fill="#00ff00"/><rect x="9" y="1" width="4" height="15" fill="#ffff00"/><rect x="13" y="1" width="3" height="15" fill="#ff0000"/></svg>`,
			label: 'Gradient Colors',
			children: {
				items: [
					{
						name: 'thermal',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><circle cx="8.5" cy="8.5" r="7" fill="rgb(0, 255, 0)"/></svg>`,
						title: 'Thermal',
						isActive:
							this.data.gradientColors &&
							this.data.colorScheme === 'THERMAL',
						closeOnActivate: true,
						onActivate: () => {
							this.data.gradientColors = true;
							this.data.colorScheme = 'THERMAL';
							this.table.setGradientColors(true);
							this.table.setColorScheme('THERMAL');
						},
					},
					{
						name: 'automotive',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><circle cx="8.5" cy="8.5" r="7" fill="rgb(255, 200, 60)"/></svg>`,
						title: 'Automotive',
						isActive:
							this.data.gradientColors &&
							this.data.colorScheme === 'AUTOMOTIVE',
						closeOnActivate: true,
						onActivate: () => {
							this.data.gradientColors = true;
							this.data.colorScheme = 'AUTOMOTIVE';
							this.table.setGradientColors(true);
							this.table.setColorScheme('AUTOMOTIVE');
						},
					},
					{
						name: 'viridis',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><circle cx="8.5" cy="8.5" r="7" fill="rgb(33, 145, 140)"/></svg>`,
						title: 'Viridis',
						isActive:
							this.data.gradientColors &&
							this.data.colorScheme === 'VIRIDIS',
						closeOnActivate: true,
						onActivate: () => {
							this.data.gradientColors = true;
							this.data.colorScheme = 'VIRIDIS';
							this.table.setGradientColors(true);
							this.table.setColorScheme('VIRIDIS');
						},
					},
					{
						name: 'grayscale',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><circle cx="8.5" cy="8.5" r="7" fill="rgb(128, 128, 128)"/></svg>`,
						title: 'Grayscale',
						isActive:
							this.data.gradientColors &&
							this.data.colorScheme === 'GRAYSCALE',
						closeOnActivate: true,
						onActivate: () => {
							this.data.gradientColors = true;
							this.data.colorScheme = 'GRAYSCALE';
							this.table.setGradientColors(true);
							this.table.setColorScheme('GRAYSCALE');
						},
					},
					{
						name: 'disable',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="15" y2="15" stroke="currentColor" stroke-width="2"/><line x1="15" y1="2" x2="2" y2="15" stroke="currentColor" stroke-width="2"/></svg>`,
						title: 'Disable',
						isActive: !this.data.gradientColors,
						closeOnActivate: true,
						onActivate: () => {
							this.data.gradientColors = false;
							this.table.setGradientColors(false);
						},
					},
					{
						name: 'skipHeadings',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="15" height="3" fill="currentColor" opacity="0.3"/><rect x="1" y="5" width="3" height="11" fill="currentColor" opacity="0.3"/><rect x="5" y="5" width="11" height="11" fill="currentColor"/></svg>`,
						title: 'Skip Headings',
						toggle: true,
						isActive: this.data.skipHeadings === true,
						closeOnActivate: false,
						onActivate: () => {
							this.data.skipHeadings = !this.data.skipHeadings;
							this.table.tunes.skipHeadings = this.data.skipHeadings;
							if (this.data.gradientColors) {
								this.table.applyGradientColors();
							}
						},
					},
				],
			},
		});

		// Add table title toggle
		settings.push({
			name: 'tableTitle',
			icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="3" width="13" height="2" fill="currentColor"/><rect x="2" y="7" width="13" height="7" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`,
			label: 'Table Title',
			toggle: true,
			isActive: this.data.showTableTitle === true,
			closeOnActivate: true,
			onActivate: () => {
				const currentState = this.data.showTableTitle === true;
				const newState = !currentState;
				this.data.showTableTitle = newState;
				this.updateTableTitle(newState);
			},
		});

		// Add axis title settings
		settings.push({
			name: 'axisTitles',
			icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><text x="2" y="13" font-size="10" fill="currentColor">XY</text></svg>`,
			label: 'Axis Titles',
			toggle: true,
			isActive: this.data.showAxisTitles === true, // Default to false
			closeOnActivate: true,
			onActivate: () => {
				// Get current state (default to false if undefined)
				const currentState = this.data.showAxisTitles === true;
				const newState = !currentState;
				this.data.showAxisTitles = newState;
				this.table.toggleAxisTitles(newState);
			},
		});

		// Add smoothing options with submenu
		settings.push({
			name: 'smoothing',
			icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><path d="M2 15 Q8 2, 15 15" stroke="currentColor" fill="none" stroke-width="2"/></svg>`,
			label: 'Smooth Values',
			children: {
				items: [
					{
						name: 'movingAverage',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><path d="M2 12 L5 9 L8 10 L11 7 L14 8" stroke="currentColor" fill="none" stroke-width="2"/></svg>`,
						title: 'Moving Average',
						closeOnActivate: false,
						onActivate: () => {
							this.applySmoothingMethod('movingAverage');
						},
					},
					{
						name: 'gaussian',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><path d="M2 15 C4 15, 6 2, 8.5 2 C11 2, 13 15, 15 15" stroke="currentColor" fill="none" stroke-width="2"/></svg>`,
						title: 'Gaussian',
						closeOnActivate: false,
						onActivate: () => {
							this.applySmoothingMethod('gaussian');
						},
					},
					{
						name: 'bilinear',
						icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="11" height="11" stroke="currentColor" fill="none" stroke-width="2"/><line x1="8.5" y1="3" x2="8.5" y2="14" stroke="currentColor" stroke-width="1"/><line x1="3" y1="8.5" x2="14" y2="8.5" stroke="currentColor" stroke-width="1"/></svg>`,
						title: 'Bilinear',
						closeOnActivate: true,
						onActivate: () => {
							this.applySmoothingMethod('bilinear');
						},
					},
				],
			},
		});

		// Add auto-fill blanks option
		settings.push({
			name: 'autoFill',
			icon: `<svg width="17" height="17" viewBox="0 0 17 17" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="4" height="4" fill="currentColor"/><rect x="11" y="2" width="4" height="4" fill="currentColor"/><rect x="2" y="11" width="4" height="4" fill="currentColor"/><rect x="11" y="11" width="4" height="4" fill="currentColor"/><rect x="6.5" y="6.5" width="4" height="4" fill="currentColor" opacity="0.5"/></svg>`,
			label: 'Auto-Fill Blanks',
			toggle: false,
			closeOnActivate: true,
			onActivate: () => {
				this.applyAutoFill();
			},
		});

		return settings;
	}

	/**
	 * Get a representative color for a color scheme
	 * @param {string} scheme - scheme name
	 * @returns {string} - hex color
	 */
	getSchemeColor(scheme) {
		const colors = COLOR_SCHEMES[scheme].colors;
		const midColor = colors[Math.floor(colors.length / 2)].color;
		return `rgb(${midColor[0]}, ${midColor[1]}, ${midColor[2]})`;
	}

	/**
	 * Apply smoothing method to table data
	 * @param {string} method - smoothing method name
	 */
	applySmoothingMethod(method) {
		const content = this.table.getData();
		let smoothedContent;

		const skipFirstRow =
			this.data.skipHeadings &&
			(this.data.withHeadings === 'row' || this.data.withHeadings === 'both');
		const skipFirstCol =
			this.data.skipHeadings &&
			(this.data.withHeadings === 'column' ||
				this.data.withHeadings === 'both');

		switch (method) {
			case 'movingAverage':
				const windowSize = prompt(
					'Enter window size (odd number, e.g., 3, 5, 7):',
					'3',
				);
				if (windowSize === null) return;
				smoothedContent = applyMovingAverage(
					content,
					parseInt(windowSize) || 3,
					skipFirstRow,
					skipFirstCol,
				);
				break;
			case 'gaussian':
				const sigma = prompt('Enter sigma value (e.g., 1.0):', '1.0');
				if (sigma === null) return;
				smoothedContent = applyGaussianSmoothing(
					content,
					parseFloat(sigma) || 1.0,
					skipFirstRow,
					skipFirstCol,
				);
				break;
			case 'bilinear':
				smoothedContent = applyBilinearInterpolation(
					content,
					skipFirstRow,
					skipFirstCol,
				);
				break;
		}

		if (smoothedContent) {
			// Apply smoothed content to table
			for (let i = 0; i < smoothedContent.length; i++) {
				for (let j = 0; j < smoothedContent[i].length; j++) {
					this.table.setCellContent(i + 1, j + 1, smoothedContent[i][j]);
				}
			}

			// Reapply gradient if enabled
			if (this.data.gradientColors) {
				this.table.applyGradientColors();
			}
		}
	}

	/**
	 * Apply auto-fill to blank cells
	 */
	applyAutoFill() {
		const content = this.table.getData();

		const skipFirstRow =
			this.data.skipHeadings &&
			(this.data.withHeadings === 'row' || this.data.withHeadings === 'both');
		const skipFirstCol =
			this.data.skipHeadings &&
			(this.data.withHeadings === 'column' ||
				this.data.withHeadings === 'both');

		const filledContent = autoFillBlanks(content, skipFirstRow, skipFirstCol);

		// Apply filled content to table
		for (let i = 0; i < filledContent.length; i++) {
			for (let j = 0; j < filledContent[i].length; j++) {
				if (filledContent[i][j] !== content[i][j]) {
					this.table.setCellContent(i + 1, j + 1, filledContent[i][j]);
				}
			}
		}

		// Reapply gradient if enabled
		if (this.data.gradientColors) {
			this.table.applyGradientColors();
		}
	}

	/**
	 * Extract table data from the view
	 *
	 * @returns {TableData} - saved data
	 */
	save() {
		const tableContent = this.table.getData();
		const tunes = this.table.getTunes();

		const result = {
			withHeadings: this.data.withHeadings,
			stretched: this.data.stretched,
			gradientColors: this.data.gradientColors,
			colorScheme: this.data.colorScheme,
			showTableTitle: this.data.showTableTitle,
			tableTitle: tunes.tableTitle || this.data.tableTitle,
			showAxisTitles: this.data.showAxisTitles,
			horizontalTitle: tunes.horizontalTitle || this.data.horizontalTitle,
			verticalTitle: tunes.verticalTitle || this.data.verticalTitle,
			skipHeadings: this.data.skipHeadings,
			content: tableContent,
		};

		return result;
	}

	/**
	 * Plugin destroyer
	 *
	 * @returns {void}
	 */
	destroy() {
		this.table.destroy();
	}

	/**
	 * A helper to get config value.
	 *
	 * @param {string} configName - the key to get from the config.
	 * @param {any} defaultValue - default value if config doesn't have passed key
	 * @param {object} savedData - previously saved data. If passed, the key will be got from there, otherwise from the config
	 * @returns {any} - config value.
	 */
	getConfig(configName, defaultValue = undefined, savedData = undefined) {
		const data = this.data || savedData;

		if (data) {
			return data[configName] ? data[configName] : defaultValue;
		}

		return this.config && this.config[configName]
			? this.config[configName]
			: defaultValue;
	}

	/**
	 * Table onPaste configuration
	 *
	 * @public
	 */
	static get pasteConfig() {
		return { tags: ['TABLE', 'TR', 'TH', 'TD'] };
	}

	/**
	 * On paste callback that is fired from Editor
	 *
	 * @param {PasteEvent} event - event with pasted data
	 */
	onPaste(event) {
		const table = event.detail.data;

		/** Check if the first row is a header */
		const firstRowHeading = table.querySelector(
			':scope > thead, tr:first-of-type th',
		);

		/** Get all rows from the table */
		const rows = Array.from(table.querySelectorAll('tr'));

		/** Generate a content matrix */
		const content = rows.map((row) => {
			/** Get cells from row */
			const cells = Array.from(row.querySelectorAll('th, td'));

			/** Return cells content */
			return cells.map((cell) => cell.innerHTML);
		});

		/** Update Tool's data */
		this.data = {
			withHeadings: firstRowHeading !== null,
			content,
		};

		/** Update table block */
		if (this.table.wrapper) {
			this.table.wrapper.replaceWith(this.render());
		}
	}
}
