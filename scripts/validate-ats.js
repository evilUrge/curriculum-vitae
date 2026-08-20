const fs = require("fs");
const path = require("path");

// ATS-Friendly Keywords by category
const ATS_KEYWORDS = {
  ai_ml: [
    "AI",
    "ML",
    "LLM",
    "Machine Learning",
    "LangChain",
    "LangGraph",
    "Langfuse",
    "OpenAI",
    "Claude",
    "GPT",
    "RAG",
    "Vectorize",
    "MLOps",
    "Model",
  ],
  cloud: [
    "AWS",
    "Lambda",
    "S3",
    "DynamoDB",
    "CloudWatch",
    "CDK",
    "GCP",
    "Firebase",
    "Cloudflare",
    "Workers",
    "Serverless",
    "Edge",
    "Cloud",
  ],
  devops: [
    "CI/CD",
    "GitHub Actions",
    "Terraform",
    "Infrastructure as Code",
    "Docker",
    "Pipeline",
    "Deployment",
    "Automation",
  ],
  backend: [
    "Python",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "FastAPI",
    "Django",
    "Flask",
    "API",
    "GraphQL",
    "REST",
  ],
  databases: [
    "PostgreSQL",
    "MongoDB",
    "Elasticsearch",
    "DynamoDB",
    "Database",
    "SQL",
  ],
};

// Strong action verbs for CAR method
const STRONG_ACTION_VERBS = [
  "Built",
  "Developed",
  "Architected",
  "Designed",
  "Implemented",
  "Led",
  "Managed",
  "Optimized",
  "Reduced",
  "Increased",
  "Deployed",
  "Established",
  "Integrated",
  "Migrated",
  "Automated",
  "Executed",
  "Delivered",
  "Achieved",
  "Created",
  "Launched",
];

// CAR method indicators
const CAR_INDICATORS = {
  challenge: ["Challenge:", "Problem:", "Issue:", "faced", "needed"],
  action: ["Action:", "Solution:", "Implemented", "Built", "Developed"],
  result: [
    "Result:",
    "Achieved",
    "Reduced",
    "Increased",
    "Improved",
    "%",
    "x",
    "K+",
    "ms",
    "uptime",
  ],
};

class ATSValidator {
  constructor(htmlContent) {
    this.html = htmlContent;
    this.score = 0;
    this.maxScore = 100;
    this.feedback = [];
    this.warnings = [];
  }

  // Extract text content from HTML
  extractText(html) {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Check for standard section headers (10 points)
  checkSectionHeaders() {
    const requiredSections = ["Experience", "Skills", "Education"];
    const optionalSections = ["Certifications", "Languages"];
    let points = 0;
    let found = [];
    let missing = [];

    requiredSections.forEach((section) => {
      if (
        this.html.includes(`<h2>${section}</h2>`) ||
        this.html.includes(`>${section}</h2>`)
      ) {
        points += 3.33;
        found.push(section);
      } else {
        missing.push(section);
      }
    });

    if (found.length === requiredSections.length) {
      this.feedback.push(
        `✅ All required sections present: ${found.join(", ")}`,
      );
    } else {
      this.warnings.push(`⚠️  Missing sections: ${missing.join(", ")}`);
    }

    return Math.round(points);
  }

  // Check contact information placement (5 points)
  checkContactInfo() {
    const contactKeywords = ["email", "tel:", "@", "+36", "+31"];
    const headerSection = this.html.substring(
      0,
      this.html.indexOf("</header>") || 1000,
    );

    let foundCount = contactKeywords.filter((kw) =>
      headerSection.includes(kw),
    ).length;

    if (foundCount >= 2) {
      this.feedback.push("✅ Contact information properly placed in header");
      return 5;
    } else {
      this.warnings.push(
        "⚠️  Contact information may not be in optimal location",
      );
      return 2;
    }
  }

  // Check date formatting consistency (5 points)
  checkDateFormats() {
    const datePattern = /\w+ \d{4}[–—-]\w+ \d{4}|\w+ \d{4}[–—-]Present/g;
    const dates = this.html.match(datePattern) || [];

    if (dates.length >= 5) {
      this.feedback.push(`✅ ${dates.length} dates in consistent format`);
      return 5;
    } else if (dates.length > 0) {
      this.feedback.push(`⚠️  Only ${dates.length} dates found, expected more`);
      return 3;
    } else {
      this.warnings.push("❌ Date formatting may need improvement");
      return 0;
    }
  }

  // Check skills section quality (10 points)
  checkSkillsSection() {
    const skillPattern = /<span class="skill-tag[^"]*">([^<]+)<\/span>/g;
    const skills = [];
    let match;

    while ((match = skillPattern.exec(this.html)) !== null) {
      skills.push(match[1]);
    }

    if (skills.length >= 30) {
      this.feedback.push(
        `✅ ${skills.length} skills listed in ATS-friendly format`,
      );
      return 10;
    } else if (skills.length >= 20) {
      this.feedback.push(`⚠️  ${skills.length} skills found (aim for 30+)`);
      return 7;
    } else {
      this.warnings.push(`❌ Only ${skills.length} skills found, add more`);
      return 4;
    }
  }

  // Check for job titles (5 points)
  checkJobTitles() {
    const titlePattern = /<div class="position">([^<]+)<\/div>/g;
    const titles = [];
    let match;

    while ((match = titlePattern.exec(this.html)) !== null) {
      titles.push(match[1]);
    }

    if (titles.length >= 6) {
      this.feedback.push(`✅ ${titles.length} clear job titles found`);
      return 5;
    } else if (titles.length >= 4) {
      this.feedback.push(
        `⚠️  ${titles.length} job titles (add more for career progression)`,
      );
      return 3;
    } else {
      this.warnings.push(`❌ Only ${titles.length} job titles found`);
      return 1;
    }
  }

  // Check for quantified achievements (15 points)
  checkQuantifiedAchievements() {
    const text = this.extractText(this.html);

    // Look for numbers, percentages, metrics
    const percentages = (text.match(/\d+(\.\d+)?%/g) || []).length;
    const numbers = (text.match(/\d+[KM]?\+/g) || []).length;
    const metrics = (text.match(/\d+x|sub-\d+ms|<\d+ms|\d+ms/g) || []).length;
    // Noun-counted facts: real, verifiable counts of people, users, products.
    // Rewards honest specifics over fabricated "X% improvement" claims.
    const nounCounts = (
      text.match(
        /\d+\s+(engineers?|students?|developers?|products?|repos?|years?|requests?|customers?|countries?|sprints?)\b/gi,
      ) || []
    ).length;

    const total = percentages + numbers + metrics + nounCounts;

    if (total >= 10) {
      this.feedback.push(`✅ ${total} quantified achievements (excellent)`);
      return 15;
    } else if (total >= 5) {
      this.feedback.push(
        `⚠️  ${total} quantified achievements (add more metrics)`,
      );
      return 10;
    } else {
      this.warnings.push(
        `❌ Only ${total} quantified achievements found (aim for 10+)`,
      );
      return 5;
    }
  }

  // Check for action verbs (10 points)
  checkActionVerbs() {
    const text = this.extractText(this.html);
    const foundVerbs = STRONG_ACTION_VERBS.filter((verb) =>
      new RegExp(`\\b${verb}\\b`, "i").test(text),
    );

    const verbCount = foundVerbs.length;

    if (verbCount >= 12) {
      this.feedback.push(`✅ ${verbCount} strong action verbs used`);
      return 10;
    } else if (verbCount >= 8) {
      this.feedback.push(`⚠️  ${verbCount} action verbs (aim for 12+)`);
      return 7;
    } else {
      this.warnings.push(`❌ Only ${verbCount} strong action verbs found`);
      return 4;
    }
  }

  // Check layout structure (5 points)
  checkLayoutStructure() {
    const hasTable = /<table/.test(this.html);
    const usesFlexbox = /display:\s*flex/.test(this.html);

    if (!hasTable && usesFlexbox) {
      this.feedback.push("✅ ATS-friendly layout (no tables, uses flexbox)");
      return 5;
    } else if (!hasTable) {
      this.feedback.push("⚠️  Layout acceptable but could be optimized");
      return 3;
    } else {
      this.warnings.push("❌ Using tables for layout (ATS may struggle)");
      return 0;
    }
  }

  // Check education section (5 points)
  checkEducation() {
    const hasEducation = /Education<\/h2>/.test(this.html);
    const educationCount = (
      this.html.match(/<strong>[^<]+<\/strong>/g) || []
    ).filter(
      (item) => item.includes("Python") || item.includes("Computer Science"),
    ).length;

    if (hasEducation && educationCount >= 2) {
      this.feedback.push("✅ Education section complete");
      return 5;
    } else if (hasEducation) {
      this.feedback.push("⚠️  Education section present but sparse");
      return 3;
    } else {
      this.warnings.push("❌ Education section missing");
      return 0;
    }
  }

  // Check keyword density (10 points)
  checkKeywords() {
    const text = this.extractText(this.html);
    let totalKeywords = 0;
    const categoryScores = {};

    Object.entries(ATS_KEYWORDS).forEach(([category, keywords]) => {
      const found = keywords.filter((kw) =>
        new RegExp(`\\b${kw}\\b`, "i").test(text),
      ).length;
      categoryScores[category] = found;
      totalKeywords += found;
    });

    const categories = Object.keys(ATS_KEYWORDS).length;
    const avgPerCategory = totalKeywords / categories;

    if (avgPerCategory >= 8) {
      this.feedback.push(
        `✅ Strong keyword coverage: ${totalKeywords} total across ${categories} categories`,
      );
      return 10;
    } else if (avgPerCategory >= 5) {
      this.feedback.push(
        `⚠️  Moderate keyword coverage: ${totalKeywords} keywords`,
      );
      return 7;
    } else {
      this.warnings.push(
        `❌ Weak keyword coverage: ${totalKeywords} keywords (add more industry terms)`,
      );
      return 4;
    }
  }

  // CAR Method validation (20 points bonus)
  validateCARMethod() {
    const text = this.extractText(this.html);
    const bullets =
      this.html.match(/<li><strong>([^<]+)<\/strong>([^<]+)<\/li>/g) || [];

    let carScore = 0;
    let carCount = 0;

    // Check for CAR indicators
    bullets.forEach((bullet) => {
      const bulletText = this.extractText(bullet);
      let bulletScore = 0;

      // Has bold label (Challenge/Action/Result pattern)
      if (/<strong>/.test(bullet)) {
        bulletScore += 1;
      }

      // Has quantified result
      if (/\d+(\.\d+)?%|\d+(\.\d+)?x|\d+K\+|\d+\s+(engineers?|students?|developers?|products?|repos?|years?|requests?|customers?|countries?|sprints?)\b/i.test(bulletText)) {
        bulletScore += 1;
      }

      // Starts with strong action verb
      const startsWithVerb = STRONG_ACTION_VERBS.some((verb) =>
        new RegExp(`^${verb}\\b`, "i").test(bulletText),
      );
      if (startsWithVerb) {
        bulletScore += 1;
      }

      if (bulletScore >= 2) {
        carCount++;
      }
    });

    // Score based on CAR adoption
    if (carCount >= 8) {
      this.feedback.push(
        `✅ Excellent CAR method usage: ${carCount} bullets follow pattern`,
      );
      carScore = 20;
    } else if (carCount >= 5) {
      this.feedback.push(
        `⚠️  Good CAR usage: ${carCount} bullets (aim for 8+)`,
      );
      carScore = 15;
    } else if (carCount >= 3) {
      this.feedback.push(
        `⚠️  Some CAR usage: ${carCount} bullets (add more structure)`,
      );
      carScore = 10;
    } else {
      this.warnings.push(
        `❌ Weak CAR method: Only ${carCount} structured bullets`,
      );
      carScore = 5;
    }

    return carScore;
  }

  // Run all validations
  validate() {
    console.log("🔍 Starting ATS & CAR Validation...\n");

    // Core ATS checks (80 points)
    this.score += this.checkSectionHeaders();
    this.score += this.checkContactInfo();
    this.score += this.checkDateFormats();
    this.score += this.checkSkillsSection();
    this.score += this.checkJobTitles();
    this.score += this.checkQuantifiedAchievements();
    this.score += this.checkActionVerbs();
    this.score += this.checkLayoutStructure();
    this.score += this.checkEducation();
    this.score += this.checkKeywords();

    // CAR Method check (20 points bonus)
    this.score += this.validateCARMethod();

    return this.generateReport();
  }

  // Generate final report
  generateReport() {
    const percentage = Math.round((this.score / this.maxScore) * 100);
    const passed = percentage >= 80;

    console.log("═══════════════════════════════════════════════════════");
    console.log("               ATS VALIDATION REPORT");
    console.log("═══════════════════════════════════════════════════════\n");

    console.log(
      `📊 FINAL SCORE: ${this.score}/${this.maxScore} (${percentage}%)`,
    );
    console.log(
      `🎯 STATUS: ${passed ? "✅ PASS" : "❌ FAIL"} (Threshold: 80%)\n`,
    );

    if (this.feedback.length > 0) {
      console.log("✅ STRENGTHS:");
      this.feedback.forEach((item) => console.log(`   ${item}`));
      console.log("");
    }

    if (this.warnings.length > 0) {
      console.log("⚠️  IMPROVEMENTS NEEDED:");
      this.warnings.forEach((item) => console.log(`   ${item}`));
      console.log("");
    }

    // Recommendations
    if (percentage < 80) {
      console.log("💡 RECOMMENDATIONS:");
      if (this.score < 60) {
        console.log(
          "   • Add more quantified achievements (%, numbers, metrics)",
        );
        console.log("   • Use stronger action verbs at start of bullets");
        console.log("   • Include more industry keywords");
      }
      if (this.warnings.some((w) => w.includes("CAR"))) {
        console.log(
          "   • Structure experience bullets: Challenge → Action → Result",
        );
        console.log(
          '   • Add bold labels like "Cost Optimization:", "Architecture:"',
        );
      }
      if (this.warnings.some((w) => w.includes("skills"))) {
        console.log("   • Add more technical skills to skills section");
      }
      console.log("");
    }

    console.log("═══════════════════════════════════════════════════════\n");

    return {
      score: this.score,
      percentage,
      passed,
      feedback: this.feedback,
      warnings: this.warnings,
    };
  }
}

// Main execution
function main() {
  const cvPath = path.join(process.cwd(), "cv.html");

  if (!fs.existsSync(cvPath)) {
    console.error("❌ Error: cv.html not found in current directory");
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(cvPath, "utf-8");
  const validator = new ATSValidator(htmlContent);
  const result = validator.validate();

  // Exit with error code if validation fails
  if (!result.passed) {
    console.error(`❌ ATS validation failed: ${result.percentage}% (need 80%)`);
    process.exit(1);
  }

  console.log("✅ ATS validation passed! CV is ready for submission.");
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = ATSValidator;
