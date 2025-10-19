const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    const db = client.db("resultDB");
    const students = db.collection("students");

    app.get("/", (req, res) => {
    res.send("Server is running...");
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
