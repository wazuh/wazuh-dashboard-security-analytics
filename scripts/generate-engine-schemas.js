const https = require('https');
const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// Add entries here for each engine resource schema to fetch
const SCHEMA_SOURCES = [
  {
    name: 'wazuh-decoders',
    path: 'src/engine/ruleset/schemas/wazuh-decoders.json',
  },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'common', 'schemas');

const config = {
  branch: packageJson.wazuh?.version || 'main',
};

function wazuhUrl(filePath) {
  return `https://raw.githubusercontent.com/wazuh/wazuh/${config.branch}/${filePath}`;
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetch(res.headers.location).then(resolve).catch(reject);
          return;
        }
        resolve({ statusCode: res.statusCode, body: res });
      })
      .on('error', (error) => {
        reject(new Error(`Failed to fetch ${url}: ${error.message}`));
      });
  });
}

async function fetchJson(url) {
  const { statusCode, body: res } = await fetch(url);

  if (statusCode === 404 && url.includes(`/${config.branch}/`)) {
    const fallbackUrl = url.replace(`/${config.branch}/`, '/main/');
    console.log(`  Branch ${config.branch} not found, falling back to main...`);
    return fetchJson(fallbackUrl);
  }

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode} fetching ${url}`);
  }

  return new Promise((resolve, reject) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
      }
    });
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const source of SCHEMA_SOURCES) {
    const url = wazuhUrl(source.path);
    console.log(`Fetching ${source.name} schema from ${url}...`);

    try {
      const schema = await fetchJson(url);
      const outputPath = path.join(OUTPUT_DIR, `${source.name}.schema.json`);
      fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
      console.log(`  -> Written to ${outputPath}`);
    } catch (error) {
      console.error(`  Error: ${error.message}`);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
