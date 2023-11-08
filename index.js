const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5001

// middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://restaurant-management-1c99f.web.app', 'https://restaurant-management-1c99f.firebaseapp.com'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());





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
    // await client.connect();
    const logger = async (req, res, next) => {
      console.log('called:', req.host, req.originalUrl)
      next()
    }

    const verifyToken = async (req, res, next) => {
      const token = req.cookies?.token;
      if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
      })
    }

    const productsCollection = client.db("restaurantManagementDB").collection("products");
    const ordersCollection = client.db("restaurantManagementDB").collection("orders");

    app.post('/jwt', logger, async (req, res) => {
      const user = req.body
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.Node_ENV === 'production' ? true : false,
          sameSite: process.env.Node_ENV === 'production' ? 'none' : 'strict'
        })
        .send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body
      res.clearCookie('token', { maxAge: 0}).send({ success: true })
    })

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

    app.put('/products/:id',  async (req, res) => {
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
        },
      }
      const result = await productsCollection.updateOne(filter, food, option)
      res.send(result);
    })
    app.post("/products", async (req, res) => {
      const { food_name, food_image, food_category, price, } = req.body;
      const orderCount = 0;
      const food = { food_name, food_image, food_category, price, orderCount };
      const result = await productsCollection.insertOne(food)
      res.send(result)
    });
    app.put('/products/:id', async (req, res) => {
      const { id } = req.params;
      productsCollection.findOneAndUpdate({ _id: new ObjectId(id) },
        { $inc: { orderCount: 1 } },
        (err, result) => {
          if (err) {
            return res.status(500).send('Error updating order count');
          }
          res.status(200).json(result.value);
        }
      );
    });
    app.patch('/products/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true }
      const updatedFood = req.body
      const food = {
        $set: {
          quantity: updatedFood.quantity
      }
    }
      const result = await productsCollection.updateOne(filter, food, option)
      res.send(result);
    })
    app.get("/orders", async (req, res) => {
      let quary = {}
      if (req.query?.buyerEmail) {
        quary = { buyerEmail: req.query.buyerEmail }
      }
      const result = await ordersCollection.find(quary).toArray();
      res.send(result);
    });
    app.post("/orders",  async (req, res) => {
      const food = req.body;
      const result = await ordersCollection.insertOne(food)
      res.send(result)
    });



    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const result = await ordersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

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
  res.send('Hello  Restaurant Management server!')
});

app.listen(port, () => {
  console.log(`Restaurant Management listening on port ${port}`);
});