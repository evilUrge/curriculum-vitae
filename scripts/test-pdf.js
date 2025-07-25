const { generatePDF } = require('./generate-pdf.js');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive PDF generation testing
 */
async function testPDF() {
  console.log('🧪 Starting comprehensive PDF generation test...\n');

  try {
    // Test 1: Basic PDF Generation
    console.log('🔍 Test 1: PDF Generation');
    const startTime = Date.now();
    const result = await generatePDF();
    const totalTime = Date.now() - startTime;

    console.log(`✅ Generation completed in ${Math.round(totalTime / 1000)}s`);
    console.log(`📁 File: ${result.outputPath}`);
    console.log(`📏 Size: ${result.sizeKB} KB`);
    console.log(`🖼️  Dimensions: ${result.dimensions.width}x${result.dimensions.height}px\n`);

    // Test 2: File System Validation
    console.log('🔍 Test 2: File System Validation');
    const outputPath = result.outputPath;

    if (!fs.existsSync(outputPath)) {
      throw new Error('PDF file was not created');
    }

    const stats = fs.statSync(outputPath);
    const fileSizeKB = Math.round(stats.size / 1024);

    console.log(`✅ File exists: ${outputPath}`);
    console.log(`📏 File size: ${fileSizeKB} KB\n`);

    // Test 3: Quality Assertions
    console.log('🔍 Test 3: Quality Assertions');

    // Size validation
    if (stats.size < 10000) {
      throw new Error(`PDF too small (${fileSizeKB} KB) - possible generation error`);
    }
    if (stats.size > 2000000) {
      throw new Error(`PDF too large (${fileSizeKB} KB) - check for issues`);
    }
    console.log('✅ File size within acceptable range');

    // Performance validation
    if (totalTime > 120000) {
      console.warn(`⚠️  Generation time (${Math.round(totalTime / 1000)}s) is slower than expected`);
    } else {
      console.log('✅ Generation time acceptable');
    }

    // Dimensions validation
    if (result.dimensions.height < 1000) {
      throw new Error('PDF height seems too small - content may not be fully captured');
    }
    console.log('✅ Content dimensions reasonable');

    // Test 4: Source File Validation
    console.log('\n🔍 Test 4: Source File Validation');
    const cvPath = path.resolve(__dirname, '../cv.html');

    if (!fs.existsSync(cvPath)) {
      throw new Error('Source CV file not found');
    }

    const cvContent = fs.readFileSync(cvPath, 'utf8');
    if (cvContent.length < 1000) {
      throw new Error('CV content seems too short');
    }
    if (!cvContent.includes('Gilad Maoz')) {
      throw new Error('CV content validation failed - missing expected content');
    }

    console.log('✅ Source CV file validated');
    console.log(`📄 Content length: ${Math.round(cvContent.length / 1024)} KB\n`);

    // Test 5: Environment Check
    console.log('🔍 Test 5: Environment Check');
    console.log(`🏗️  Node.js: ${process.version}`);
    console.log(`💻 Platform: ${process.platform}`);
    console.log(`🏠 Working directory: ${process.cwd()}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 CI Mode: ${process.env.CI ? 'enabled' : 'disabled'}\n`);

    // Success summary
    console.log('🎉 All Tests Passed!');
    console.log('='.repeat(50));
    console.log(`✅ PDF Generated: ${outputPath}`);
    console.log(`📏 Final Size: ${fileSizeKB} KB`);
    console.log(`⏱️  Total Time: ${Math.round(totalTime / 1000)}s`);
    console.log(`🖼️  Dimensions: ${result.dimensions.width}x${result.dimensions.height}px`);
    console.log('='.repeat(50));

    return {
      success: true,
      outputPath,
      sizeKB: fileSizeKB,
      duration: totalTime,
      dimensions: result.dimensions
    };

  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error('='.repeat(50));
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('='.repeat(50));

    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testPDF()
    .then((result) => {
      console.log('\n🎯 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testPDF };