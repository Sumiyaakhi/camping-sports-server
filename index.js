const express = require("express");
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
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
    const selectClassCollection = client.db("summerCampDb").collection('selectedclasses');
    const usersCollection = client.db("summerCampDb").collection('users');
    const instructorsCollection = client.db("summerCampDb").collection('instructorInfo');
    const addClassCollection = client.db("summerCampDb").collection('addClass');
    const paymentCollection = client.db("summerCampDb").collection("payment");
    const popularClassCollection = client.db("summerCampDb").collection("popularClasses");

// jwt create
    app.post('/jwt',(req,res)=>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1hr'})
        res.send({token});
    })
// middleware for admin verify
const verifyAdmin =async(req, res, next) =>{
    const email =  req.decoded.email;
    const query = { email: email};
    const user = await usersCollection.findOne(query);
    if(user?.role !== 'Admin'){
        return res.status(403).send({error: true, message: 'forbidden access'})
    }
}
const verifyInstructor =async(req, res, next) =>{
    const email =  req.decoded.email;
    const query = { email: email};
    const user = await usersCollection.findOne(query);
    if(user?.role !== 'Instructor'){
        return res.status(403).send({error: true, message: 'forbidden access'})
    }
}


    app.get('/classes', async(req,res)=>{
        const result = await classesCollection.find().toArray();
        res.send(result);

    })

    // app.post('/selectedclasses',async(req,res)=>{
    //     const classSelect = req.body;
    //     const result = await selectClassCollection.insertOne(classSelect);
    //     res.send(result);
    // })

    app.post('/selectedclasses', async(req,res)=>{
        const {name,image,price, instructor,email} = req.body;
        const document = {
            _id: new ObjectId(),
            name,
            image, 
            price,
            instructor,
            email
        }
        const result = await selectClassCollection.insertOne(document);
        res.send(result);
    })

app.get('/selectedclasses',verifyJWT,async(req, res)=>{
    const email = req.query.email;
    console.log(email);
    if(!email){
        res.send([])
    }
    const decodedEmail = req.decoded.email;
    if(email!== decodedEmail){
        return res.status(403).send({error: true, message: 'forbidden access'})
    }
    const query = { email : email}
    const result = await selectClassCollection.find(query).toArray();
    res.send(result);
})
app.delete('/selectedclasses/:id', async(req, res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await selectClassCollection.deleteOne(query);
    res.send(result);
})

// classes seat decrease 
// app.patch('/classes/:id',  async(req,res)=>{
//     const classInfo = req.body;
//     const id = req.params.id;
// console.log(classInfo);
//     const query = {_id: new ObjectId(id)};
//     const updateClasses = {
//         $set: {
//             availableSeats: classInfo -1
//         }
//     }
//     const result = await classesCollection.updateOne(query, updateClasses);
//     res.send(result);
// })

 
// add all  user from  register
app.post('/users',async(req,res)=>{
    const user = req.body;
    // console.log(user);
    const query = {email: user.email};
    const existingUser = await usersCollection.findOne(query);
    // console.log(existingUser);
    if(existingUser){
        return res.send({message: 'user is already exists'});

    }
    const result = await usersCollection.insertOne(user);
    res.send(result);
})

// check the user is admin
app.get('/users/admin/:email', verifyJWT, async(req,res)=>{
    const email = req.params.email;
    if(req.decoded.email !== email){
      res.send({admin: false})
    }
    const query = { email : email}
    const user = await usersCollection.findOne(query);
    const result = {admin: user?.role === 'Admin'}
    res.send(result);
  })
app.get('/users/instructor/:email', verifyJWT, async(req,res)=>{
    const email = req.params.email;
    if(req.decoded.email !== email){
      res.send({instructor: false})
    }
    const query = { email : email}
    const user = await usersCollection.findOne(query);
    const result = {instructor: user?.role === 'Instructor'}
    res.send(result);
  })

app.get('/users', async(req,res)=>{
    const result = await usersCollection.find().toArray();
    res.send(result);
})
app.get('/popularClass', async(req,res)=>{
    const result = await popularClassCollection.find().toArray();
    res.send(result);
})


app.patch('/users/admin/:id',async(req,res)=>{
    const id = req.params.id;
    // console.log(id);
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
    // console.log(id);
    const query = {_id: new ObjectId(id)}
    const updateRoll = {
        $set: {
            role: "Instructor"
        }
    }
    const result = await usersCollection.updateOne(query,updateRoll)
    res.send(result);
})

// instructor info get
app.get('/instructors', async(req,res)=>{
    const result = await instructorsCollection.find().toArray();
    res.send(result);
})

// add a class
app.post('/instructor/addClass',async(req,res)=>{
    const addClass = req.body;
    const result = await addClassCollection.insertOne(addClass);
    res.send(result);
})

// get add a class data for admin
app.get('/admin/pendingClasses',async(req,res)=>{
    const result = await addClassCollection.find().toArray();
    res.send(result);
})
app.patch('/admin/approved/:id',async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const updateStatus = {
        $set:{
            status: "approved"
        }
    }
    const result = await addClassCollection.updateOne(query,updateStatus);
    res.send(result);
})
app.patch('/admin/denied/:id',async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const updateStatus = {
        $set:{
            status: "deny"
        }
    }
    const result = await addClassCollection.updateOne(query,updateStatus);
    res.send(result);
})

// create payment intent
app.post('/create-payment-intent',verifyJWT,async(req, res)=>{
    const {price} = req.body;
    const amount = price*100;
    console.log(price, amount);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency:'usd',
      payment_method_types: ['card']
    });
    res.send({
      clientSecret: paymentIntent.client_secret
    })
  })

  app.post('/payments',verifyJWT, async(req, res)=>{
    const payment = req.body;
    const insertResult = await paymentCollection.insertOne(payment);

    const query = {_id: {$in: payment.cartItems.map(id => new ObjectId(id))}}
    const deleteResult = await selectClassCollection.deleteOne(query)
    res.send({ insertResult,deleteResult})
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