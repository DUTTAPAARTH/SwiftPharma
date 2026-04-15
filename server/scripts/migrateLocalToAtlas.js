import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const localUri = process.env.LOCAL_MONGO_URI;
const atlasUri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || "swiftpharma";

if (!localUri) {
  console.error("LOCAL_MONGO_URI is required");
  process.exit(1);
}

if (!atlasUri) {
  console.error("MONGO_URI is required");
  process.exit(1);
}

const localClient = new MongoClient(localUri);
const atlasClient = new MongoClient(atlasUri);

const cleanIndexOptions = (idx) => {
  const options = { ...idx };
  delete options.v;
  delete options.ns;
  delete options.key;
  delete options.name;
  return options;
};

const migrate = async () => {
  try {
    await localClient.connect();
    await atlasClient.connect();

    const sourceDb = localClient.db(dbName);
    const targetDb = atlasClient.db(dbName);

    const collections = await sourceDb
      .listCollections({}, { nameOnly: true })
      .toArray();
    const names = collections
      .map((c) => c.name)
      .filter((name) => !name.startsWith("system."));

    if (!names.length) {
      console.log(`No collections found in source db ${dbName}`);
      process.exit(0);
    }

    console.log(
      `Migrating ${names.length} collections from local -> Atlas (${dbName})`,
    );

    for (const name of names) {
      const sourceCol = sourceDb.collection(name);
      const targetCol = targetDb.collection(name);

      const docs = await sourceCol.find({}).toArray();

      await targetCol.deleteMany({});
      if (docs.length) {
        await targetCol.insertMany(docs, { ordered: false });
      }

      const indexes = await sourceCol.indexes();
      try {
        await targetCol.dropIndexes();
      } catch {
        // ignore if no indexes to drop
      }

      for (const idx of indexes) {
        if (idx.name === "_id_") continue;
        await targetCol.createIndex(idx.key, cleanIndexOptions(idx));
      }

      const srcCount = await sourceCol.countDocuments();
      const dstCount = await targetCol.countDocuments();
      console.log(`${name}: ${srcCount} -> ${dstCount}`);
    }

    console.log("Migration complete.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await localClient.close();
    await atlasClient.close();
  }
};

migrate();
