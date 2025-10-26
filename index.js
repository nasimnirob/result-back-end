const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);


const checkAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'Authorization token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = client.db("resultDB");
    const admins = db.collection("admins");

    // Convert id string to ObjectId
    const admin = await admins.findOne({ _id: new ObjectId(decoded.id) });

    if (!admin || admin.role !== 'admin') {
      return res.status(403).send({ message: 'You do not have permission to perform this action' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).send({ message: 'Invalid or expired token' });
  }
};

async function run() {
  try {
    const db = client.db("resultDB");
    const students = db.collection("students");
    const admins = db.collection("admins");

    // Server running check route
    app.get("/", (req, res) => {
      res.send("Server is running...");
    });

    // const password = "3rdf3fddfw";
    // const hashedPassword = await bcrypt.hash(password, 10);
    // console.log(hashedPassword);
    //Admin Login
    app.post("/admin/check", async (req, res) => {
      const { email, password } = req.body;

      const admin = await admins.findOne({ email });

      if (!admin) {
        return res.status(401).send({ status: "error", message: "Admin not found" });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).send({ status: "error", message: "Incorrect password" });
      }

      const token = jwt.sign({ id: admin._id, email: admin.email }, process.env.JWT_SECRET, {
        expiresIn: "5h",
      });

      res.send({
        status: "success",
        message: "Login successful",
        data: { token, email: admin.email, role: admin.role },
      });
    });

    //Add New Admin (Only Admins can access this)
    app.post("/admin/add", checkAdmin, async (req, res) => {
      const { email, password } = req.body;

      // Hash the new admin's password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new admin data into the database
      const newAdmin = {
        email,
        password: hashedPassword,
        role: 'admin', // Set the new admin's role as 'admin'
      };

      const result = await admins.insertOne(newAdmin);

      res.send({ success: true, message: 'Admin added successfully', adminId: result.insertedId });
    });

    // Add Student Result (Admin)
    app.post("/add-student", async (req, res) => {
      const data = req.body;
      const result = await students.insertOne(data);
      res.send({ success: true, id: result.insertedId });
    });

    // all student
    app.get('/students', async (req, res) =>{
      const cursor = students.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    // Find Student Result (Student)
    app.post("/find-student", async (req, res) => {
      const { roll, reg, board, exam, year } = req.body;
      const result = await students.findOne({
        roll,
        reg,
        board,
        exam,
        year,
      });

      if (!result) {
        return res.status(404).send({ success: false, message: "No result found!" });
      }

      res.send({ success: true, result });
    });

    app.listen(5000, () => console.log(" Server running on port http://localhost:5000 "));
  } catch (error) {
    console.error(error);
  }
}

run();
