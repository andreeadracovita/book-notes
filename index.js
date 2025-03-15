import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import "dotenv/config";

const app = express();
const port = 3000;

const db = new pg.Client({
	user: process.env.DB_USER,
	host: "localhost",
	database: process.env.DB,
	password: process.env.DB_PASSWORD,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let books = [];
let orderBy = "title";

async function fetchData() {
	try {
		let result;
		if (orderBy === "title") {
			result = await db.query("SELECT * FROM books");
		} else if (orderBy === "recent") {
			result = await db.query("SELECT * FROM books ORDER BY date_read DESC");
		} else if (orderBy === "rating") {
			result = await db.query("SELECT * FROM books ORDER BY rating DESC");

		}
		books = result.rows;
	} catch (err) {
		console.error(err);
	}
}

app.get("/", async (req, res) => {
	await fetchData();
	res.render("index.ejs", {
		books
	});
});

app.get("/book/:id", (req, res) => {
	const id = parseInt(req.params.id);
	const foundBook = books.find(book => book.id == id);
	res.render("book.ejs", {
		book: foundBook
	});
});

app.post("/order", (req, res) => {
	orderBy = req.body["order"];
	res.redirect("/");
});

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});