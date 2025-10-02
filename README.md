# PDF Comparison Tool

A web-based tool for comparing PDF documents and highlighting differences in their text content.

## Features

- **PDF Text Extraction**: Extracts text from PDF files while preserving formatting
- **Side-by-Side Comparison**: Display documents side-by-side with synchronized scrolling
- **Difference Highlighting**: Shows additions in green and deletions in red
- **Search Functionality**: Search within documents with navigation between results
- **Drag & Drop Support**: Easy file upload via drag and drop
- **Comparison Options**:
  - Ignore case differences
  - Ignore whitespace differences
  - Word-level or character-level comparison
  - Preserve document formatting

## How to Use

1. **Open the Application**: Open `index.html` in a modern web browser (Chrome, Firefox, Safari, or Edge)

2. **Upload PDFs**: 
   - Click on the upload areas or drag & drop PDF files
   - Upload the original PDF on the left
   - Upload the modified PDF on the right

3. **Configure Options** (optional):
   - Check "Ignore case differences" to ignore uppercase/lowercase variations
   - Check "Ignore whitespace differences" to ignore spacing variations
   - Choose between word-level or character-level comparison
   - Enable/disable synchronized scrolling

4. **Compare**: Click the "Compare PDFs" button to start the comparison

5. **Review Results**:
   - View statistics showing additions, deletions, and similarity percentage
   - Scroll through documents to see highlighted differences
   - Green highlights show added content
   - Red strikethrough shows removed content

6. **Search** (after comparison):
   - Enter search terms in the search box
   - Use Previous/Next buttons to navigate between results
   - Enable case-sensitive search if needed

## Keyboard Shortcuts

- `Ctrl + F`: Focus search input
- `F3` or `Ctrl + G`: Next search result
- `Shift + F3` or `Ctrl + Shift + G`: Previous search result
- `Enter`: Perform search (when search input is focused)

## Browser Requirements

- Modern web browser with JavaScript enabled
- Internet connection (for loading external libraries)

## Technical Details

The tool uses:
- **PDF.js**: For PDF text extraction
- **diff_match_patch**: For text comparison algorithms
- **Vanilla JavaScript**: No framework dependencies
- **Responsive CSS**: Works on desktop and mobile devices

## Limitations

- Works with text-based PDFs only (scanned images require OCR)
- Large PDFs may take longer to process
- Password-protected PDFs are not supported

## Troubleshooting

If the tool doesn't work:
1. Ensure JavaScript is enabled in your browser
2. Check that you have an internet connection (for CDN libraries)
3. Try refreshing the page
4. Use a different browser if issues persist

## File Structure

```
pdf-comparison-tool/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # Stylesheet
├── js/
│   ├── main.js           # Main application logic
│   ├── pdf-extractor.js  # PDF text extraction
│   ├── comparison-engine.js # Comparison algorithms
│   ├── search-handler.js # Search functionality
│   └── ui-controller.js  # UI management
└── README.md             # This file
```