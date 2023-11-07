const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5001

// middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.clvlvsk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const productsCollection = client.db("restaurantManagementDB").collection("products");
    const ordersCollection = client.db("restaurantManagementDB").collection("orders");

    app.get("/products", async (req, res) => {
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      let quary = {}
      if (req.query?.email) {
        quary = { email: req.query.email }
      }
      const result = await productsCollection.find(quary)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });
    
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.find({ _id: new ObjectId(id) }).toArray()
      res.send(result)
    })

    app.get("/search", async (req, res) => {
      const searchTerm = req.query.searchTerm;
      const result = await productsCollection.find({
        food_name: { $regex: searchTerm, $options: 'i' }
      }).toArray();
      res.send(result);
    });


    app.get('/productsCount', async (req, res) => {
      const count = await productsCollection.estimatedDocumentCount();
      res.send({ count })
    })
    app.post('/products', async (req, res) => {
      const food = req.body;
      const result = await productsCollection.insertOne(food)
      res.send(result)
    })

    app.put('/products/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true }
      const updatedFood = req.body
      const food = {
        $set: {
          food_name: updatedFood.food_name,
          food_image: updatedFood.food_image,
          food_category: updatedFood.food_category,
          price: updatedFood.price,
          quantity: updatedFood.quantity,
          food_origin: updatedFood.food_origin,
          short_description: updatedFood.short_description,
        }
      }
      const result = await productsCollection.updateOne(filter, food, option)
      res.send(result);
    })
    // order



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Hello from Restaurant Management!')
});

app.listen(port, () => {
  console.log(`Restaurant Management listening on port ${port}`);
});