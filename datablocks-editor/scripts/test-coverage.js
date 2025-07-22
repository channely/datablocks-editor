#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const COVERAGE_THRESHOLD = {
  statements: 70,
  branches: 70,
  functions: 70,
  lines: 70,
};

const COVERAGE_DIR = './coverage';
const COVERAGE_JSON = path.join(COVERAGE_DIR, 'coverage-summary.json');

async function runCoverageReport() {
  console.log('🧪 Running test coverage analysis...\n');

  try {
    // Run tests with coverage
    execSync('npm run test:coverage', { stdio: 'inherit' });

    // Check if coverage report exists
    if (!fs.existsSync(COVERAGE_JSON)) {
      console.error('❌ Coverage report not found');
      process.exit(1);
    }

    // Read coverage summary
    const coverageData = JSON.parse(fs.readFileSync(COVERAGE_JSON, 'utf8'));
    const summary = coverageData.total;

    console.log('\n📊 Coverage Summary:');
    console.log('==================');
    
    const metrics = ['statements', 'branches', 'functions', 'lines'];
    let allPassed = true;

    metrics.forEach(metric => {
      const coverage = summary[metric];
      const threshold = COVERAGE_THRESHOLD[metric];
      const passed = coverage.pct >= threshold;
      const status = passed ? '✅' : '❌';
      
      console.log(`${status} ${metric.padEnd(12)}: ${coverage.pct.toFixed(1)}% (${coverage.covered}/${coverage.total}) - Threshold: ${threshold}%`);
      
      if (!passed) {
        allPassed = false;
      }
    });

    console.log('\n📁 Coverage Reports Generated:');
    console.log(`   • HTML Report: ${path.join(COVERAGE_DIR, 'index.html')}`);
    console.log(`   • JSON Report: ${COVERAGE_JSON}`);

    // Generate coverage badge
    generateCoverageBadge(summary.statements.pct);

    if (allPassed) {
      console.log('\n🎉 All coverage thresholds met!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some coverage thresholds not met. Please add more tests.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error running coverage:', error.message);
    process.exit(1);
  }
}

function generateCoverageBadge(coverage) {
  const color = coverage >= 80 ? 'brightgreen' : coverage >= 60 ? 'yellow' : 'red';
  const badgeUrl = `https://img.shields.io/badge/coverage-${coverage.toFixed(1)}%25-${color}`;
  
  const badgeMarkdown = `![Coverage](${badgeUrl})`;
  
  // Update README with coverage badge (if exists)
  const readmePath = './README.md';
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, 'utf8');
    
    // Replace existing coverage badge or add new one
    const badgeRegex = /!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-[\d.]+%25-\w+\)/;
    
    if (badgeRegex.test(readme)) {
      readme = readme.replace(badgeRegex, badgeMarkdown);
    } else {
      // Add badge after title
      readme = readme.replace(/^# (.+)$/m, `# $1\n\n${badgeMarkdown}`);
    }
    
    fs.writeFileSync(readmePath, readme);
    console.log(`   • Coverage badge updated in README.md`);
  }
}

// Generate detailed coverage report by file
function generateDetailedReport(coverageData) {
  console.log('\n📋 Detailed Coverage by File:');
  console.log('=============================');

  const files = Object.entries(coverageData)
    .filter(([path]) => path !== 'total')
    .sort(([, a], [, b]) => a.statements.pct - b.statements.pct);

  files.forEach(([filePath, coverage]) => {
    const relativePath = filePath.replace(process.cwd(), '.');
    const stmtPct = coverage.statements.pct;
    const status = stmtPct >= COVERAGE_THRESHOLD.statements ? '✅' : '❌';
    
    console.log(`${status} ${relativePath.padEnd(50)} ${stmtPct.toFixed(1)}%`);
  });

  // Show files with lowest coverage
  const lowCoverageFiles = files
    .filter(([, coverage]) => coverage.statements.pct < COVERAGE_THRESHOLD.statements)
    .slice(0, 5);

  if (lowCoverageFiles.length > 0) {
    console.log('\n⚠️  Files needing more test coverage:');
    lowCoverageFiles.forEach(([filePath, coverage]) => {
      const relativePath = filePath.replace(process.cwd(), '.');
      console.log(`   • ${relativePath} (${coverage.statements.pct.toFixed(1)}%)`);
    });
  }
}

// Run the coverage report
runCoverageReport();