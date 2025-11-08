# Table tool

The Table Block for the [Editor.js](https://editorjs.io). Improved for use in automotive applications.

**Extended with Automotive Features:** This version includes gradient coloring, table & axis titles, cell auto-fill and value smoothing for ecu maps. See [AUTOMOTIVE_FEATURES.md](AUTOMOTIVE_FEATURES.md) for details.

![](assets/68747470733a2f2f636170656c6c612e706963732f34313239346365632d613262332d343135372d383339392d6666666665643364386666642e6a7067.jpeg)

## Installation

Get the package

```shell
npm install editorjs-table-automotive
```

Include module at your application

```javascript
import Table from 'editorjs-table-automotive';
```

## Usage

Add a new Tool to the `tools` property of the Editor.js initial config.

```javascript
import Table from 'editorjs-table-automotive';

var editor = EditorJS({
	tools: {
		table: Table,
	},
});
```

Or init the Table tool with additional settings

```javascript
var editor = EditorJS({
	tools: {
		table: {
			class: Table,
			inlineToolbar: true,
			config: {
				rows: 2,
				cols: 3,
				maxRows: 5,
				maxCols: 5,
			},
		},
	},
});
```

## Config Params

| Field          | Type      | Description                                                            |
| -------------- | --------- | ---------------------------------------------------------------------- |
| `rows`         | `number`  | initial number of rows. `2` by default                                 |
| `cols`         | `number`  | initial number of columns. `2` by default                              |
| `maxRows`      | `number`  | maximum number of rows. `5` by default                                 |
| `maxCols`      | `number`  | maximum number of columns. `5` by default                              |
| `withHeadings` | `boolean` | toggle table headings. `false` by default                              |
| `stretched`    | `boolean` | whether the table is stretched to fill the full width of the container |

## Output data

This Tool returns `data` in the following format

| Field             | Type         | Description                                                            |
| ----------------- | ------------ | ---------------------------------------------------------------------- |
| `withHeadings`    | `boolean`    | Uses the first line as headings                                        |
| `stretched`       | `boolean`    | whether the table is stretched to fill the full width of the container |
| `gradientColors`  | `boolean`    | whether gradient colors are enabled                                    |
| `colorScheme`     | `string`     | color scheme name (THERMAL, AUTOMOTIVE, VIRIDIS, GRAYSCALE)            |
| `showTableTitle`  | `boolean`    | whether table title is displayed                                       |
| `tableTitle`      | `string`     | table title text                                                       |
| `showAxisTitles`  | `boolean`    | whether axis titles are displayed                                      |
| `horizontalTitle` | `string`     | horizontal axis title                                                  |
| `verticalTitle`   | `string`     | vertical axis title                                                    |
| `skipHeadings`    | `boolean`    | skip headings in gradient calculation                                  |
| `content`         | `string[][]` | two-dimensional array with table contents                              |

```json
{
	"type": "table",
	"data": {
		"withHeadings": true,
		"stretched": false,
		"gradientColors": true,
		"colorScheme": "THERMAL",
		"showTableTitle": true,
		"tableTitle": "Fuel Map",
		"showAxisTitles": true,
		"horizontalTitle": "RPM",
		"verticalTitle": "Load (%)",
		"skipHeadings": false,
		"content": [
			["Kine", "Pigs", "Chicken"],
			["1 pcs", "3 pcs", "12 pcs"],
			["100$", "200$", "150$"]
		]
	}
}
```
