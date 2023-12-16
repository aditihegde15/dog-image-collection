const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const http = require('http');
const bodyParser = require("body-parser");
const path = require("path");
const readline = require('readline');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const MONGO_DB_USERNAME = process.env.MONGO_DB_USERNAME;
const MONGO_DB_PASSWORD = process.env.MONGO_DB_PASSWORD;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME;
const MONGO_COLLECTION = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${MONGO_DB_USERNAME}:${MONGO_DB_PASSWORD}@galimane.et7xf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

class DogCollectionServer {
    #app
    #server
    #port

    #dogsList
    #currDogIndex
    #dogListLength

    constructor() {
        this.#app = express();
        this.#app.set('views', __dirname + '/templates');
        this.#app.set('view engine', 'ejs');
        this.#app.use(express.static(__dirname + '/public'));   

        this.#server = http.createServer(this.#app);

        this.#dogsList = null;
        this.#dogListLength = null;
        this.#currDogIndex = 0;
    }

    startServer() {
        this.#port = this.cmdParser();

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.setPrompt("Type 'stop' to shutdown the server: ");
        rl.on('line', (input) => {
            switch (input.trim()) {
                case 'stop':
                    console.log("Shutting down the server");
                    process.exit(0);
                default:
                    console.log(`Invalid command: ${input.trim()}`);
            }
            rl.prompt();
        });

        this.#server.listen(this.#port, () => {
            console.log(`Web server started and running at http://localhost:${this.#port}/`);
            rl.prompt();
        });

        this.endpoints();
    }

    cmdParser() {
        if (process.argv.length != 3) {
            process.stdout.write("Invalid number of arguments used\n");
            process.exit(1);
        }

        return process.argv[2];
    }

    endpoints() {
        this.#app.use(bodyParser.json());

        this.#app.get('/', (request, response) => {
            response.render('index.ejs');
        });

        this.#app.get('/loadCollection', async (req, res) => {
            const { username } = req.query;
            try {
                await client.connect();
                const collection = client.db(MONGO_DB_NAME).collection(MONGO_COLLECTION);
                const user = await collection.findOne({ username });

                if (!user) {
                    return res.status(404).json({ error: 'Dog image collection for this user not found\nFetch and store dog image for this user' });
                }

                this.#dogsList = user.images;
                this.#dogListLength = this.#dogsList.length;
                this.#currDogIndex = 0;

                res.status(200).json({ message: 'Images loaded successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal server error' });
            } finally {
                await client.close();
            }
        });

        this.#app.get('/cycle', (req, res) => {
            if (this.#dogsList === null || this.#dogListLength === null) {
                res.status(500).json({ error: 'Must load images first' });
            }

            this.#currDogIndex = (this.#currDogIndex + 1) % this.#dogListLength;
            res.send(`${this.#dogsList[this.#currDogIndex]}`);
        });

        this.#app.post('/submitDogImage', async (req, res) => {
            const { username, imageUrl } = req.body;

            if (!username || !imageUrl) {
                return res.status(400).json({ error: 'Username and image URL are required' });
            }

            try {
                await client.connect();
                const collection = client.db(MONGO_DB_NAME).collection(MONGO_COLLECTION);

                await collection.updateOne(
                    { username: username },
                    { $push: { images: imageUrl } },
                    { upsert: true }
                );

                res.status(200).json({ message: 'Image submitted successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal server error' });
            } finally {
                await client.close();
            }
        });
    }
}

run().catch(console.dir);
const server = new DogCollectionServer();
server.startServer();