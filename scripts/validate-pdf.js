const fs = require('fs');
const path = require('path');

/**
 * Validate generated PDF for CI/CD environments
 * Lightweight validation focused on essential checks
 */
function validatePDF() {
  console.log('🔍 Validating PDF...');

  const outputPath = path.join(__dirname, '../output/Gilad-Maoz-CV.pdf');

  try {
    // Check if PDF exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('PDF file not found at expected location');
    }
    console.log('✅ PDF file exists');

    // Check file size
    const stats = fs.statSync(outputPath);
    const sizeKB = Math.round(stats.size / 1024);

    if (stats.size < 10000) {
      throw new Error(`PDF too small (${sizeKB} KB) - generation may have failed`);
    }

    if (stats.size > 2000000) {
      throw new Error(`PDF too large (${sizeKB} KB) - possible quality issues`);
    }

    console.log(`✅ PDF size acceptable: ${sizeKB} KB`);

    // Check file permissions
    try {
      fs.accessSync(outputPath, fs.constants.R_OK);
      console.log('✅ PDF is readable');
    } catch (error) {
      throw new Error('PDF file is not readable');
    }

    // Basic file header validation (PDF magic number)
    const buffer = fs.readFileSync(outputPath);
    const header = buffer.toString('ascii', 0, 8);

    if (!header.startsWith('%PDF-')) {
      throw new Error('File does not appear to be a valid PDF');
    }
    console.log(`✅ Valid PDF format detected: ${header.trim()}`);

    console.log('\n🎉 PDF Validation Successful!');
    console.log(`📁 File: ${outputPath}`);
    console.log(`📏 Size: ${sizeKB} KB`);
    console.log(`📅 Created: ${stats.mtime.toISOString()}`);

    return {
      success: true,
      path: outputPath,
      sizeKB,
      createdAt: stats.mtime.toISOString()
    };

  } catch (error) {
    console.error('❌ PDF Validation Failed:');
    console.error(`   ${error.message}`);
    throw error;
  }
}

// Run validation if called directly
if (require.main === module) {
  try {
    const result = validatePDF();
    console.log('✅ Validation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    process.exit(1);
  }
}

module.exports = { validatePDF };