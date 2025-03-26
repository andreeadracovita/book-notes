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

let orderBy = "recent";

async function fetchData() {
	try {
		let result;
		if (orderBy === "title") {
			result = await db.query("SELECT * FROM books ORDER BY title ASC");
		} else if (orderBy === "recent") {
			result = await db.query("SELECT * FROM books ORDER BY date_read DESC");
		} else if (orderBy === "rating") {
			result = await db.query("SELECT * FROM books ORDER BY rating DESC");

		}
		return result.rows;
	} catch (err) {
		console.error(err);
		return [];
	}
}

async function fetchDataById(id) {
	try {
		const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
		if (result && result.rows.length === 1) {
			return result.rows[0];
		} else {
			return undefined;
		}
	} catch (err) {
		console.error(err);
		return undefined;
	}
}

async function addData(data) {
	const { title, author, isbn, date_read, rating, short_description, notes } = data;
	if (!title || !author || !isbn || !date_read) {
		return undefined;
	}
	try {
		const result = await db.query(`
			INSERT INTO books (title, author, isbn, short_description, notes, rating, date_read)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id;
			`,
			[title, author, isbn, short_description || null, notes || null, parseInt(rating) || null, new Date(date_read).toISOString().slice(0, 10)]
		);
		if (result && result.rows.length === 1) {
			return result.rows[0];
		}
	} catch (err) {
		console.error(err);
		return undefined;
	}
}

async function updateDataWithId(id, data) {
	const { title, author, isbn, date_read, rating, short_description, notes } = data;
	if (!id || !title || !author || !isbn || !date_read) {
		return;
	}
	try {
		await db.query(`
			UPDATE books
			SET title=$1, author=$2, isbn=$3, short_description=$4, notes=$5, rating=$6, date_read=$7
			WHERE id = $8;`,
			[title, author, isbn, short_description, notes, rating, new Date(date_read).toISOString().slice(0, 10), id]
		);
	} catch (err) {
		console.error(err);
	}
}

async function removeData(id) {
	try {
		await db.query("DELETE FROM books WHERE id = $1", [id]);
	} catch (err) {
		console.error(err);
	}
}

function formatDate(date) {
	return date.getFullYear().toString() + "-" +
		(date.getMonth() + 1).toString().padStart(2, '0') + "-" +
		date.getDate().toString().padStart(2, '0');
}

// Route to render the landing page
app.get("/", async (req, res) => {
	const books = await fetchData();
	res.render("index.ejs", {
		books
	});
});

// Change ordering for books on the landing page
app.post("/order", (req, res) => {
	orderBy = req.body["order"];
	res.redirect("/");
});

// Route to render the edit page
app.get("/new", (req, res) => {
	res.render("edit.ejs");
});

// Route to render a specific book page by id
app.get("/book/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	const foundBook = await fetchDataById(id);
	if (foundBook) {
		res.render("book.ejs", {
			book: foundBook
		});
	} else {
		res.redirect("/");
	}
});

// Create a new book
app.post("/add", async (req, res) => {
	const newBook = req.body;
	const result = await addData(req.body);
	if (result) {
		res.redirect(`/book/${ result.id }`);
	} else {
		console.log("The book could not be added");
		res.redirect("/new");
	}
});

// Edit/save/remove book with specific id
app.post("/edit/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	if (req.body["action"] === "edit") {
		// Route to render book edit page
		const foundBook = await fetchDataById(id);
		if (foundBook) {
			res.render("edit.ejs", {
				book: foundBook,
				date: formatDate(foundBook.date_read)
			});
		} else {
			res.redirect(`/book/${ id }`);
		}
	} else if (req.body["action"] === "save") {
		// Save edit for book by id
		await updateDataWithId(id, req.body);
		res.redirect(`/book/${ id }`);
	} else if (req.body["action"] === "remove") {
		// Remove book by id
		removeData(id);
		res.redirect("/");
	}
});

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});