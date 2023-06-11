const express = require("express");
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000; 


// middleware
app.use(cors());
app.use(express.json());


// middleware for jwt
const verifyJWT =(req,res,next) =>{
    const authorization  = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'})
    }

    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){
            return res.status(401).send({error: true, message: 'unauthorized access'})
        }

        req.decoded= decoded;
        next();
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rwhgbgz.mongodb.net/?retryWrites=true&w=majority`;

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

    const sportsCollection = client.db("summerCampDb").collection('sports');
    const classesCollection = client.db("summerCampDb").collection('classes');
    const selectClassCollection = client.db("summerCampDb").collection('selectedClasses');
    const usersCollection = client.db("summerCampDb").collection('users');
   

// jwt create
    app.post('/jwt',(req,res)=>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1hr'})
        res.send({token});
    })
    app.get('/classes', async(req,res)=>{
        const result = await classesCollection.find().toArray();
        res.send(result);

    })

    app.post('/selectedclasses',async(req,res)=>{
        const classSelect = req.body;
        const result = await selectClassCollection.insertOne(classSelect);
        res.send(result);
    })

app.get('/selectedclasses',async(req, res)=>{
    const result = await selectClassCollection.find().toArray();
    res.send(result);
})
app.delete('/selectedclasses/:id', async(req, res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await selectClassCollection.deleteOne(query);
    res.send(result);
})

// add all  user from  register
app.post('/users',async(req,res)=>{
    const user = req.body;
    console.log(user);
    const query = {email: user.email};
    const existingUser = await usersCollection.findOne(query);
    console.log(existingUser);
    if(existingUser){
        return res.send({message: 'user is already exists'});

    }
    const result = await usersCollection.insertOne(user);
    res.send(result);
})

app.get('/users', async(req,res)=>{
    const result = await usersCollection.find().toArray();
    res.send(result);
})

app.patch('/users/admin/:id',async(req,res)=>{
    const id = req.params.id;
    console.log(id);
    const query = {_id: new ObjectId(id)}
    const updateRoll = {
        $set: {
            role: "Admin"
        }
    }
    const result = await usersCollection.updateOne(query,updateRoll)
    res.send(result);
})
app.patch('/users/instructor/:id',async(req,res)=>{
    const id = req.params.id;
    console.log(id);
    const query = {_id: new ObjectId(id)}
    const updateRoll = {
        $set: {
            role: "Instructor"
        }
    }
    const result = await usersCollection.updateOne(query,updateRoll)
    res.send(result);
})

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req, res)=>{
    res.send("Camping starts soon!!!")
})

app.listen(port, ()=>{
    console.log(`Sports camping will started soon on port ${port}`);
})