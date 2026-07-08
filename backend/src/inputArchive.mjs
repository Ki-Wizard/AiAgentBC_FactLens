const DEFAULT_INPUT_ARCHIVE_PREFIX = 'factlens-raw-input';

export async function archiveRequestText(analysisId, documentText) {
  const bucketName = process.env.INPUT_ARCHIVE_BUCKET_NAME;
  const prefix = process.env.INPUT_ARCHIVE_PREFIX ?? DEFAULT_INPUT_ARCHIVE_PREFIX;

  if (!bucketName) {
    return null;
  }

  if (!analysisId || !documentText || documentText.trim() === '') {
    return null;
  }

  const key = `${trimSlashes(prefix)}/${analysisId}.txt`;
  const { client, PutObjectCommand } = await getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: 'text/plain; charset=utf-8',
    Body: documentText,
  }));

  return { bucketName, key };
}

function trimSlashes(value) {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

async function getS3Client() {
  let sdk;
  try {
    sdk = await import('@aws-sdk/client-s3');
  } catch (error) {
    throw new Error(`S3 archive requires @aws-sdk/client-s3: ${error.message}`);
  }

  return {
    client: new sdk.S3Client({}),
    PutObjectCommand: sdk.PutObjectCommand,
  };
}
