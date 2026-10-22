import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db, UPLOAD_DIR } from '../server/db.js';
import { REPORT_BUCKET, storeReportFile } from '../server/storage.js';

async function main() {
  await db.init();

  const reports = db.getReports();
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const report of reports) {
    let changed = false;
    const attachments = [...report.attachments];

    for (let i = 0; i < attachments.length; i += 1) {
      const attachment = attachments[i];
      if (attachment.storage_path) {
        skipped += 1;
        continue;
      }
      if (!attachment.file_path) {
        skipped += 1;
        continue;
      }

      let filePath = path.resolve(attachment.file_path);
      if (!fs.existsSync(filePath)) {
        const candidate = path.join(UPLOAD_DIR, attachment.stored_filename || path.basename(filePath));
        if (fs.existsSync(candidate)) filePath = candidate;
      }

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Missing file for ${report.id} / ${attachment.original_name}: ${filePath}`);
        failed += 1;
        continue;
      }

      try {
        const stored = await storeReportFile(report.id, {
          path: filePath,
          originalname: attachment.original_name,
          mimetype: attachment.mime_type,
          size: fs.statSync(filePath).size,
        });

        attachments[i] = {
          ...attachment,
          stored_filename: stored.stored_filename,
          storage_path: stored.storage_path,
          mime_type: stored.mime_type,
          file_size: stored.file_size,
        };
        changed = true;
        migrated += 1;
        console.log(`✅ Uploaded ${attachment.original_name} -> ${stored.storage_path}`);
      } catch (err) {
        failed += 1;
        console.error(`❌ Failed to upload ${attachment.original_name}:`, err);
      }
    }

    if (changed) {
      await db.updateReport(report.id, { attachments });
    }
  }

  console.log('');
  console.log(`Bucket: ${REPORT_BUCKET}`);
  console.log(`Migrated: ${migrated} · Already stored: ${skipped} · Failed: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
