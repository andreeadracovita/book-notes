import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import "dotenv/config";
import * as fs from "fs";

const app = express();
const port = 3000;

// Use database entries if able to connect.
let db;
if (process.env.DB_USER && process.env.DB && process.env.DB_PASSWORD) {
	db = new pg.Client({
		user: process.env.DB_USER,
		host: "localhost",
		database: process.env.DB,
		password: process.env.DB_PASSWORD
	});

	db.connect();
	db.on('error', (err) => {
	    console.error('something bad has happened!', err.stack);
	});
}

/**
 * Use default json entries if no connection to db (non-persistent test data environment).
 * Fetch base book list at the start of the app and build upon it.
 */
let booksJson = [];
let lastId = 6;
try {
	const jsonString = fs.readFileSync("./books.json");
	booksJson = JSON.parse(jsonString);
} catch (err) {
	console.log(err);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let orderBy = "newest";

let highlightId = 5;

async function fetchData() {
	if (!db) {
		return booksJson;
	}

	try {
		let result;
		if (orderBy === "title") {
			result = await db.query("SELECT * FROM books ORDER BY title ASC");
		} else if (orderBy === "newest") {
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
	if (!db) {
		const book = booksJson.find((b) => b["id"] == id);
		return book;
	}

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

/**
 * Add data to non-persisted data array.
 */
function addDataToArray(data) {
	// Serial id
	data["id"] = ++lastId;

	// Add optional fields
	data["rating"] = data["rating"] || null;
	data["notes"] = data["notes"] || null;
	data["short_description"] = data["short_description"] || null;

	booksJson.push(data);
	return data;
}

async function addData(data) {
	const { title, author, isbn, date_read, rating, short_description, notes } = data;
	if (!title || !author || !isbn || !date_read) {
		return undefined;
	}

	// Pre-process strings
	const new_short_description = short_description.replace(/(?:\r\n)/g, '\n');
	const new_notes = notes.replace(/(?:\r\n)/g, '\n');

	if (!db) {
		return addDataToArray(data);
	}

	try {
		const result = await db.query(`
			INSERT INTO books (title, author, isbn, short_description, notes, rating, date_read)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id;
			`,
			[title, author, isbn, new_short_description || null, new_notes || null, parseInt(rating) || null, new Date(date_read).toISOString().slice(0, 10)]
		);
		if (result && result.rows.length === 1) {
			return result.rows[0];
		}
	} catch (err) {
		console.error(err);
		return undefined;
	}
}

/**
 * Update data in non-persisted data array.
 */
function updateDataFromArray(id, data) {
	const index = booksJson.findIndex((b) => b["id"] == id);
	if (index != -1) {
		booksJson[index]["title"] = data["title"];
		booksJson[index]["author"] = data["author"];
		booksJson[index]["isbn"] = data["isbn"];
		booksJson[index]["short_description"] = data["short_description"];
		booksJson[index]["notes"] = data["notes"];
		booksJson[index]["rating"] = data["rating"];
		booksJson[index]["date_read"] = data["date_read"];
	}
}

async function updateDataWithId(id, data) {
	const { title, author, isbn, date_read, rating, short_description, notes } = data;
	if (!id || !title || !author || !isbn || !date_read) {
		return;
	}

	if (!db) {
		updateDataFromArray(id, data);
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

/**
 * Delete data from non-persisted data array.
 */
function deleteDataFromArray(id) {
	const indexToRemove = booksJson.findIndex((b) => b["id"] == id);
	booksJson.splice(indexToRemove, 1);
}

async function removeData(id) {
	if (!db) {
		deleteDataFromArray(id);
		return;
	}

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

async function fetchImage(url) {
    const response = await fetch(url);
    if (!response.ok || response.headers.get('content-type') === null) {
    	return undefined;
    }
    return url;
}

// Route to render the landing page
app.get("/", async (req, res) => {
	const books = await fetchData();
	const highlightBook = await fetchDataById(highlightId);
	res.render("index.ejs", {
		highlight: highlightBook,
		books,
		orderBy
	});
});

// Change ordering for books on the landing page
app.get("/order/:order", (req, res) => {
	orderBy = req.params["order"];
	res.redirect("/");
});

// Route to render the edit page
app.get("/new", (req, res) => {
	res.render("edit.ejs", {
		date: formatDate(new Date())
	});
});

// Route to render a specific book page by id
app.get("/book/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	const book = await fetchDataById(id);
	if (book) {
		const coverUrl = await fetchImage(`https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`);
		res.render("book.ejs", {
			book,
			coverUrl
		});
	} else {
		res.redirect("/");
	}
});

// Create a new book
app.post("/add", async (req, res) => {
	const result = await addData(req.body);
	if (result) {
		res.redirect(`/book/${ result.id }`);
	} else {
		res.redirect("/new");
	}
});

// Edit/save/remove book with specific id
app.post("/edit/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	if (req.body["action"] === "edit") {
		// Route to render book edit page
		const book = await fetchDataById(id);
		if (book) {
			const coverUrl = await fetchImage(`https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`);
			res.render("edit.ejs", {
				book,
				date: formatDate(new Date(book.date_read)),
				coverUrl
			});
		} else {
			res.redirect(`/book/${ id }`);
		}
	} else if (req.body["action"] === "highlight") {
		highlightId = id;
		res.redirect("/");
	} else if (req.body["action"] === "save") {
		// Save edit for book by id
		await updateDataWithId(id, req.body);
		res.redirect(`/book/${ id }`);
	} else if (req.body["action"] === "remove") {
		// Remove book by id
		await removeData(id);
		res.redirect("/");
	}
});

// Refresh on edit page
app.get("/edit/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	const book = await fetchDataById(id);
	if (book) {
		const coverUrl = await fetchImage(`https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`);
		res.render("edit.ejs", {
			book,
			date: formatDate(new Date(book.date_read)),
			coverUrl
		});
	} else {
		res.redirect(`/book/${ id }`);
	}
});

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});