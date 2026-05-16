const fs = require('fs-extra')

async function run() {
  const pathMap = await fs.readJson('C:/Users/admin/AppData/Local/Temp/_capcut_import_1/path_map.json').catch(() => null);
  if (!pathMap) {
    console.log("Could not find temp path_map.json");
    // read patched_files.json
    return;
  }
}
run()
