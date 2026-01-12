const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// PDF generation configuration for continuous page (no page breaks)
const PDF_OPTIONS_BASE = {
  printBackground: true,  // Preserve gradients and colors
  margin: {
    top: '0mm',
    right: '0mm',
    bottom: '0mm',
    left: '0mm'
  },
  preferCSSPageSize: false,  // Override for continuous layout
  tagged: true,              // For accessibility
  outline: false,
  pageRanges: '1'           // Single page only
};

// Chromium flags optimized for headless PDF generation
const CHROMIUM_FLAGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=TranslateUI',
  '--disable-ipc-flooding-protection',
  '--enable-font-antialiasing',
  '--force-color-profile=srgb'
];

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';
const isCI = process.env.CI === 'true';

console.log(`🔧 Environment: ${isDevelopment ? 'development' : 'production'}`);
console.log(`🤖 CI Mode: ${isCI ? 'enabled' : 'disabled'}`);

/**
 * Generate high-quality PDF from CV HTML file
 */
async function generatePDF() {
  const startTime = Date.now();
  console.log('🚀 Starting PDF generation...');

  let browser;
  try {
    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: isCI ? true : isDevelopment ? false : true,
      devtools: isDevelopment && !isCI,
      args: isCI ? CHROMIUM_FLAGS : ['--no-sandbox'],
      timeout: 30000
    });

    console.log('✅ Browser launched successfully');

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2  // High DPI for better quality
    });

    // Load HTML file
    const htmlPath = path.resolve(__dirname, '../cv.html');
    console.log(`📄 Loading HTML from: ${htmlPath}`);

    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('✅ HTML loaded successfully');

    // Inject CSS to optimize for PDF generation and prevent page breaks
    await page.addStyleTag({
      content: `
        /* Disable animations for PDF */
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }

        /* Optimize AI skill tags for PDF */
        .ai-skill {
          animation: none !important;
          box-shadow: 0 0 0 1px #D97757 !important;
          color: #D97757 !important;
        }

        /* Ensure print colors are preserved */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* CRITICAL: Prevent all page breaks for continuous layout */
        * {
          page-break-before: avoid !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          break-before: avoid !important;
          break-after: avoid !important;
          break-inside: avoid !important;
        }

        /* Optimize for single continuous page layout */
        body {
          overflow: visible !important;
          page-break-before: avoid !important;
          page-break-after: avoid !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Remove centering and padding to eliminate white margins */
        .container {
          min-height: auto !important;
          page-break-before: avoid !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          max-width: none !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Prevent page breaks in main sections */
        .header, .summary, .main-content, .left-column, .right-column, .section, .job {
          page-break-before: avoid !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          break-before: avoid !important;
          break-after: avoid !important;
          break-inside: avoid !important;
        }
      `,
    });

    console.log('✅ PDF optimization styles injected');

    // Wait for fonts and content to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for any web fonts to load
    await page.evaluate(() => {
      return document.fonts.ready;
    });

    console.log('✅ Fonts and content loaded');

    // Calculate dynamic dimensions for continuous page without padding
    const contentMetrics = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const container = document.querySelector('.container');

      // Get the actual container dimensions (not the full page)
      const containerRect = container ? container.getBoundingClientRect() : null;

      const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );

      // Use container width if available, otherwise full document width
      const width = containerRect ?
        Math.ceil(containerRect.width) :
        Math.max(
          body.scrollWidth,
          body.offsetWidth,
          html.clientWidth,
          html.scrollWidth,
          html.offsetWidth
        );

      return {
        height,
        width,
        containerWidth: containerRect ? containerRect.width : null,
        title: document.title,
        hasContent: body.innerText.length > 100
      };
    });

    console.log(`📏 Content dimensions: ${contentMetrics.width}x${contentMetrics.height}px`);
    console.log(`📦 Container width: ${contentMetrics.containerWidth ? Math.ceil(contentMetrics.containerWidth) + 'px' : 'N/A'}`);
    console.log(`📝 Content validation: ${contentMetrics.hasContent ? 'OK' : 'WARNING - Low content'}`);

    if (!contentMetrics.hasContent) {
      throw new Error('HTML content appears to be empty or not loaded properly');
    }

    // Generate PDF with dynamic width and height for tight layout
    const pdfWidth = Math.ceil(contentMetrics.width);
    const pdfHeight = Math.ceil(contentMetrics.height * 1.05); // Add minimal 5% padding

    console.log(`🎯 Generating PDF with dimensions: ${pdfWidth}x${pdfHeight}px`);

    const pdfBuffer = await page.pdf({
      ...PDF_OPTIONS_BASE,
      width: `${pdfWidth}px`,
      height: `${pdfHeight}px`
    });

    console.log('✅ PDF generated successfully');

    // Ensure output directory exists
    await fs.mkdir('output', { recursive: true });

    // Generate filename with timestamp for development
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = isDevelopment ?
      `Gilad-Maoz-CV-${timestamp}.pdf` :
      'Gilad-Maoz-CV.pdf';

    const outputPath = path.join('output', filename);

    // Write PDF file
    await fs.writeFile(outputPath, pdfBuffer);

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const sizeKB = Math.round(pdfBuffer.length / 1024);

    console.log('🎉 PDF Generation Complete!');
    console.log(`📁 Output: ${outputPath}`);
    console.log(`📏 Size: ${sizeKB} KB`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`🖼️  Dimensions: ${pdfWidth}x${pdfHeight}px`);

    return {
      success: true,
      outputPath,
      sizeKB,
      duration,
      dimensions: {
        width: pdfWidth,
        height: pdfHeight
      }
    };

  } catch (error) {
    console.error('❌ PDF Generation Failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);

    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  generatePDF()
    .then((result) => {
      console.log('✅ Success:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { generatePDF };