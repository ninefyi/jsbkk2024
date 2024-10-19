const { OllamaEmbeddings } = require("@langchain/community/embeddings/ollama");
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb://localhost:50342/?directConnection=true";

const embeddings = new OllamaEmbeddings({
  model: "phi3:mini", // Default value
  baseUrl: "http://localhost:11434", // Default value
});


async function run() {

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();

  console.log('Connected to MongoDB');

  const collection = await client.db("sample_mflix").collection("embedded_movies");

  const query = { 'plot': { '$exists': true }, 'plot_embedding_phi3_mini': { '$exists': false } };

  const movies = await collection.find(query).toArray();

  console.log(`Found ${movies.length} movies without plot embeddings`);

  for (const movie of movies) {
    const embed_plot = await embeddings.embedQuery(movie.plot);
    await collection.updateOne({ '_id': movie._id }, { '$set': { 'plot_embedding_phi3_mini': embed_plot } });
    console.log(`Updated plot embedding for movie ${movie.title}`);

  }

  await client.close();

  console.log('Done');
}

run().catch(console.dir);

// curl http://localhost:11434/api/embeddings -d '{ "model": "phi3:mini", "prompt": "Lady" }'