const { Ollama } = require('ollama');
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb://localhost:50342/?directConnection=true";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        deprecationErrors: true,
    }
});
const port = 8000;
const app = express();

app.use(cors());

const llm = new Ollama({
    baseUrl: "http://localhost:11434"
});

app.get('/', async (req, res) => {
    res.send('Hello World');
});

app.get('/search', async (req, res) => {
    await client.connect();
    const query = req.query.query;
    const results = await llm.embeddings({
        model: 'phi3:mini',
        prompt: query
    });
    const embed_query = results['embedding'];

    if (embed_query.length == 0) {
        res.status(200).send("No results found");
        return;
    }

    const vectorWeight = 0.1;
    const fullTextWeight = 0.9;

    const vectorSearch = {
        '$vectorSearch': {
            'index': 'vector_index',
            'path': 'plot_embedding_phi3_mini',
            'queryVector': embed_query,
            'numCandidates': 100,
            'limit': 10
        }
    }

    const group1 = {
        $group: {
            _id: null,
            docs: {
                $push: "$$ROOT"
            }
        }
    }

    const unwind = {
        $unwind: {
            path: "$docs",
            includeArrayIndex: "rank"
        }
    }

    const addFields = {
        $addFields: {
            vs_score: {
                $multiply: [
                    vectorWeight,
                    {
                        $divide: [
                            1.0,
                            {
                                $add: [
                                    "$rank",
                                    60
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    }

    const project1 = {
        $project: {
            vs_score: 1,
            _id: "$docs._id",
            title: "$docs.title"
        }
    }

    const unionWith = {
        "$unionWith": {
            "coll": "embedded_movies",
            "pipeline": [
                {
                    "$search": {
                        "index": "search_index",
                        "phrase": {
                            "query": query,
                            "path": "title"
                        }
                    }
                }, {
                    "$limit": 20
                }, {
                    "$group": {
                        "_id": null,
                        "docs": { "$push": "$$ROOT" }
                    }
                }, {
                    "$unwind": {
                        "path": "$docs",
                        "includeArrayIndex": "rank"
                    }
                }, {
                    "$addFields": {
                        "fts_score": {
                            "$multiply": [
                                fullTextWeight, {
                                    "$divide": [
                                        1.0, {
                                            "$add": ["$rank", 60]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    "$project": {
                        "fts_score": 1,
                        "_id": "$docs._id",
                        "title": "$docs.title"
                    }
                }
            ]
        }
    }

    const group2 = {
        $group: {
            _id: "$title",
            title: {
                $first: "$title"
            },
            plot: {
                $first: "$plot"
            },
            poster: {
                $first: "$poster"
            },
            year: {
                $first: "$year"
            },
            vs_score: {
                $max: "$vs_score"
            },
            fts_score: {
                $max: "$fts_score"
            }
        }
    }

    const project2 = {
        $project: {
            _id: 1,
            title: 1,
            plot: 1,
            poster: 1,
            year: 1,
            vs_score: {
                $ifNull: ["$vs_score", 0]
            },
            fts_score: {
                $ifNull: ["$fts_score", 0]
            }
        }
    }

    const project3 = {
        $project: {
            score: {
                $add: ["$fts_score", "$vs_score"]
            },
            _id: 1,
            title: 1,
            poster: 1,
            plot: 1,
            year: 1,
            vs_score: 1,
            fts_score: 1
        }
    }

    const sort = {
        $sort: {
            score: -1
        }
    }

    const limit = {
        $limit: 10
    }

    const pipeline = [vectorSearch, group1, unwind, addFields, project1, unionWith, group2, project2, project3, sort, limit];
    const collection = await client.db("sample_mflix").collection("embedded_movies");
    const docs = await collection.aggregate(pipeline).toArray();
    res.status(200).send(docs);

});

app.get('/embeddings', async (req, res) => {
    await llm.embeddings({
        model: 'phi3:mini',
        prompt: 'The sky is blue because of rayleigh scattering'
    }).then((result) => {
        console.log(result['embedding']);
        res.status(200).send("OK");
    });
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});