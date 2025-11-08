# Automotive Features for Editor.js Table Plugin

This extended version of the Editor.js Table plugin includes automotive-friendly features designed for calibration maps and data visualization.

## Features

### 1. Gradient Color Mapping

Automatically apply color gradients to table cells based on their numeric values, similar to automotive ECU tuning software.

**Color Schemes Available:**

-   **Thermal**: Blue > Cyan > Green > Yellow > Red (default)
-   **Automotive**: Dark Blue > Blue > Green > Yellow > Orange > Red
-   **Viridis**: just google it lol
-   **Grayscale**: White > Black

**How to use:**

1. Open the Tune menu
2. Select a color scheme from the available options
3. Colors will automatically update as you edit cell values

### 2. Table Title

Add a title for the entire table.

**How to use:**

1. Open the Tune menu
2. Enable "Table Title"
3. Title appears above the table and is editable inline

### 3. Axis Titles

Add descriptive titles for horizontal (X-axis) and vertical (Y-axis) dimensions.

**How to use:**

1. Open the Tune menu
2. Enable "Axis Titles"
3. Titles appear outside the table and are editable inline

### 4. Value Smoothing

Apply smoothing algorithms to numeric data in your table.

**Smoothing Methods:**

#### Moving Average

-   Averages values within a window around each cell
-   Window size is configurable (3, 5, 7, etc.)

#### Gaussian Smoothing

-   Applies weighted averaging using a Gaussian kernel
-   Sigma parameter controls smoothing strength

#### Bilinear Interpolation

-   Smooths values based on 4-connected neighbors

**How to use:**

1. Open the Tune menu
2. Under "Smooth Values" choose a smoothing method
3. Enter parameters when prompted
4. Smoothed values replace original values

### 5. Configuration Options

The plugin automatically detects numeric values and applies gradients. You can configure:

**Data Structure:**

```javascript
{
  withHeadings: false,          // First row as headings
  stretched: false,              // Stretch table width
  gradientColors: true,          // Enable gradient coloring
  colorScheme: 'THERMAL',        // Color scheme name
  showTableTitle: true,          // Show table title
  tableTitle: 'Fuel Map',        // Table title text
  showAxisTitles: true,          // Show axis titles
  horizontalTitle: 'RPM',        // X-axis title
  verticalTitle: 'Load (%)',     // Y-axis title
  skipHeadings: false,           // Skip headings in gradient calculation
  content: [[...], [...]]        // Table data
}
```

## Use Cases

### Automotive Calibration Maps

Perfect for displaying engine calibration tables like:

-   Fuel injection maps
-   Ignition timing maps
-   Boost pressure maps
-   Air-fuel ratio tables

### Data Visualization

Useful for any numeric data visualization:

-   Temperature distributions
-   Sensor readings over time etc.

## Other

1. **Headers and Labels**: If your first row/column contains labels (not values):

    - Enable "With headings" for the first row and/or column
    - Enable "Skip Headings" to exclude headings from gradient calculation

2. **Color Contrast**: The plugin automatically calculates optimal text color (black/white) based on background brightness for maximum readability

3. **Real-time Updates**: Gradient colors update automatically as you edit cell values (with 300ms debounce)

4. **Smoothing**: Always save a copy before smoothing, as the operation replaces original values

## Technical Details

### Color Mapping Algorithm

1. Extracts numeric values from all cells
2. Calculates min/max values in the dataset
3. Normalizes each value to 0-1 range
4. Interpolates between color stops in the selected scheme
5. Applies background color and calculates optimal text color

### Smoothing Algorithms

-   **Moving Average**: O(n×m×w²) where w is window size
-   **Gaussian**: O(n×m×k²) where k is kernel size (3σ)
-   **Bilinear**: O(n×m) with 4-neighbor averaging

All algorithms preserve the precision of original values (decimal places).
