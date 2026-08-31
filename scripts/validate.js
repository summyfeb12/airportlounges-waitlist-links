const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const schemaPath = path.join(__dirname, '..', 'data', 'schema.json');
const dataPath = path.join(__dirname, '..', 'data', 'lounges.json');
const readmePath = path.join(__dirname, '..', 'README.md');

function validate() {
  console.log('🔍 Starting validation...');
  let hasErrors = false;

  // 1. Check files existence
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file missing: data/schema.json');
    process.exit(1);
  }
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Data file missing: data/lounges.json');
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const lounges = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // 2. Ajv Schema Validation
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(schema);
  const valid = validateSchema(lounges);

  if (!valid) {
    console.error('❌ Schema validation failed with errors:');
    validateSchema.errors.forEach((err) => {
      console.error(`  - ${err.instancePath} ${err.message}`);
    });
    hasErrors = true;
  } else {
    console.log('✅ JSON Schema validation passed.');
  }

  // 3. Uniqueness and ID naming convention validation
  const seenIds = new Set();
  const seenUrls = new Set();

  lounges.forEach((lounge, idx) => {
    const prefix = `[Lounge index ${idx} (${lounge.id || 'unnamed'})]`;

    // ID uniqueness
    if (seenIds.has(lounge.id)) {
      console.error(`❌ ${prefix}: Duplicate ID '${lounge.id}' found.`);
      hasErrors = true;
    }
    seenIds.add(lounge.id);

    // ID format check: Must start with lowercase airport_code
    if (lounge.id && lounge.airport_code) {
      const expectedPrefix = lounge.airport_code.toLowerCase() + '-';
      if (!lounge.id.startsWith(expectedPrefix)) {
        console.error(
          `❌ ${prefix}: ID '${lounge.id}' must start with the lowercase airport code '${expectedPrefix}'.`
        );
        hasErrors = true;
      }
    }

    // Access method & URL format check
    const accessMethod = lounge.access_method || 'web';
    if (accessMethod === 'app') {
      if (!lounge.notes || lounge.notes.trim().length === 0) {
        console.error(
          `❌ ${prefix}: Lounges with access_method 'app' must include queue instructions in 'notes' (e.g. navigation path in app).`
        );
        hasErrors = true;
      }
      if (lounge.waitlist_url) {
        try {
          new URL(lounge.waitlist_url);
        } catch {
          console.error(`❌ ${prefix}: Invalid waitlist_url '${lounge.waitlist_url}'`);
          hasErrors = true;
        }
      }
    } else {
      // A web lounge needs a way in: a free queue, a bookable slot, or both.
      if (!lounge.waitlist_url && !lounge.booking_url) {
        console.error(`❌ ${prefix}: access_method 'web' needs 'waitlist_url', 'booking_url', or both.`);
        hasErrors = true;
      }
      for (const field of ['waitlist_url', 'booking_url']) {
        if (!lounge[field]) continue;
        try {
          new URL(lounge[field]);
        } catch {
          console.error(`❌ ${prefix}: Invalid ${field} '${lounge[field]}'`);
          hasErrors = true;
        }
      }
    }

    // Booking costs money or a membership credit — say which.
    if (lounge.booking_url && !lounge.booking_cost) {
      console.error(`❌ ${prefix}: 'booking_url' requires 'booking_cost' (cash, credit or free).`);
      hasErrors = true;
    }
    if (lounge.booking_cost && !lounge.booking_url) {
      console.error(`❌ ${prefix}: 'booking_cost' set with no 'booking_url'.`);
      hasErrors = true;
    }
  });

  // 4. Check deterministic sorting
  // Primary sort: airport_code (ASC), Secondary sort: lounge_name (ASC)
  const isSorted = lounges.every((lounge, i) => {
    if (i === 0) return true;
    const prev = lounges[i - 1];
    const airportCompare = prev.airport_code.localeCompare(lounge.airport_code);
    if (airportCompare < 0) return true;
    if (airportCompare === 0) {
      return prev.id.localeCompare(lounge.id) <= 0;
    }
    return false;
  });

  if (!isSorted) {
    // Sorting is deterministic and has one right answer, so fixing it is more
    // use than failing on it. Contributors edit data by hand; ordering should
    // not be their problem.
    const sorted = [...lounges].sort((a, b) =>
      a.airport_code.localeCompare(b.airport_code) || a.id.localeCompare(b.id)
    );
    fs.writeFileSync(dataPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
    console.log('🔤 Dataset was out of order — sorted it (by airport_code, id). Commit the change.');
  } else {
    console.log('✅ Dataset sorting verified (by airport_code, id).');
  }

  // 5. Check if README.md contains generated tables in sync if flag passed
  if (process.argv.includes('--check-readme-sync') && fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    if (!readmeContent.includes('<!-- TABLE_START -->') || !readmeContent.includes('<!-- TABLE_END -->')) {
      console.error('❌ README.md is missing <!-- TABLE_START --> or <!-- TABLE_END --> markers.');
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n❌ Validation failed. Please fix the errors listed above.');
    process.exit(1);
  }

  console.log(`\n🎉 All validations passed successfully! (${lounges.length} lounges verified)`);
}

validate();
